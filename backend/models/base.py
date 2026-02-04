from datetime import datetime, timezone

from sqlalchemy.orm import declarative_base


Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc)
