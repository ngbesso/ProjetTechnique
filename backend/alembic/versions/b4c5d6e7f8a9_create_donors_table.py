"""create donors table and donations.donor_id

Revision ID: b4c5d6e7f8a9
Revises: a3d7e5c9b1f2
Create Date: 2026-07-27
"""

from typing import Sequence, Union

from alembic import op

revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, None] = "a3d7e5c9b1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS donors (
            id          SERIAL PRIMARY KEY,
            name        VARCHAR(200) NOT NULL,
            email       VARCHAR(254),
            created_at  TIMESTAMPTZ  NOT NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_donors_id ON donors (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_donors_name ON donors (name)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_donors_email ON donors (email)")

    op.execute(
        "ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_id INTEGER "
        "REFERENCES donors(id) ON DELETE SET NULL"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_donations_donor_id ON donations (donor_id)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_donations_donor_id")
    op.execute("ALTER TABLE donations DROP COLUMN IF EXISTS donor_id")
    op.execute("DROP TABLE IF EXISTS donors")
