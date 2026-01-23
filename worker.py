import threading

from redis import Redis
from rq import Worker

from config import Config
from services.retention import run_cleanup_loop


def main():
    redis_conn = Redis.from_url(Config.REDIS_URL)
    cleanup_thread = threading.Thread(
        target=run_cleanup_loop,
        kwargs={"interval_seconds": 3600},
        daemon=True
    )
    cleanup_thread.start()
    worker = Worker([Config.RQ_QUEUE_NAME], connection=redis_conn)
    worker.work()


if __name__ == "__main__":
    main()
