"""create member_ministry_affiliations table (appartenance aux ministères)

Revision ID: z8a9b0c1d2e3
Revises: y7z8a9b0c1d2
Create Date: 2026-07-25
"""

from typing import Sequence, Union

from alembic import op

revision: str = "z8a9b0c1d2e3"
down_revision: Union[str, None] = "y7z8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS member_ministry_affiliations (
            id          SERIAL PRIMARY KEY,
            member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
            ministry    VARCHAR(100) NOT NULL,
            joined_at   DATE NOT NULL,
            left_at     DATE,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_member_ministry_affiliations_member_id "
        "ON member_ministry_affiliations (member_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_member_ministry_affiliations_ministry "
        "ON member_ministry_affiliations (ministry)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS member_ministry_affiliations")
