"""merge heads: events tables branch + formations/churches-is-active branch

Both j1k2l3m4n5o6 (events) and j2k3l4m5n6o7 (churches is_active, continuing to
formations) forked off i1j2k3l4m5n6 independently on separate feature branches.

Revision ID: m5n6o7p8q9r0
Revises: j1k2l3m4n5o6, l4m5n6o7p8q9
Create Date: 2026-07-13
"""

from typing import Sequence, Union

revision: str = "m5n6o7p8q9r0"
down_revision: Union[str, Sequence[str], None] = ("j1k2l3m4n5o6", "l4m5n6o7p8q9")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
