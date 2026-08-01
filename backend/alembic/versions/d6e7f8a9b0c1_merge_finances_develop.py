"""merge heads: branche feat/finances + branche develop (fusion de têtes Alembic, aucune modification de données)

Both c5d6e7f8a9b0 (feat/finances: expenses, donors, menu_items, ...) and
6f51e430ed37 (develop: ministères, actualités, restricted_to_sexe, leader
role en string, ...) forked off bf9c10b20e84 (create leaders table,
renommée depuis d58fa204b6c1) independently on separate branches.

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0, 6f51e430ed37
Create Date: 2026-07-27
"""

from collections.abc import Sequence

revision: str = "d6e7f8a9b0c1"
down_revision: str | Sequence[str] | None = ("c5d6e7f8a9b0", "6f51e430ed37")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
