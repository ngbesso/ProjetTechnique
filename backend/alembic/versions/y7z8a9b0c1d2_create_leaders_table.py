"""create leaders table

Revision ID: y7z8a9b0c1d2
Revises: x6y7z8a9b0c1
Create Date: 2026-07-24
"""

from collections.abc import Sequence

from alembic import op

revision: str = "y7z8a9b0c1d2"
down_revision: str | None = "x6y7z8a9b0c1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS leaders (
            id                SERIAL PRIMARY KEY,
            first_name        VARCHAR(100)  NOT NULL,
            last_name         VARCHAR(100)  NOT NULL,
            title             VARCHAR(150)  NOT NULL,
            role              VARCHAR(20)   NOT NULL,
            district          VARCHAR(50),
            church_id         INTEGER REFERENCES churches(id) ON DELETE SET NULL,
            bio               TEXT,
            photo_key         VARCHAR(500),
            email             VARCHAR(255),
            phone             VARCHAR(50),
            years_of_service  INTEGER,
            is_published      BOOLEAN       NOT NULL DEFAULT true,
            order_index       INTEGER       NOT NULL DEFAULT 0,
            created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
            updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_leaders_church_id ON leaders (church_id)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_leaders_is_published ON leaders (is_published)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_leaders_order_index ON leaders (order_index)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS leaders")
