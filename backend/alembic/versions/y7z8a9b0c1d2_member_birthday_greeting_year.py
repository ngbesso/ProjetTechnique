"""add last_birthday_greeting_year column to members (anniversaires automatisés)

Revision ID: y7z8a9b0c1d2
Revises: c47e91a2f5b3
Create Date: 2026-07-24
"""

from typing import Sequence, Union

from alembic import op

revision: str = "y7z8a9b0c1d2"
down_revision: Union[str, None] = "x6y7z8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE members ADD COLUMN IF NOT EXISTS last_birthday_greeting_year INTEGER"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE members DROP COLUMN IF EXISTS last_birthday_greeting_year")
