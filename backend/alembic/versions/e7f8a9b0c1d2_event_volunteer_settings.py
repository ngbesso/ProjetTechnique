"""add volunteer settings columns to events (capacity, auto-approve, announcement)

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-07-27
"""

from collections.abc import Sequence

from alembic import op

revision: str = "e7f8a9b0c1d2"
down_revision: str | None = "d6e7f8a9b0c1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS volunteer_capacity INTEGER")
    op.execute(
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS volunteer_auto_approve BOOLEAN "
        "NOT NULL DEFAULT false"
    )
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS volunteer_message TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS volunteer_message")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS volunteer_auto_approve")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS volunteer_capacity")
