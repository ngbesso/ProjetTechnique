"""create menu_items table, widen app_settings.value

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-07-27
"""

from typing import Sequence, Union

from alembic import op

revision: str = "c5d6e7f8a9b0"
down_revision: Union[str, None] = "b4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS menu_items (
            id          SERIAL PRIMARY KEY,
            label       VARCHAR(100) NOT NULL,
            target_page VARCHAR(50)  NOT NULL,
            position    INTEGER      NOT NULL DEFAULT 0,
            is_visible  BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at  TIMESTAMPTZ  NOT NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_menu_items_id ON menu_items (id)")
    op.execute("ALTER TABLE app_settings ALTER COLUMN value TYPE TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE app_settings ALTER COLUMN value TYPE VARCHAR(500)")
    op.execute("DROP TABLE IF EXISTS menu_items")
