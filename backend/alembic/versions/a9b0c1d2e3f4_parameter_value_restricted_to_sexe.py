"""add restricted_to_sexe column to parameter_values (restriction de ministère par sexe)

Revision ID: a9b0c1d2e3f4
Revises: z8a9b0c1d2e3
Create Date: 2026-07-25
"""

from typing import Sequence, Union

from alembic import op

revision: str = "a9b0c1d2e3f4"
down_revision: Union[str, None] = "z8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE parameter_values ADD COLUMN IF NOT EXISTS restricted_to_sexe VARCHAR(20)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE parameter_values DROP COLUMN IF EXISTS restricted_to_sexe")
