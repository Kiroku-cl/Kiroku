import os
import os
from flask import Blueprint, jsonify, send_from_directory, make_response
from flask_login import login_required, current_user

from logger import get_logger
from helpers import is_valid_uuid, get_mime_type
from models import utcnow
from services import project_store
from services.export.html_renderer import convert_script_to_html
from services.export.pdf_renderer import render_pdf_bytes
from services.export.docx_renderer import render_docx_bytes

jobs_bp = Blueprint('jobs', __name__)



@jobs_bp.route("/api/project/<project_id>/status")
@login_required
def project_status(project_id):
    if not is_valid_uuid(project_id):
        return jsonify({"ok": False, "error": "project_id inválido"}), 400

    record = project_store.get_project_for_user(project_id, current_user.id)
    if not record:
        return jsonify({"ok": False, "error": "Proyecto no encontrado"}), 404

    state = project_store.load_state(project_id) or {}
    return jsonify({
        "ok": True,
        "status": record.status,
        "error": record.error_message,
        "project_name": state.get("project_name", record.title),
        "participant_name": state.get("participant_name", ""),
        "recording_duration_seconds": state.get("recording_duration_seconds"),
        "created_at": record.created_at.isoformat() if getattr(record, "created_at", None) else None,
        "expires_at": state.get("expires_at") or (
            record.expires_at.isoformat() if getattr(record, "expires_at", None) else None
        )
    })


@jobs_bp.route("/r/<project_id>/download/<filename>")
@login_required
def download_file(project_id, filename):
    if not is_valid_uuid(project_id):
        return "No encontrado", 404

    record = project_store.get_project_for_user(project_id, current_user.id)
    if not record:
        return "No encontrado", 404

    expires_at = record.expires_at
    if expires_at is not None and expires_at <= utcnow():
        return "Proyecto expirado", 410

    safe_filename = os.path.basename(filename)
    allowed = {record.output_file}
    if safe_filename not in allowed:
        return "No encontrado", 404

    project_dir = project_store.get_project_dir(project_id)
    file_path = os.path.join(project_dir, safe_filename)
    if not os.path.exists(file_path):
        return "File not found", 404

    mimetype = get_mime_type(safe_filename)

    return send_from_directory(
        project_dir,
        safe_filename,
        as_attachment=True,
        mimetype=mimetype
    )


@jobs_bp.route("/api/project/<project_id>/preview")
@login_required
def project_preview(project_id):
    if not is_valid_uuid(project_id):
        return jsonify({"ok": False, "error": "project_id inválido"}), 400

    record = project_store.get_project_for_user(project_id, current_user.id)
    if not record:
        return jsonify({"ok": False, "error": "Proyecto no encontrado"}), 404

    expires_at = record.expires_at
    if expires_at is not None and expires_at <= utcnow():
        return jsonify({"ok": False, "error": "Proyecto expirado"}), 410

    project_dir = project_store.get_project_dir(project_id)
    script_path = os.path.join(project_dir, "script.md")

    if not os.path.exists(script_path):
        return jsonify({"ok": False, "error": "script not found"}), 404

    try:
        with open(script_path, "r", encoding="utf-8") as f:
            content = f.read()

        html = convert_script_to_html(content, project_id, embed_images=True)

        return jsonify({"ok": True, "html": html})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


def _load_script_content(project_id):
    project_dir = project_store.get_project_dir(project_id)
    script_path = os.path.join(project_dir, "script.md")
    if not os.path.exists(script_path):
        return None, None
    with open(script_path, "r", encoding="utf-8") as f:
        content = f.read()
    return content, project_dir


def _check_access(project_id):
    if not is_valid_uuid(project_id):
        return False, (jsonify({"ok": False, "error": "project_id inválido"}), 400)

    record = project_store.get_project_for_user(project_id, current_user.id)
    if not record:
        return False, (jsonify({"ok": False, "error": "Proyecto no encontrado"}), 404)

    expires_at = record.expires_at
    if expires_at is not None and expires_at <= utcnow():
        return False, (jsonify({"ok": False, "error": "Proyecto expirado"}), 410)

    return True, record


@jobs_bp.route("/api/project/<project_id>/export/pdf", methods=["POST"])
@login_required
def export_pdf(project_id):
    ok, result = _check_access(project_id)
    if not ok:
        return result

    content, project_dir = _load_script_content(project_id)
    if content is None:
        return jsonify({"ok": False, "error": "script no encontrado"}), 404

    try:
        pdf_bytes = render_pdf_bytes(content, project_id, project_dir)
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'attachment; filename="guion_%s.pdf"' % str(project_id)[:8]
        return response
    except Exception as e:
        log = get_logger("jobs")
        log.error("Export PDF failed for project %s: %s", project_id, e)
        return jsonify({"ok": False, "error": "Error al generar PDF"}), 500


@jobs_bp.route("/api/project/<project_id>/export/docx", methods=["POST"])
@login_required
def export_docx(project_id):
    ok, result = _check_access(project_id)
    if not ok:
        return result

    content, project_dir = _load_script_content(project_id)
    if content is None:
        return jsonify({"ok": False, "error": "script no encontrado"}), 404

    try:
        docx_bytes = render_docx_bytes(content, project_id, project_dir)
        response = make_response(docx_bytes)
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        response.headers['Content-Disposition'] = 'attachment; filename="guion_%s.docx"' % str(project_id)[:8]
        return response
    except Exception as e:
        log = get_logger("jobs")
        log.error("Export DOCX failed for project %s: %s", project_id, e)
        return jsonify({"ok": False, "error": "Error al generar DOCX"}), 500


@jobs_bp.route("/api/project/<project_id>/export/md", methods=["GET"])
@login_required
def download_md(project_id):
    if not current_user.is_admin:
        return jsonify({"ok": False, "error": "No autorizado"}), 403

    ok, result = _check_access(project_id)
    if not ok:
        return result

    content, _ = _load_script_content(project_id)
    if content is None:
        return jsonify({"ok": False, "error": "script no encontrado"}), 404

    response = make_response(content)
    response.headers['Content-Type'] = 'text/markdown; charset=utf-8'
    response.headers['Content-Disposition'] = 'attachment; filename="guion_%s.md"' % str(project_id)[:8]
    return response
