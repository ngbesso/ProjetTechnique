"""add stripe payment columns to donations

Revision ID: e3f4g5h6i7j8
Revises: c1a2b3d4e5f6
Create Date: 2026-06-30
"""

from typing import Sequence, Union

from alembic import op

revision: str = "e3f4g5h6i7j8"
down_revision: Union[str, None] = "c1a2b3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'donations' AND column_name = 'payment_intent_id'
            ) THEN
                ALTER TABLE donations ADD COLUMN payment_intent_id VARCHAR(100) NULL;
            END IF;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'donations' AND column_name = 'payment_status'
            ) THEN
                ALTER TABLE donations ADD COLUMN payment_status VARCHAR(50) NOT NULL DEFAULT 'manual';
            END IF;
        END $$
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_donations_payment_intent_id
            ON donations (payment_intent_id)
            WHERE payment_intent_id IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_donations_payment_intent_id")
    op.execute("""
        ALTER TABLE donations
            DROP COLUMN IF EXISTS payment_intent_id,
            DROP COLUMN IF EXISTS payment_status
    """)
