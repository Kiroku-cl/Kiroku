import argparse
import os
import argparse
import threading
import time

from redis import Redis
from rq import Worker
from rq.utils import import_attribute

from config import Config
from logger import get_logger
from services.db_health import get_expected_head, schema_is_current
from services.retention import run_cleanup_loop


log = get_logger("worker")


ALLOWED_JOBS = {
    "prepare_project": "services.jobs.prepare_project.prepare_project_job",
    "transcribe_segment": "services.jobs.transcribe_segment.transcribe_segment_job",
    "stylize_photo": "services.jobs.stylize_photo_job.stylize_photo_job",
    "finalize_project": "services.jobs.finalize_project.finalize_project_job",
}


def dispatch(alias, *args, **kwargs):
    target = ALLOWED_JOBS.get(alias)
    if not target:
        log.warning("Alias de job no permitido: %s", alias)
        return None
    func = import_attribute(target)
    return func(*args, **kwargs)


def parse_args():
    parser = argparse.ArgumentParser(description="RQ worker launcher")
    parser.add_argument(
        "--queues",
        help="Comma separated list of queue names to listen on",
        default=""
    )
    return parser.parse_args()


def main():
    redis_conn = Redis.from_url(Config.REDIS_URL)
    args = parse_args()

    # Esperar migraciones si falta schema
    override = os.getenv("ALEMBIC_EXPECTED_HEAD")
    while True:
        expected_rev = get_expected_head(env_override=override)
        if not expected_rev:
            log.error("Heads de Alembic no actualizados. Reintentando en 30s...")
            time.sleep(30)
            continue

        ok, msg = schema_is_current(expected_rev)
        if ok:
            break
        log.error("Migraciones pendientes (%s). Reintentando en 30s...", msg)
        time.sleep(30)

    cleanup_thread = threading.Thread(
        target=run_cleanup_loop,
        kwargs={"interval_seconds": 3600},
        daemon=True
    )
    cleanup_thread.start()
    queues = [q.strip() for q in args.queues.split(",") if q.strip()]
    if not queues:
        queues = [
            Config.RQ_AUDIO_QUEUE,
            Config.RQ_TRANSCRIBE_QUEUE,
            Config.RQ_PHOTO_QUEUE,
            Config.RQ_LLM_QUEUE
        ]
    log.info("Worker listening on queues: %s", ", ".join(queues))
    worker = Worker(queues, connection=redis_conn, name=None)
    worker.work()


if __name__ == "__main__":
    main()
