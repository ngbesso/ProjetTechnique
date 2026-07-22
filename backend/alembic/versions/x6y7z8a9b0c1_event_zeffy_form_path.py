"""add zeffy_form_path column to events (paiement par événement)

Revision ID: x6y7z8a9b0c1
Revises: w5x6y7z8a9b0
Create Date: 2026-07-23
"""

from typing import Sequence, Union

from alembic import op

revision: str = "x6y7z8a9b0c1"
down_revision: Union[str, None] = "w5x6y7z8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS zeffy_form_path VARCHAR(500)")


def downgrade() -> None:
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS zeffy_form_path")
