"""members: add member_code column

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-03 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "members", sa.Column("member_code", sa.String(length=30), nullable=True)
    )
    op.create_unique_constraint("uq_members_member_code", "members", ["member_code"])


def downgrade() -> None:
    op.drop_constraint("uq_members_member_code", "members", type_="unique")
    op.drop_column("members", "member_code")
