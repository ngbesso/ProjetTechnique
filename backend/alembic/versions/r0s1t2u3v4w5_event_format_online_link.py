"""add format and online_link columns to events (online events)

Revision ID: r0s1t2u3v4w5
Revises: q9r0s1t2u3v4
Create Date: 2026-07-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "r0s1t2u3v4w5"
down_revision: Union[str, None] = "q9r0s1t2u3v4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS format VARCHAR(20) "
        "NOT NULL DEFAULT 'presentiel'"
    )
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS online_link VARCHAR(500)")


def downgrade() -> None:
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS online_link")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS format")
