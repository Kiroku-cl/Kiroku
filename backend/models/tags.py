from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base, utcnow


class UserTag(Base):
    __tablename__ = "user_tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    projects = relationship(
        "ProjectTag",
        back_populates="tag",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def __repr__(self):
        return f"<UserTag {self.id} name={self.name} user={self.user_id}>"


class ProjectTag(Base):
    __tablename__ = "project_tags"

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True
    )
    tag_id = Column(
        Integer,
        ForeignKey("user_tags.id", ondelete="CASCADE"),
        primary_key=True
    )
    created_at = Column(DateTime(timezone=True), default=utcnow)

    tag = relationship("UserTag", back_populates="projects")
