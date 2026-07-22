"""add reminder_sent column to event_registrations (automated reminders)

Revision ID: s1t2u3v4w5x6
Revises: r0s1t2u3v4w5
Create Date: 2026-07-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "s1t2u3v4w5x6"
down_revision: Union[str, None] = "r0s1t2u3v4w5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS reminder_sent "
        "BOOLEAN NOT NULL DEFAULT false"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE event_registrations DROP COLUMN IF EXISTS reminder_sent")
