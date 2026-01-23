"""Add project job metadata fields

Revision ID: 004_project_job_meta
Revises: 003_user_quota_flags
Create Date: 2026-01-23

"""
from alembic import op
import sqlalchemy as sa


revision = "004_project_job_meta"
down_revision = "003_user_quota_flags"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "projects",
        sa.Column("error_message", sa.Text(), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column(
            "stylize_errors",
            sa.Integer(),
            nullable=False,
            server_default="0"
        )
    )
    op.add_column(
        "projects",
        sa.Column("llm_prompt_tokens", sa.Integer(), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column("llm_completion_tokens", sa.Integer(), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column("llm_total_tokens", sa.Integer(), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column("llm_cost_usd", sa.Numeric(10, 4), nullable=True)
    )


def downgrade():
    op.drop_column("projects", "llm_cost_usd")
    op.drop_column("projects", "llm_total_tokens")
    op.drop_column("projects", "llm_completion_tokens")
    op.drop_column("projects", "llm_prompt_tokens")
    op.drop_column("projects", "stylize_errors")
    op.drop_column("projects", "error_message")
