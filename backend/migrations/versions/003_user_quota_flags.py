"""Add user quota and session flags

Revision ID: 003_user_quota_flags
Revises: 002_projects
Create Date: 2026-01-23

"""
from alembic import op
import sqlalchemy as sa


revision = "003_user_quota_flags"
down_revision = "002_projects"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("daily_stylize_quota", sa.Integer(), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "stylizes_used_in_window",
            sa.Integer(),
            nullable=False,
            server_default="0"
        )
    )
    op.add_column(
        "users",
        sa.Column(
            "stylize_window_started_at",
            sa.DateTime(timezone=True),
            nullable=True
        )
    )
    op.add_column(
        "users",
        sa.Column("max_session_minutes", sa.Integer(), nullable=True)
    )


def downgrade():
    op.drop_column("users", "max_session_minutes")
    op.drop_column("users", "stylize_window_started_at")
    op.drop_column("users", "stylizes_used_in_window")
    op.drop_column("users", "daily_stylize_quota")
