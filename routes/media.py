import os

from flask import Blueprint, jsonify, request

from config import Config
from helpers import is_valid_uuid, parse_data_url, get_image_extension
from limiter import limiter, LIMITS
from services import project_store, timeline
from services.audio_convert import webm_to_wav, FFmpegNotFoundError, ConversionError
from services.stt_whisper import transcribe_wav


media_bp = Blueprint('media', __name__)

MAX_CHUNK_SIZE = 5 * 1024 * 1024  # 5MB


@media_bp.route("/api/audio/chunk", methods=["POST"])
@limiter.limit(LIMITS["audio_chunk"])
def audio_chunk():
    project_id = request.form.get("project_id")
    chunk_index = request.form.get("chunk_index")

    if not project_id:
        return jsonify({"ok": False, "error": "project_id required"}), 400

    if chunk_index is None:
        return jsonify({"ok": False, "error": "chunk_index required"}), 400

    try:
        chunk_index = int(chunk_index)
    except ValueError:
        return jsonify({"ok": False, "error": "chunk_index must be integer"}), 400

    if chunk_index < 0:
        return jsonify({"ok": False, "error": "chunk_index must be non-negative"}), 400

    if not project_store.project_exists(project_id):
        return jsonify({"ok": False, "error": "project not found"}), 404

    if project_store.is_project_stopped(project_id):
        return jsonify({"ok": False, "error": "project is stopped (read-only)"}), 403

    if "file" not in request.files:
        return jsonify({"ok": False, "error": "file required"}), 400

    file = request.files["file"]
    file_content = file.read()
    file_size = len(file_content)

    if file_size > MAX_CHUNK_SIZE:
        return jsonify({"ok": False, "error": "chunk too large"}), 400

    if file_size < 100:
        return jsonify({"ok": False, "error": "chunk too small"}), 400

    project_dir = project_store.get_project_dir(project_id)
    webm_path = os.path.join(project_dir, "audio_chunks", f"chunk_{chunk_index}.webm")
    wav_path = os.path.join(project_dir, "wav_chunks", f"chunk_{chunk_index}.wav")

    with open(webm_path, "wb") as f:
        f.write(file_content)

    try:
        webm_to_wav(webm_path, wav_path)
    except FFmpegNotFoundError as e:
        return jsonify({"ok": False, "error": str(e)}), 500
    except ConversionError as e:
        return jsonify({"ok": False, "error": f"conversion failed: {str(e)}"}), 500

    text = transcribe_wav(wav_path)

    try:
        project_store.append_chunk_result(
            project_id,
            chunk_index,
            webm_path,
            wav_path,
            text
        )
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 403

    return jsonify({
        "ok": True,
        "chunk_index": chunk_index,
        "text": text
    })


@media_bp.route("/api/photo", methods=["POST"])
@limiter.limit(LIMITS["photo"])
def upload_photo():
    data = request.get_json() or {}
    project_id = data.get("project_id")
    photo_id = data.get("photo_id")
    t_ms = data.get("t_ms")
    data_url = data.get("data_url")

    if not project_id:
        return jsonify({"ok": False, "error": "project_id required"}), 400

    if not photo_id:
        return jsonify({"ok": False, "error": "photo_id required"}), 400

    if t_ms is None:
        return jsonify({"ok": False, "error": "t_ms required"}), 400

    if not data_url:
        return jsonify({"ok": False, "error": "data_url required"}), 400

    if not project_store.project_exists(project_id):
        return jsonify({"ok": False, "error": "project not found"}), 404

    if project_store.is_project_stopped(project_id):
        return jsonify({"ok": False, "error": "project is stopped (read-only)"}), 403

    if not is_valid_uuid(photo_id):
        return jsonify({"ok": False, "error": "invalid photo_id"}), 400

    header, image_data = parse_data_url(data_url)
    if header is None:
        return jsonify({"ok": False, "error": "invalid data_url format"}), 400

    if len(image_data) > Config.MAX_IMAGE_SIZE:
        return jsonify({"ok": False, "error": "image too large"}), 400

    ext = get_image_extension(header)

    project_dir = project_store.get_project_dir(project_id)
    photo_filename = f"photo_{photo_id}.{ext}"
    photo_path = os.path.join(project_dir, "photos", photo_filename)

    with open(photo_path, "wb") as f:
        f.write(image_data)

    timeline.add_photo(project_id, photo_id, t_ms, photo_path)

    return jsonify({
        "ok": True,
        "photo_id": photo_id,
        "t_ms": t_ms
    })
