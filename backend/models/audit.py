from sqlalchemy import BigInteger, Column, DateTime, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, utcnow


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    actor_user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    action = Column(Text, nullable=False, index=True)
    target_user_id = Column(UUID(as_uuid=True), nullable=True)

    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    ip = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    def __repr__(self):
        return f"<AuditLog {self.id} action={self.action}>"


def log_audit(session, action, actor_user_id=None, target_user_id=None, details=None, ip=None, user_agent=None):
    entry = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        target_user_id=target_user_id,
        details=details,
        ip=ip,
        user_agent=user_agent
    )
    session.add(entry)
    return entry


def log_audit_for_request(session, action, actor_user_id=None, target_user_id=None, details=None, request=None):
    ip = None
    user_agent = None
    if request:
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)
        user_agent = request.user_agent.string
    return log_audit(
        session,
        action=action,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        details=details,
        ip=ip,
        user_agent=user_agent
    )
