"""add created_by column to events (organisateur scoping)

Revision ID: w5x6y7z8a9b0
Revises: v4w5x6y7z8a9
Create Date: 2026-07-22
"""

from typing import Sequence, Union

from alembic import op

revision: str = "w5x6y7z8a9b0"
down_revision: Union[str, None] = "v4w5x6y7z8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by INTEGER")
    op.execute(
        "ALTER TABLE events ADD CONSTRAINT events_created_by_fkey "
        "FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_events_created_by ON events (created_by)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_events_created_by")
    op.execute("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS created_by")
