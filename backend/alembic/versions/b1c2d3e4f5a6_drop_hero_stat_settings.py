"""Retire les réglages de la bande de statistiques de l'accueil

La bande de statistiques sous le hero a été supprimée : ses huit clés
(hero_stat1_value/label … hero_stat4_value/label) resteraient sinon en base
comme orphelines, visibles dans la liste des réglages sans rien piloter.

Le downgrade réinsère les clés avec leurs valeurs d'origine, mais ne peut pas
restituer une valeur qu'un administrateur aurait personnalisée entre-temps.

Revision ID: b1c2d3e4f5a6
Revises: a9b0c1d2e3f5
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: str | None = "a9b0c1d2e3f5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_KEYS = (
    "hero_stat1_value",
    "hero_stat1_label",
    "hero_stat2_value",
    "hero_stat2_label",
    "hero_stat3_value",
    "hero_stat3_label",
    "hero_stat4_value",
    "hero_stat4_label",
)

# Valeurs telles que semées à l'origine, pour le downgrade.
_ORIGINAL = {
    "hero_stat1_value": "{eglises}",
    "hero_stat1_label": "Églises affiliées",
    "hero_stat2_value": "{membres}",
    "hero_stat2_label": "Membres actifs",
    "hero_stat3_value": "8",
    "hero_stat3_label": "Pays",
    "hero_stat4_value": "40 ans",
    "hero_stat4_label": "De mission",
}


def upgrade() -> None:
    op.execute(
        sa.text("DELETE FROM app_settings WHERE key IN :keys").bindparams(
            sa.bindparam("keys", value=_KEYS, expanding=True)
        )
    )


def downgrade() -> None:
    for key, value in _ORIGINAL.items():
        op.execute(
            sa.text(
                "INSERT INTO app_settings (key, value) VALUES (:key, :value) "
                "ON CONFLICT (key) DO NOTHING"
            ).bindparams(key=key, value=value)
        )
