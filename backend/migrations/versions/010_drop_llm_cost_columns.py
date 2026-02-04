"""drop llm cost columns from projects

Revision ID: 010_drop_llm_cost_columns
Revises: 009_project_state_tables
Create Date: 2026-01-30
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "010_drop_llm_cost_columns"
down_revision = "009_project_state_tables"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("projects") as batch_op:
        for col in [
            "llm_cost_usd",
            "llm_total_tokens",
            "llm_completion_tokens",
            "llm_prompt_tokens"
        ]:
            try:
                batch_op.drop_column(col)
            except Exception:
                pass


def downgrade():
    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(sa.Column("llm_prompt_tokens", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("llm_completion_tokens", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("llm_total_tokens", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("llm_cost_usd", sa.Numeric(10, 4), nullable=True))
