import os
import json
import uuid
import shutil
import threading
from datetime import datetime

from config import Config
from logger import get_logger

log = get_logger("project")

_lock = threading.Lock()


def is_valid_project_id(project_id):
    if not project_id or not isinstance(project_id, str):
        return False

    try:
        uuid.UUID(project_id)
    except ValueError:
        return False

    data_dir = os.path.realpath(Config.DATA_DIR)
    project_dir = os.path.realpath(os.path.join(Config.DATA_DIR, project_id))

    if not project_dir.startswith(data_dir + os.sep):
        return False

    if not os.path.isdir(project_dir):
        return False
    return True


def create_project(project_name="", participant_name=""):
    project_id = str(uuid.uuid4())
    project_dir = os.path.join(Config.DATA_DIR, project_id)
    audio_chunks_dir = os.path.join(project_dir, "audio_chunks")
    wav_chunks_dir = os.path.join(project_dir, "wav_chunks")
    photos_dir = os.path.join(project_dir, "photos")

    os.makedirs(audio_chunks_dir, exist_ok=True)
    os.makedirs(wav_chunks_dir, exist_ok=True)
    os.makedirs(photos_dir, exist_ok=True)

    state = {
        "project_id": project_id,
        "project_name": project_name,
        "participant_name": participant_name,
        "created_at": datetime.utcnow().isoformat(),
        "stopped_at": None,
        "chunks": [],
        "transcript": ""
    }

    save_state(project_id, state)
    log.info(f"Proyecto creado: {project_id}")
    return project_id


def get_project_dir(project_id):
    return os.path.join(Config.DATA_DIR, project_id)


def get_state_path(project_id):
    return os.path.join(get_project_dir(project_id), "state.json")


def load_state(project_id):
    state_path = get_state_path(project_id)
    if not os.path.exists(state_path):
        return None
    with _lock:
        with open(state_path, "r", encoding="utf-8") as f:
            return json.load(f)


def save_state(project_id, state):
    state_path = get_state_path(project_id)
    with _lock:
        with open(state_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)


def is_project_stopped(project_id):
    state = load_state(project_id)
    if not state:
        return True
    return state.get("stopped_at") is not None


def is_project_active(project_id):
    if not is_valid_project_id(project_id):
        return False
    return not is_project_stopped(project_id)


def mark_stopped(project_id):
    state = load_state(project_id)
    if state:
        state["stopped_at"] = datetime.utcnow().isoformat()
        save_state(project_id, state)
        log.info(f"Proyecto detenido: {project_id}")
    return state


def append_chunk_result(project_id, chunk_index, webm_path, wav_path, text):
    if not is_valid_project_id(project_id):
        raise ValueError("Invalid project_id")

    if is_project_stopped(project_id):
        raise ValueError("Project is stopped (read-only)")

    state = load_state(project_id)
    if not state:
        return None

    chunk_info = {
        "index": chunk_index,
        "webm_path": webm_path,
        "wav_path": wav_path,
        "text": text
    }

    state["chunks"].append(chunk_info)

    if text.strip():
        if state["transcript"]:
            state["transcript"] += " " + text.strip()
        else:
            state["transcript"] = text.strip()

    save_state(project_id, state)
    return state


def project_exists(project_id):
    return is_valid_project_id(project_id)


def delete_project(project_id):
    if not is_valid_project_id(project_id):
        raise ValueError("Invalid project_id")

    jobs_dir = os.path.join(Config.DATA_DIR, "jobs")
    if os.path.exists(jobs_dir):
        for job_name in os.listdir(jobs_dir):
            job_dir = os.path.join(jobs_dir, job_name)
            status_path = os.path.join(job_dir, "status.json")

            if not os.path.exists(status_path):
                continue

            try:
                with open(status_path, "r", encoding="utf-8") as f:
                    status = json.load(f)

                if status.get("project_id") == project_id:
                    shutil.rmtree(job_dir)
                    log.info(f"Job eliminado: {job_name}")
            except Exception as e:
                log.warning(f"No se pudo verificar/eliminar job {job_name}: {e}")

    shutil.rmtree(get_project_dir(project_id))
    log.info(f"Proyecto eliminado: {project_id}")
    return True


def list_projects():
    projects = []
    data_dir = Config.DATA_DIR

    if not os.path.exists(data_dir):
        return projects

    for name in os.listdir(data_dir):
        if name == "jobs":
            continue

        try:
            uuid.UUID(name)
        except ValueError:
            continue

        project_dir = os.path.join(data_dir, name)
        if not os.path.isdir(project_dir):
            continue

        state_path = os.path.join(project_dir, "state.json")
        if not os.path.exists(state_path):
            continue

        try:
            with open(state_path, "r", encoding="utf-8") as f:
                state = json.load(f)

            photos_dir = os.path.join(project_dir, "photos")
            photo_count = 0
            if os.path.exists(photos_dir):
                photo_count = len([f for f in os.listdir(photos_dir)
                                   if f.endswith(('.jpg', '.jpeg', '.png'))])

            pid = state.get("project_id") or name

            projects.append({
                "project_id": pid,
                "project_name": state.get("project_name", "Sin título"),
                "participant_name": state.get("participant_name", ""),
                "created_at": state.get("created_at"),
                "stopped_at": state.get("stopped_at"),
                "is_active": state.get("stopped_at") is None,
                "chunk_count": len(state.get("chunks", [])),
                "photo_count": photo_count,
                "transcript_length": len(state.get("transcript", ""))
            })
        except Exception as e:
            log.warning(f"No se pudo cargar proyecto {name}: {e}")
            continue

    projects.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return projects


def get_project_job(project_id):
    jobs_dir = os.path.join(Config.DATA_DIR, "jobs")
    if not os.path.exists(jobs_dir):
        return None

    for job_name in os.listdir(jobs_dir):
        job_dir = os.path.join(jobs_dir, job_name)
        status_path = os.path.join(job_dir, "status.json")

        if not os.path.exists(status_path):
            continue

        try:
            with open(status_path, "r", encoding="utf-8") as f:
                status = json.load(f)

            if status.get("project_id") == project_id:
                return status
        except Exception:
            continue

    return None
