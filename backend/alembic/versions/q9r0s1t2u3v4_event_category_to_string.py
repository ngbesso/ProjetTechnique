"""convert events.category from enum-backed column to free string (parameter-driven)

Event.category devient une simple colonne texte alimentée par les valeurs
ParameterValue (category="event_category"), sur le même modèle que
Member.sexe / Member.family_status. Les valeurs existantes (slugs de
l'ancien enum EventCategory) sont converties vers leur libellé français,
qui correspond aux valeurs seedées dans DEFAULT_PARAMETERS.

Revision ID: q9r0s1t2u3v4
Revises: p8q9r0s1t2u3
Create Date: 2026-07-18
"""

from typing import Sequence, Union

from alembic import op

revision: str = "q9r0s1t2u3v4"
down_revision: Union[str, None] = "p8q9r0s1t2u3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE events ALTER COLUMN category TYPE VARCHAR(50)")
    op.execute("UPDATE events SET category = 'Conférence' WHERE category = 'conference'")
    op.execute("UPDATE events SET category = 'Colloque' WHERE category = 'colloque'")
    op.execute("UPDATE events SET category = 'Croisade' WHERE category = 'croisade'")
    op.execute("UPDATE events SET category = 'Retraite' WHERE category = 'retraite'")
    op.execute("UPDATE events SET category = 'Formation' WHERE category = 'formation'")
    op.execute("ALTER TABLE events ALTER COLUMN category SET DEFAULT 'Conférence'")


def downgrade() -> None:
    op.execute("ALTER TABLE events ALTER COLUMN category SET DEFAULT 'conference'")
    op.execute("UPDATE events SET category = 'conference' WHERE category = 'Conférence'")
    op.execute("UPDATE events SET category = 'colloque' WHERE category = 'Colloque'")
    op.execute("UPDATE events SET category = 'croisade' WHERE category = 'Croisade'")
    op.execute("UPDATE events SET category = 'retraite' WHERE category = 'Retraite'")
    op.execute("UPDATE events SET category = 'formation' WHERE category = 'Formation'")
    op.execute("ALTER TABLE events ALTER COLUMN category TYPE VARCHAR(20)")
