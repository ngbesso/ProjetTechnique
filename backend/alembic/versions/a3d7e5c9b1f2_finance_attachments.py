"""add attachment_url/attachment_name to donations and expenses

Revision ID: a3d7e5c9b1f2
Revises: f7c2d0b4e8a5
Create Date: 2026-07-26
"""

from typing import Sequence, Union

from alembic import op

revision: str = "a3d7e5c9b1f2"
down_revision: Union[str, None] = "f7c2d0b4e8a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500)"
    )
    op.execute(
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255)"
    )
    op.execute(
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500)"
    )
    op.execute(
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE expenses DROP COLUMN IF EXISTS attachment_name")
    op.execute("ALTER TABLE expenses DROP COLUMN IF EXISTS attachment_url")
    op.execute("ALTER TABLE donations DROP COLUMN IF EXISTS attachment_name")
    op.execute("ALTER TABLE donations DROP COLUMN IF EXISTS attachment_url")
