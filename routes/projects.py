from flask import Blueprint, jsonify, request

from helpers import is_valid_uuid
from limiter import limiter, LIMITS
from services import project_store, job_processor


projects_bp = Blueprint('projects', __name__)


@projects_bp.route("/api/project/start", methods=["POST"])
@limiter.limit(LIMITS["project_start"])
def project_start():
    data = request.get_json() or {}
    project_name = data.get("project_name", "")
    participant_name = data.get("participant_name", "")

    try:
        project_id = project_store.create_project(project_name, participant_name)
        return jsonify({"ok": True, "project_id": project_id})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@projects_bp.route("/api/project/stop", methods=["POST"])
@limiter.limit(LIMITS["project_stop"])
def project_stop():
    data = request.get_json() or {}
    project_id = data.get("project_id")
    participant_name = data.get("participant_name", "ACTOR")
    project_name = data.get("project_name", "")
    stylize_photos = data.get("stylize_photos", True)

    if not project_id:
        return jsonify({"ok": False, "error": "project_id required"}), 400

    if not project_store.project_exists(project_id):
        return jsonify({"ok": False, "error": "project not found"}), 404

    if project_store.is_project_stopped(project_id):
        return jsonify({"ok": False, "error": "project already stopped"}), 400

    try:
        project_store.mark_stopped(project_id)

        job_id = job_processor.create_job(
            project_id, participant_name, project_name, stylize_photos
        )
        result_url = f"/r/{job_id}"

        return jsonify({
            "ok": True,
            "job_id": job_id,
            "result_url": result_url
        })
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@projects_bp.route("/api/projects", methods=["GET"])
def list_projects():
    projects = project_store.list_projects()

    for p in projects:
        job = project_store.get_project_job(p["project_id"])
        if job:
            p["job_id"] = job.get("job_id")
            p["job_status"] = job.get("status")
            p["stylize_errors"] = job.get("stylize_errors", 0)

    return jsonify({"ok": True, "projects": projects})


@projects_bp.route("/api/project/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    if not is_valid_uuid(project_id):
        return jsonify({"ok": False, "error": "invalid project_id"}), 400

    if not project_store.project_exists(project_id):
        return jsonify({"ok": False, "error": "project not found"}), 404

    try:
        project_store.delete_project(project_id)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
