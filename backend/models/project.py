import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from .base import Base, utcnow


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    title = Column(String(255), nullable=False, default="")
    status = Column(String(32), nullable=False, default="recording")

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    job_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    output_file = Column(Text, nullable=True)
    fallback_file = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    stylize_errors = Column(Integer, nullable=False, default=0)

    user = relationship("User", back_populates="projects")

    def __repr__(self):
        return f"<Project {self.id} user={self.user_id} status={self.status}>"


class ProjectState(Base):
    __tablename__ = "project_states"

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True
    )
    participant_name = Column(String(255), nullable=True)
    stylize_photos = Column(Boolean, nullable=False, default=True)
    recording_started_at = Column(DateTime(timezone=True), nullable=True)
    recording_limit_seconds = Column(Integer, nullable=True)
    recording_duration_seconds = Column(Integer, nullable=True)
    chunk_duration_seconds = Column(Integer, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    stopped_at = Column(DateTime(timezone=True), nullable=True)
    quota_reserved = Column(Boolean, nullable=False, default=False)
    ingest_duration_ms = Column(BigInteger, nullable=False, default=0)
    ingest_bytes_total = Column(BigInteger, nullable=False, default=0)
    last_seq = Column(Integer, nullable=False, default=-1)
    segments_total = Column(Integer, nullable=False, default=0)
    segments_done = Column(Integer, nullable=False, default=0)
    photos_total = Column(Integer, nullable=False, default=0)
    photos_done = Column(Integer, nullable=False, default=0)
    processing_jobs = Column(JSONB, nullable=True)
    processing_metrics = Column(JSONB, nullable=True)
    transcript = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class ProjectSegment(Base):
    __tablename__ = "project_segments"
    __table_args__ = (
        UniqueConstraint("project_id", "segment_id", name="uq_project_segment"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    segment_id = Column(String(64), nullable=False)
    start_ms = Column(BigInteger, nullable=False)
    end_ms = Column(BigInteger, nullable=False)
    wav_path = Column(Text, nullable=False)
    text_path = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="pending")
    text = Column(Text, nullable=True)
    transcription_time = Column(Numeric(10, 4), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class ProjectIngestChunk(Base):
    __tablename__ = "project_ingest_chunks"
    __table_args__ = (
        UniqueConstraint("project_id", "seq", name="uq_project_chunk_seq"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    seq = Column(Integer, nullable=False)
    start_ms = Column(BigInteger, nullable=False)
    duration_ms = Column(BigInteger, nullable=False)
    bytes = Column(BigInteger, nullable=False)
    storage_backend = Column(String(32), nullable=False)
    storage_path = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class ProjectPhoto(Base):
    __tablename__ = "project_photos"
    __table_args__ = (
        UniqueConstraint("project_id", "photo_id", name="uq_project_photo"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    photo_id = Column(String(64), nullable=False)
    t_ms = Column(BigInteger, nullable=False, default=0)
    original_path = Column(Text, nullable=False)
    stylized_path = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class ProjectEvent(Base):
    __tablename__ = "project_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    def __repr__(self):
        return f"<ProjectEvent {self.id} project={self.project_id}>"


class PhotoEvent(Base):
    __tablename__ = "photo_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    def __repr__(self):
        return f"<PhotoEvent {self.id} project={self.project_id}>"
