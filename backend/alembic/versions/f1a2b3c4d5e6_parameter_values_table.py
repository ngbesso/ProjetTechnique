"""parameter_values table

Revision ID: f1a2b3c4d5e6
Revises: e3f5a7b9c1d2
Create Date: 2026-07-03 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e3f5a7b9c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "parameter_values",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_parameter_values_category", "parameter_values", ["category"])


def downgrade() -> None:
    op.drop_index("ix_parameter_values_category", table_name="parameter_values")
    op.drop_table("parameter_values")
