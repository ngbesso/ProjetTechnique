"""create prayer_requests and volunteer_requests tables

Revision ID: p8q9r0s1t2u3
Revises: o7p8q9r0s1t2
Create Date: 2026-07-19
"""

from typing import Sequence, Union

from alembic import op

revision: str = "p8q9r0s1t2u3"
down_revision: Union[str, None] = "o7p8q9r0s1t2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS prayer_requests (
            id          SERIAL PRIMARY KEY,
            member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
            message     TEXT NOT NULL,
            status      VARCHAR(20) NOT NULL DEFAULT 'new',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_prayer_requests_member_id "
        "ON prayer_requests (member_id)"
    )

    op.execute("""
        CREATE TABLE IF NOT EXISTS volunteer_requests (
            id          SERIAL PRIMARY KEY,
            member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
            event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            message     TEXT,
            status      VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_volunteer_requests_member_id "
        "ON volunteer_requests (member_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_volunteer_requests_event_id "
        "ON volunteer_requests (event_id)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS volunteer_requests")
    op.execute("DROP TABLE IF EXISTS prayer_requests")
