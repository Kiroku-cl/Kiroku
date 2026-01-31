"""Add project events table

Revision ID: 005_project_events
Revises: 004_project_job_meta
Create Date: 2026-01-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "005_project_events"
down_revision = "004_project_job_meta"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "project_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index(
        "ix_project_events_project_id",
        "project_events",
        ["project_id"]
    )
    op.create_index(
        "ix_project_events_user_id",
        "project_events",
        ["user_id"]
    )


def downgrade():
    op.drop_index("ix_project_events_user_id", table_name="project_events")
    op.drop_index("ix_project_events_project_id", table_name="project_events")
    op.drop_table("project_events")
