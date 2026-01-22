import os
import re
import html as html_lib

from flask import Blueprint, jsonify, render_template, send_from_directory

from helpers import is_valid_uuid, encode_image_base64, get_mime_type
from services import job_processor


jobs_bp = Blueprint('jobs', __name__)


@jobs_bp.route("/api/job/<job_id>/status")
def job_status(job_id):
    if not is_valid_uuid(job_id):
        return jsonify({"ok": False, "error": "invalid job_id"}), 400

    info = job_processor.get_job_info(job_id)
    if not info:
        return jsonify({"ok": False, "error": "job not found"}), 404

    return jsonify({
        "ok": True,
        "status": info["status"],
        "error": info.get("error"),
        "output_file": info.get("output_file"),
        "fallback_file": info.get("fallback_file")
    })


@jobs_bp.route("/r/<job_id>")
def result_page(job_id):
    if not is_valid_uuid(job_id):
        return "Job no encontrado", 404

    info = job_processor.get_job_info(job_id)
    if not info:
        return "Job no encontrado", 404

    return render_template("result.html", job=info)


@jobs_bp.route("/r/<job_id>/download/<filename>")
def download_file(job_id, filename):
    if not is_valid_uuid(job_id):
        return "Not found", 404

    safe_filename = os.path.basename(filename)
    job_dir = job_processor.get_job_dir(job_id)

    file_path = os.path.join(job_dir, safe_filename)
    if not os.path.exists(file_path):
        return "File not found", 404

    mimetype = get_mime_type(safe_filename)

    return send_from_directory(job_dir, safe_filename, as_attachment=True, mimetype=mimetype)


@jobs_bp.route("/api/job/<job_id>/preview")
def job_preview(job_id):
    if not is_valid_uuid(job_id):
        return jsonify({"ok": False, "error": "invalid job_id"}), 400

    job_dir = job_processor.get_job_dir(job_id)
    script_path = os.path.join(job_dir, "script.md")

    if not os.path.exists(script_path):
        return jsonify({"ok": False, "error": "script not found"}), 404

    try:
        with open(script_path, "r", encoding="utf-8") as f:
            content = f.read()

        html = convert_script_to_html(content, job_id)

        return jsonify({"ok": True, "html": html})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


def convert_script_to_html(content, job_id):
    job_dir = job_processor.get_job_dir(job_id)
    photos_dir = os.path.join(job_dir, "photos")
    content = content.strip()
    lines = content.split('\n')
    html_parts = []
    prev_empty = False

    for line in lines:
        # Skip consecutive empty lines
        if not line.strip():
            if not prev_empty:
                html_parts.append('<div style="height: 1em;"></div>')
            prev_empty = True
            continue
        prev_empty = False

        # Headers
        if line.startswith('# '):
            text = html_lib.escape(line[2:])
            html_parts.append(f'<h1 style="text-align: center; margin-bottom: 0.5em;">{text}</h1>')
            continue

        if line.startswith('## '):
            text = html_lib.escape(line[3:])
            html_parts.append(f'<h2 style="margin-top: 1em;">{text}</h2>')
            continue

        if line.strip() == '---':
            html_parts.append('<hr style="margin: 1em 0;">')
            continue

        if '**' in line:
            text = html_lib.escape(line)
            text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
            html_parts.append(f'<p style="margin: 0.5em 0;">{text}</p>')
            continue

        img_match = re.match(r'!\[(.+?)\]\((.+?)\)', line.strip())
        if img_match:
            alt = html_lib.escape(img_match.group(1))
            filename = os.path.basename(img_match.group(2))
            img_path = os.path.join(photos_dir, filename)

            # Validación extra
            real_photos_dir = os.path.realpath(photos_dir)
            real_img_path = os.path.realpath(img_path)
            if not real_img_path.startswith(real_photos_dir + os.sep):
                html_parts.append(f'<div style="text-align: center; margin: 1em 0; padding: 2em; background: #333; border-radius: 8px; color: #999;">[Ruta inválida]</div>')
                continue

            if os.path.exists(img_path):
                b64_data = encode_image_base64(img_path)
                mime = get_mime_type(filename) or 'image/jpeg'

                data_url = f'data:{mime};base64,{b64_data}'
                html_parts.append(f'<div style="text-align: center; margin: 1em 0;"><img src="{data_url}" alt="{alt}" style="max-width: 40%; border-radius: 8px;"></div>')
            else:
                html_parts.append(f'<div style="text-align: center; margin: 1em 0; padding: 2em; background: #333; border-radius: 8px; color: #999;">[Imagen no encontrada: {alt}]</div>')
            continue

        text = html_lib.escape(line)
        leading_spaces = len(line) - len(line.lstrip())
        if leading_spaces > 0:
            nbsp = '&nbsp;' * leading_spaces
            text = nbsp + text.lstrip()

        html_parts.append(f'<div style="margin: 0; white-space: pre-wrap;">{text}</div>')

    return '\n'.join(html_parts)
