import os
import shutil

from logger import get_logger
from services.project_store import get_project_dir


log = get_logger("cleanup")


def cleanup_project_files(project_id, keep_scripts=True):
    project_dir = get_project_dir(project_id)

    if not os.path.exists(project_dir):
        log.info("Directorio %s no existe, nada que limpiar", project_id)
        return

    if not keep_scripts:
        try:
            shutil.rmtree(project_dir)
            log.info("Proyecto %s: se borró el directorio completo", project_id)
        except Exception as exc:
            log.error("Error limpiando proyecto %s: %s", project_id, exc)
        return

    temp_dirs = [
        "audio_chunks",
        "wav_chunks",
        "segments",
        "tmp",
    ]

    for dir_name in temp_dirs:
        dir_path = os.path.join(project_dir, dir_name)
        if os.path.exists(dir_path):
            try:
                shutil.rmtree(dir_path)
            except Exception as exc:
                log.error("No se pudo borrar %s: %s", dir_path, exc)


def cleanup_on_project_delete(project_id):
    cleanup_project_files(project_id, keep_scripts=False)
    log.info("Proyecto %s limpiado tras eliminarse", project_id)
