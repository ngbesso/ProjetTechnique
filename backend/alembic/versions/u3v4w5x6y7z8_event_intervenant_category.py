"""add intervenant_category column to events

Revision ID: u3v4w5x6y7z8
Revises: t2u3v4w5x6y7
Create Date: 2026-07-22
"""

from typing import Sequence, Union

from alembic import op

revision: str = "u3v4w5x6y7z8"
down_revision: Union[str, None] = "t2u3v4w5x6y7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS intervenant_category VARCHAR(50)")


def downgrade() -> None:
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS intervenant_category")
