import os
import json
import uuid
import shutil
import threading
from datetime import datetime

from config import Config
from logger import get_logger
from services import project_store, timeline
from services.llm_service import insert_photo_markers, generate_script, replace_markers_with_images
from services.image_stylize import stylize_image

log = get_logger("job")

_jobs = {}  # In-memory job tracking
_jobs_lock = threading.Lock()


def get_job_dir(job_id):
    return os.path.join(Config.DATA_DIR, "jobs", job_id)


def get_job_status_path(job_id):
    return os.path.join(get_job_dir(job_id), "status.json")


def load_job_status(job_id):
    path = get_job_status_path(job_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_job_status(job_id, status):
    job_dir = get_job_dir(job_id)
    os.makedirs(job_dir, exist_ok=True)
    path = get_job_status_path(job_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(status, f, indent=2, ensure_ascii=False)


def create_job(project_id, participant_name="ACTOR", project_name="",
               stylize_photos=True):
    job_id = str(uuid.uuid4())
    job_dir = get_job_dir(job_id)
    os.makedirs(job_dir, exist_ok=True)

    status = {
        "job_id": job_id,
        "project_id": project_id,
        "participant_name": participant_name,
        "project_name": project_name,
        "stylize_photos": stylize_photos,
        "status": "processing",
        "created_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "error": None,
        "output_file": None,
        "fallback_file": None
    }

    save_job_status(job_id, status)

    # Start background processing
    thread = threading.Thread(target=process_job, args=(job_id,), daemon=True)
    thread.start()

    with _jobs_lock:
        _jobs[job_id] = {"thread": thread, "status": status}

    log.info(f"Job creado: {job_id} (stylize={stylize_photos})")
    return job_id


def process_job(job_id):
    status = load_job_status(job_id)
    if not status:
        return

    project_id = status.get("project_id")
    participant_name = status.get("participant_name", "ACTOR")
    should_stylize = status.get("stylize_photos", True)
    job_dir = get_job_dir(job_id)

    try:
        # 1. Load project state
        state = project_store.load_state(project_id)
        if not state:
            raise Exception("Projecto no encontrado")

        chunks = state.get("chunks", [])
        raw_transcript = state.get("transcript", "")

        # Save raw transcript as fallback
        fallback_path = os.path.join(job_dir, "transcript_raw.txt")
        with open(fallback_path, "w", encoding="utf-8") as f:
            f.write(raw_transcript)

        status["fallback_file"] = "transcript_raw.txt"
        save_job_status(job_id, status)

        # 2. Load photos from timeline
        photos = timeline.get_photos(project_id)

        # 3. Stylize photos (if enabled and not already done)
        project_dir = project_store.get_project_dir(project_id)
        stylize_errors = 0

        if should_stylize:
            for photo in photos:
                if not photo.get("stylized_path"):
                    original = photo.get("original_path")
                    if original and os.path.exists(original):
                        stylized_name = f"stylized_{photo['photo_id']}.jpg"
                        stylized_path = os.path.join(project_dir, "photos",
                                                     stylized_name)
                        if stylize_image(original, stylized_path):
                            timeline.update_photo_stylized(
                                project_id,
                                photo["photo_id"],
                                stylized_path
                            )
                            photo["stylized_path"] = stylized_path
                        else:
                            stylize_errors += 1

            # Save stylize errors count
            if stylize_errors > 0:
                status["stylize_errors"] = stylize_errors
                save_job_status(job_id, status)
                log.warning(f"Job {job_id}: {stylize_errors} fotos sin estilizar")
        else:
            log.info(f"Job {job_id}: Estilización desactivada")

        # 4. Insert photo markers into transcript
        transcript_with_markers = insert_photo_markers(raw_transcript, photos, chunks)

        # 5. Generate script with LLM
        script = generate_script(transcript_with_markers, participant_name)

        # 6. Replace markers with images
        final_script = replace_markers_with_images(script, photos)

        # 7. Copy photos to job directory for download
        photos_dir = os.path.join(job_dir, "photos")
        os.makedirs(photos_dir, exist_ok=True)

        for photo in photos:
            img_src = photo.get("stylized_path") or photo.get("original_path")
            if img_src and os.path.exists(img_src):
                img_name = os.path.basename(img_src)
                img_dst = os.path.join(photos_dir, img_name)
                if not os.path.exists(img_dst):
                    shutil.copy(img_src, img_dst)

        # 8. Write final script
        output_path = os.path.join(job_dir, "script.md")
        with open(output_path, "w", encoding="utf-8") as f:
            title = status.get("project_name", "Guion")
            f.write(f"# {title}\n\n")
            f.write(f"**Participante:** {participant_name}\n\n")
            f.write("---\n\n")
            f.write(final_script)

        # Update status
        status["status"] = "done"
        status["completed_at"] = datetime.utcnow().isoformat()
        status["output_file"] = "script.md"
        save_job_status(job_id, status)

        log.info(f"Job {job_id} completado exitosamente")

    except Exception as e:
        log.error(f"Job {job_id} falló: {e}")

        status["status"] = "error"
        status["error"] = str(e)
        status["completed_at"] = datetime.utcnow().isoformat()
        save_job_status(job_id, status)


def get_job_info(job_id):
    return load_job_status(job_id)
