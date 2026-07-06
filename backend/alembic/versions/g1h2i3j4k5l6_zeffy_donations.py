"""donations: switch from Stripe to Zeffy (nullable church/category, rename payment_intent_id)

Also merges the two divergent heads left by the sermons and stripe-payment-columns
branches, which both forked off c1a2b3d4e5f6 independently.

Revision ID: g1h2i3j4k5l6
Revises: e3f4g5h6i7j8, c3d4e5f6a7b8
Create Date: 2026-07-05
"""

from typing import Sequence, Union

from alembic import op

revision: str = "g1h2i3j4k5l6"
down_revision: Union[str, Sequence[str], None] = ("e3f4g5h6i7j8", "c3d4e5f6a7b8")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Les dons reçus via le webhook Zeffy n'ont pas d'église ni de catégorie
    # associée (formulaire de don générique, sans ces champs).
    op.execute("ALTER TABLE donations ALTER COLUMN church_id DROP NOT NULL")
    op.execute("ALTER TABLE donations ALTER COLUMN category DROP NOT NULL")

    # Renomme la colonne héritée de Stripe pour ne plus être liée à un
    # prestataire de paiement en particulier.
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'donations' AND column_name = 'payment_intent_id'
            ) THEN
                ALTER TABLE donations RENAME COLUMN payment_intent_id TO payment_reference;
            END IF;
        END $$
    """)
    op.execute("DROP INDEX IF EXISTS ix_donations_payment_intent_id")
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_donations_payment_reference
            ON donations (payment_reference)
            WHERE payment_reference IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_donations_payment_reference")
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'donations' AND column_name = 'payment_reference'
            ) THEN
                ALTER TABLE donations RENAME COLUMN payment_reference TO payment_intent_id;
            END IF;
        END $$
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_donations_payment_intent_id
            ON donations (payment_intent_id)
            WHERE payment_intent_id IS NOT NULL
    """)
    op.execute("ALTER TABLE donations ALTER COLUMN category SET NOT NULL")
    op.execute("ALTER TABLE donations ALTER COLUMN church_id SET NOT NULL")
