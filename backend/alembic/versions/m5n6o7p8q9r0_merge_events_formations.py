"""merge heads: branche événements + branche formations (fusion de têtes Alembic, aucune modification de données)

Both j1k2l3m4n5o6 (events) and j2k3l4m5n6o7 (churches is_active, continuing to
formations) forked off i1j2k3l4m5n6 independently on separate feature branches.
À ne pas confondre avec n6o7p8q9r0s1 (merge_formations_into_events), qui
contient la véritable migration de données du module Formations vers Événements.

Revision ID: m5n6o7p8q9r0
Revises: j1k2l3m4n5o6, l4m5n6o7p8q9
Create Date: 2026-07-13
"""

from collections.abc import Sequence

revision: str = "m5n6o7p8q9r0"
down_revision: str | Sequence[str] | None = ("j1k2l3m4n5o6", "l4m5n6o7p8q9")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
