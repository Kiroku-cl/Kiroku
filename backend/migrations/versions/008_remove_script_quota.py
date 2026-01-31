"""
Revision ID: 008_remove_script_quota
Revises: 007_recording_minutes
Create Date: 2026-01-25

"""
from alembic import op
import sqlalchemy as sa


revision = "008_remove_script_quota"
down_revision = "007_recording_minutes"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column("users", "quota_window_started_at")
    op.drop_column("users", "scripts_used_in_window")
    op.drop_column("users", "daily_script_quota")


def downgrade():
    op.add_column(
        "users",
        sa.Column(
            "daily_script_quota",
            sa.Integer(),
            nullable=False,
            server_default="10"
        )
    )
    op.add_column(
        "users",
        sa.Column(
            "scripts_used_in_window",
            sa.Integer(),
            nullable=False,
            server_default="0"
        )
    )
    op.add_column(
        "users",
        sa.Column(
            "quota_window_started_at",
            sa.DateTime(timezone=True),
            nullable=True
        )
    )
