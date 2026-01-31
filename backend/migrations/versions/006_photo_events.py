"""Add photo events table

Revision ID: 006_photo_events
Revises: 005_project_events
Create Date: 2026-01-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "006_photo_events"
down_revision = "005_project_events"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "photo_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index(
        "ix_photo_events_project_id",
        "photo_events",
        ["project_id"]
    )
    op.create_index(
        "ix_photo_events_user_id",
        "photo_events",
        ["user_id"]
    )


def downgrade():
    op.drop_index("ix_photo_events_user_id", table_name="photo_events")
    op.drop_index("ix_photo_events_project_id", table_name="photo_events")
    op.drop_table("photo_events")
