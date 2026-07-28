"""convert leaders.role from enum-backed column to free string (parameter-driven)

Leader.role devient une simple colonne texte alimentée par les valeurs
ParameterValue (category="leader_role"), sur le même modèle que
Event.category / Member.sexe. Les valeurs existantes (slugs de l'ancien
enum LeaderRole) sont converties vers leur libellé français, qui correspond
aux valeurs seedées dans DEFAULT_PARAMETERS.

Revision ID: b0c1d2e3f4g5
Revises: a9b0c1d2e3f4
Create Date: 2026-07-26
"""

from collections.abc import Sequence

from alembic import op

revision: str = "b0c1d2e3f4g5"
down_revision: str | None = "a9b0c1d2e3f4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE leaders ALTER COLUMN role TYPE VARCHAR(50)")
    op.execute("UPDATE leaders SET role = 'Pasteur' WHERE role = 'pastor'")
    op.execute("UPDATE leaders SET role = 'Ancien' WHERE role = 'elder'")
    op.execute("UPDATE leaders SET role = 'Diacre' WHERE role = 'deacon'")
    op.execute(
        "UPDATE leaders SET role = 'Responsable de département' "
        "WHERE role = 'department_head'"
    )


def downgrade() -> None:
    op.execute("UPDATE leaders SET role = 'pastor' WHERE role = 'Pasteur'")
    op.execute("UPDATE leaders SET role = 'elder' WHERE role = 'Ancien'")
    op.execute("UPDATE leaders SET role = 'deacon' WHERE role = 'Diacre'")
    op.execute(
        "UPDATE leaders SET role = 'department_head' "
        "WHERE role = 'Responsable de département'"
    )
    op.execute("ALTER TABLE leaders ALTER COLUMN role TYPE VARCHAR(20)")
