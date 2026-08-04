"""Élargit app_settings.value de VARCHAR(500) à TEXT

Les réglages de la page « Qui sommes-nous » sont multilignes : la liste du
crédo en 11 points dépasse à elle seule les 500 caractères de la colonne.

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: str | None = "b1c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "app_settings",
        "value",
        existing_type=sa.String(length=500),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    # Un retour arrière tronquerait les valeurs plus longues que 500 caractères
    # saisies entre-temps ; on les coupe explicitement pour que l'ALTER passe.
    op.execute(
        sa.text("UPDATE app_settings SET value = LEFT(value, 500) WHERE LENGTH(value) > 500")
    )
    op.alter_column(
        "app_settings",
        "value",
        existing_type=sa.Text(),
        type_=sa.String(length=500),
        existing_nullable=False,
    )
