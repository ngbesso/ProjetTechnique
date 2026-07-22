"""add per-event cancel deadline and custom message fields

Remplace l'ancien réglage global registration_cancel_deadline_hours par un
champ par événement, et ajoute des messages personnalisables (confirmation
d'inscription / rappel) avec variables de substitution.

Revision ID: t2u3v4w5x6y7
Revises: s1t2u3v4w5x6
Create Date: 2026-07-22
"""

from typing import Sequence, Union

from alembic import op

revision: str = "t2u3v4w5x6y7"
down_revision: Union[str, None] = "s1t2u3v4w5x6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS cancel_deadline_hours INTEGER")
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS confirmation_message TEXT")
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_message TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS reminder_message")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS confirmation_message")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS cancel_deadline_hours")
