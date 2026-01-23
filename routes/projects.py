from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from helpers import is_valid_uuid
from extensions import limiter, LIMITS
from services import project_store, job_processor, queue
from datetime import datetime

from extensions import Session
from models import utcnow, log_audit_for_request
from services import quotas


projects_bp = Blueprint('projects', __name__)



@projects_bp.route("/api/project/start", methods=["POST"])
@limiter.limit(LIMITS["project_start"])
@login_required
def project_start():
    data = request.get_json() or {}
    project_name = data.get("project_name", "")
    participant_name = data.get("participant_name", "")

    try:
        if not current_user.is_admin:
            ok, error = quotas.reserve_script_quota(
                current_user.id,
                reason="project_start"
            )
            if not ok:
                return jsonify({"ok": False, "error": error}), 403

        project_id = project_store.create_project(
            current_user.id,
            project_name,
            participant_name,
            quota_reserved=not current_user.is_admin
        )
        state = project_store.load_state(project_id) or {}
        db = Session()
        try:
            log_audit_for_request(
                db,
                action="recording_started",
                actor_user_id=current_user.id,
                target_user_id=current_user.id,
                details={
                    "project_id": project_id,
                    "project_name": project_name,
                    "participant_name": participant_name,
                    "recording_started_at": state.get("recording_started_at")
                },
                request=request
            )
            db.commit()
        finally:
            Session.remove()
        return jsonify({
            "ok": True,
            "project_id": project_id,
            "recording_started_at": state.get("recording_started_at"),
            "server_now": utcnow().isoformat(),
            "max_session_minutes": current_user.max_session_minutes
        })
    except Exception as e:
        quotas.release_script_quota(current_user.id)
        return jsonify({"ok": False, "error": str(e)}), 500


@projects_bp.route("/api/project/stop", methods=["POST"])
@limiter.limit(LIMITS["project_stop"])
@login_required
def project_stop():
    data = request.get_json() or {}
    project_id = data.get("project_id")
    participant_name = data.get("participant_name", "ACTOR")
    project_name = data.get("project_name", "")
    stylize_photos = data.get("stylize_photos", True)

    if not project_id:
        return jsonify({"ok": False, "error": "project_id requerido"}), 400

    if not is_valid_uuid(project_id):
        return jsonify({"ok": False, "error": "project_id inválido"}), 400

    if not project_store.user_owns_project(project_id, current_user.id):
        return jsonify({"ok": False, "error": "Proyecto no encontrado"}), 404

    if not project_store.project_exists(project_id):
        return jsonify({"ok": False, "error": "Proyecto no encontrado"}), 404

    if project_store.is_project_stopped(project_id):
        return jsonify({"ok": False, "error": "El proyecto ya fue detenido"}), 400

    reserved_now = False

    try:
        if not project_store.is_quota_reserved(project_id):
            ok, error = quotas.reserve_script_quota(
                current_user.id,
                reason="project_stop"
            )
            if not ok:
                return jsonify({"ok": False, "error": error}), 403
            reserved_now = True

        if stylize_photos and not current_user.is_admin:
            if not current_user.can_stylize_images:
                stylize_photos = False

        project_store.update_state_fields(project_id, {
            "participant_name": participant_name,
            "project_name": project_name,
            "stylize_photos": stylize_photos
        })
        state = project_store.mark_stopped(project_id) or {}
        project_store.update_project_status(project_id, "queued")

        q = queue.get_queue()
        rq_job = q.enqueue(job_processor.process_project, project_id)

        if reserved_now:
            project_store.set_quota_reserved(project_id, True)

        result_url = f"/r/{project_id}"

        started_at = state.get("recording_started_at")
        if isinstance(started_at, str) and started_at:
            duration_seconds = None
            try:
                duration_seconds = (
                    utcnow() - datetime.fromisoformat(started_at)
                ).total_seconds()
            except (TypeError, ValueError):
                duration_seconds = None

            db = Session()
            try:
                log_audit_for_request(
                    db,
                    action="recording_finished",
                    actor_user_id=current_user.id,
                    target_user_id=current_user.id,
                    details={
                        "project_id": project_id,
                        "project_name": project_name,
                        "participant_name": participant_name,
                        "recording_started_at": started_at,
                        "recording_stopped_at": utcnow().isoformat(),
                        "duration_seconds": duration_seconds
                    },
                    request=request
                )
                db.commit()
            finally:
                Session.remove()

        return jsonify({
            "ok": True,
            "project_id": project_id,
            "queue_job_id": rq_job.id,
            "result_url": result_url,
            "stylize_applied": stylize_photos
        })
    except ValueError as e:
        if reserved_now:
            quotas.release_script_quota(current_user.id)
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        if reserved_now:
            quotas.release_script_quota(current_user.id)
        if project_store.project_exists(project_id):
            project_store.update_project_status(
                project_id,
                "error",
                error_message=str(e)
            )
        return jsonify({"ok": False, "error": str(e)}), 500


@projects_bp.route("/api/projects", methods=["GET"])
@login_required
def list_projects():
    projects = project_store.list_projects(current_user.id)
    return jsonify({"ok": True, "projects": projects})


@projects_bp.route("/api/project/<project_id>", methods=["DELETE"])
@login_required
def delete_project(project_id):
    if not is_valid_uuid(project_id):
        return jsonify({"ok": False, "error": "project_id inválido"}), 400

    if not project_store.user_owns_project(project_id, current_user.id):
        return jsonify({"ok": False, "error": "Proyecto no encontrado"}), 404

    if not project_store.project_exists(project_id):
        return jsonify({"ok": False, "error": "Proyecto no encontrado"}), 404

    try:
        project_store.delete_project(project_id)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
