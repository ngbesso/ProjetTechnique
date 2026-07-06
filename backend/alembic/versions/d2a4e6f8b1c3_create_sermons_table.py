"""create sermons table

Revision ID: d2a4e6f8b1c3
Revises: c1a2b3d4e5f6
Create Date: 2026-06-30
"""

from typing import Sequence, Union

from alembic import op

revision: str = "d2a4e6f8b1c3"
down_revision: Union[str, None] = "c1a2b3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sermons (
            id                SERIAL PRIMARY KEY,
            title             VARCHAR(200)  NOT NULL,
            preacher          VARCHAR(150)  NOT NULL,
            sermon_date       DATE          NOT NULL,
            description       TEXT,
            series            VARCHAR(150),
            format            VARCHAR(10)   NOT NULL,
            file_key          VARCHAR(500)  NOT NULL,
            duration_seconds  INTEGER,
            status            VARCHAR(20)   NOT NULL DEFAULT 'draft',
            views             INTEGER       NOT NULL DEFAULT 0,
            uploaded_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_sermons_status ON sermons (status)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_sermons_sermon_date ON sermons (sermon_date)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sermons")
