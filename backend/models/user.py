import uuid

from flask_login import UserMixin
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from werkzeug.security import check_password_hash, generate_password_hash

from .base import Base, utcnow


class User(Base, UserMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)

    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)

    can_stylize_images = Column(Boolean, default=False, nullable=False)
    daily_stylize_quota = Column(Integer, nullable=True)
    stylizes_used_in_window = Column(Integer, default=0, nullable=False)
    stylize_window_started_at = Column(DateTime(timezone=True), nullable=True)
    recording_minutes_quota = Column(Integer, nullable=True)
    recording_seconds_used = Column(Integer, default=0, nullable=False)
    recording_window_days = Column(Integer, nullable=True)
    recording_window_started_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    sessions = relationship(
        "UserSession",
        back_populates="user",
        lazy="dynamic",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    projects = relationship(
        "Project",
        back_populates="user",
        lazy="dynamic",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_id(self):
        return str(self.id)

    def __repr__(self):
        return f"<User {self.username}>"


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    ip = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")

    @property
    def is_valid(self):
        if self.revoked_at is not None:
            return False
        if utcnow() > self.expires_at:
            return False
        return True

    def revoke(self):
        self.revoked_at = utcnow()

    def touch(self):
        self.last_seen_at = utcnow()

    def __repr__(self):
        return f"<UserSession {self.id} user={self.user_id}>"
