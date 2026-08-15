"""add contribution_type column to donations (don/dime/offrande)

Revision ID: f7c2d0b4e8a5
Revises: e6b1c9a3d7f4
Create Date: 2026-07-25
"""

from typing import Sequence, Union

from alembic import op

revision: str = "f7c2d0b4e8a5"
down_revision: Union[str, None] = "e6b1c9a3d7f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS contribution_type VARCHAR(20) "
        "NOT NULL DEFAULT 'don'"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE donations DROP COLUMN IF EXISTS contribution_type")
