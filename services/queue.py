from redis import Redis
from rq import Queue

from config import Config


def get_redis():
    return Redis.from_url(Config.REDIS_URL)


def get_queue():
    return Queue(name=Config.RQ_QUEUE_NAME, connection=get_redis())
