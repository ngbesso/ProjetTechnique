"""create events and event_registrations tables

Revision ID: j1k2l3m4n5o6
Revises: i1j2k3l4m5n6
Create Date: 2026-07-07
"""

from typing import Sequence, Union

from alembic import op

revision: str = "j1k2l3m4n5o6"
down_revision: Union[str, None] = "i1j2k3l4m5n6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id                SERIAL PRIMARY KEY,
            title             VARCHAR(200)  NOT NULL,
            description       TEXT,
            date_start        TIMESTAMPTZ   NOT NULL,
            date_end          TIMESTAMPTZ,
            location          VARCHAR(255),
            church_id         INTEGER REFERENCES churches(id) ON DELETE SET NULL,
            district          VARCHAR(50),
            max_participants  INTEGER,
            is_published      BOOLEAN       NOT NULL DEFAULT false,
            created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
            updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_events_church_id ON events (church_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_events_date_start ON events (date_start)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_events_is_published ON events (is_published)"
    )

    op.execute("""
        CREATE TABLE IF NOT EXISTS event_registrations (
            id              SERIAL PRIMARY KEY,
            event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            member_id       INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
            registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            status          VARCHAR(20) NOT NULL DEFAULT 'confirmed',
            CONSTRAINT uq_event_registrations_event_member UNIQUE (event_id, member_id)
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_event_registrations_event_id "
        "ON event_registrations (event_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_event_registrations_member_id "
        "ON event_registrations (member_id)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS event_registrations")
    op.execute("DROP TABLE IF EXISTS events")
