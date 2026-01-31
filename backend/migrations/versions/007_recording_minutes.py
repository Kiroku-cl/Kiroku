"""
Revision ID: 007_recording_minutes
Revises: 006_photo_events
Create Date: 2026-01-25

"""
from alembic import op
import sqlalchemy as sa


revision = "007_recording_minutes"
down_revision = "006_photo_events"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("recording_minutes_quota", sa.Integer(), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "recording_seconds_used",
            sa.Integer(),
            nullable=False,
            server_default="0"
        )
    )
    op.add_column(
        "users",
        sa.Column("recording_window_days", sa.Integer(), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "recording_window_started_at",
            sa.DateTime(timezone=True),
            nullable=True
        )
    )
    op.drop_column("users", "max_session_minutes")


def downgrade():
    op.add_column(
        "users",
        sa.Column("max_session_minutes", sa.Integer(), nullable=True)
    )
    op.drop_column("users", "recording_window_started_at")
    op.drop_column("users", "recording_window_days")
    op.drop_column("users", "recording_seconds_used")
    op.drop_column("users", "recording_minutes_quota")
