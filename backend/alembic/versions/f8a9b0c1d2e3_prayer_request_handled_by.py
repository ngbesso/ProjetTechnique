"""add handled_by/handled_at to prayer_requests (prise en charge)

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-07-27
"""

from collections.abc import Sequence

from alembic import op

revision: str = "f8a9b0c1d2e3"
down_revision: str | None = "e7f8a9b0c1d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS handled_by INTEGER")
    op.execute(
        "ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ"
    )
    op.execute(
        "ALTER TABLE prayer_requests DROP CONSTRAINT IF EXISTS fk_prayer_requests_handled_by"
    )
    op.execute(
        "ALTER TABLE prayer_requests ADD CONSTRAINT fk_prayer_requests_handled_by "
        "FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_prayer_requests_handled_by "
        "ON prayer_requests (handled_by)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_prayer_requests_handled_by")
    op.execute(
        "ALTER TABLE prayer_requests DROP CONSTRAINT IF EXISTS fk_prayer_requests_handled_by"
    )
    op.execute("ALTER TABLE prayer_requests DROP COLUMN IF EXISTS handled_at")
    op.execute("ALTER TABLE prayer_requests DROP COLUMN IF EXISTS handled_by")
