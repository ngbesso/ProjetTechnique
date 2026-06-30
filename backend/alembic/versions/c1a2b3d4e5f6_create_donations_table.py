"""create donations table

Revision ID: c1a2b3d4e5f6
Revises: b272819e9839
Create Date: 2026-06-29
"""

from typing import Sequence, Union

from alembic import op

revision: str = "c1a2b3d4e5f6"
down_revision: Union[str, None] = "b272819e9839"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crée les types ENUM s'ils n'existent pas déjà
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE donationcurrency AS ENUM ('CAD', 'USD');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE donationcategory AS ENUM (
                'soutien_spirituel', 'action_communautaire', 'developpement'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    # Crée la table si elle n'existe pas
    op.execute("""
        CREATE TABLE IF NOT EXISTS donations (
            id              SERIAL PRIMARY KEY,
            receipt_number  VARCHAR(50)       NOT NULL UNIQUE,
            amount          NUMERIC(10, 2)    NOT NULL,
            currency        donationcurrency  NOT NULL,
            category        donationcategory  NOT NULL,
            member_id       INTEGER
                REFERENCES members(id) ON DELETE SET NULL,
            donor_name      VARCHAR(200),
            donor_email     VARCHAR(254),
            created_at      TIMESTAMPTZ       NOT NULL
        )
    """)

    # Ajoute church_id si absent
    op.execute("""
        DO $$ BEGIN
            -- Supprime les dons existants incompatibles (schéma ancien sans church_id)
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='donations' AND column_name='church_id'
            ) THEN
                DELETE FROM donations;
                ALTER TABLE donations
                    ADD COLUMN church_id INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE donations
                    ALTER COLUMN church_id DROP DEFAULT;
                ALTER TABLE donations
                    ADD CONSTRAINT donations_church_id_fkey
                        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE RESTRICT;
            END IF;
        END $$
    """)

    # Index (IF NOT EXISTS)
    op.execute("CREATE INDEX IF NOT EXISTS ix_donations_id        ON donations (id)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_donations_church_id ON donations (church_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_donations_member_id ON donations (member_id)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS donations")
    op.execute("DROP TYPE IF EXISTS donationcurrency")
    op.execute("DROP TYPE IF EXISTS donationcategory")
