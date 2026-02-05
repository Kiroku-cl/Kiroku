from rq import Retry

from config import Config
from logger import get_logger
from services import project_store
from services.queue import get_queue
from rq import Retry


log = get_logger("orchestrator")


def enqueue_processing_pipeline(project_id):
    queue = get_queue(Config.RQ_PREPARE_QUEUE)
    retry = Retry(max=3, interval=[10, 60, 180])
    job = queue.enqueue(
        "worker.dispatch",
        "prepare_project",
        project_id,
        job_timeout=Config.PREPARE_PROJECT_TIMEOUT,
        retry=retry
    )
    project_store.update_processing_jobs(project_id, {"prepare": job.id})
    project_store.update_project_status(project_id, status="queued", job_id=job.id)
    log.info("Proyecto %s en cola (prepare job %s)", project_id, job.id)
    return job
