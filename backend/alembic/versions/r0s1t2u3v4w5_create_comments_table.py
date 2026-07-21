"""create comments table

Revision ID: r0s1t2u3v4w5
Revises: q9r0s1t2u3v4
Create Date: 2026-07-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "r0s1t2u3v4w5"
down_revision: Union[str, None] = "q9r0s1t2u3v4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id            SERIAL PRIMARY KEY,
            post_id       INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            member_id     INTEGER REFERENCES members(id) ON DELETE SET NULL,
            author_name   VARCHAR(150) NOT NULL,
            author_email  VARCHAR(255),
            content       TEXT NOT NULL,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_comments_post_id ON comments (post_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS comments")
