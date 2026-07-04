"""members: add sexe and telephone columns

Revision ID: e3f5a7b9c1d2
Revises: b272819e9839
Create Date: 2026-07-03 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e3f5a7b9c1d2"
down_revision: Union[str, Sequence[str], None] = "d2a4e6f8b1c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("members", sa.Column("sexe", sa.String(length=20), nullable=True))
    op.add_column(
        "members", sa.Column("telephone", sa.String(length=30), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("members", "telephone")
    op.drop_column("members", "sexe")
