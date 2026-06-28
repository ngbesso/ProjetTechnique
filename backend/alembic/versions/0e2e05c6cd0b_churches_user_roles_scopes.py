"""churches + user_roles scopes

Revision ID: 0e2e05c6cd0b
Revises: 1f9f5ec7fa68
Create Date: 2026-06-27 23:31:02.195293

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e2e05c6cd0b'
down_revision: Union[str, Sequence[str], None] = '1f9f5ec7fa68'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        "churches",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("parent_id", sa.Integer, sa.ForeignKey("churches.id", ondelete="CASCADE")),
        sa.Column("district", sa.String(50)),
        sa.Column("address", sa.String(255)),
        sa.Column("phone", sa.String(50)),
        sa.Column("email", sa.String(255)),
        sa.Column("pastor_name", sa.String(150)),
        sa.Column("representative", sa.String(150)),
        sa.Column("founded_on", sa.Date),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.drop_table("user_roles")
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", sa.Integer, sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("church_id", sa.Integer, sa.ForeignKey("churches.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade():
    op.drop_table("user_roles")
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", sa.Integer, sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    )
    op.drop_table("churches")