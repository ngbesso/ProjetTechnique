"""create expenses table (module gestion financière)

Revision ID: e6b1c9a3d7f4
Revises: d58fa204b6c1
Create Date: 2026-07-25
"""

from typing import Sequence, Union

from alembic import op

revision: str = "e6b1c9a3d7f4"
down_revision: Union[str, None] = "d58fa204b6c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id             SERIAL PRIMARY KEY,
            amount         NUMERIC(10, 2) NOT NULL,
            expense_date   DATE NOT NULL,
            category       VARCHAR(100) NOT NULL,
            church_id      INTEGER REFERENCES churches(id) ON DELETE SET NULL,
            responsible_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            comment        TEXT NOT NULL,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_expenses_church_id ON expenses (church_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_expenses_responsible_id ON expenses (responsible_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_expenses_expense_date ON expenses (expense_date)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS expenses")
