"""add image_key column to events (cover image)

Revision ID: o7p8q9r0s1t2
Revises: n6o7p8q9r0s1
Create Date: 2026-07-18
"""

from typing import Sequence, Union

from alembic import op

revision: str = "o7p8q9r0s1t2"
down_revision: Union[str, None] = "n6o7p8q9r0s1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS image_key VARCHAR(500)")


def downgrade() -> None:
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS image_key")
