"""unique email on churches and members

Revision ID: i1j2k3l4m5n6
Revises: g1h2i3j4k5l6
Create Date: 2026-07-06

"""

from alembic import op

revision = "i1j2k3l4m5n6"
down_revision = "h1i2j3k4l5m6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint("uq_churches_email", "churches", ["email"])
    op.create_unique_constraint("uq_members_email", "members", ["email"])


def downgrade() -> None:
    op.drop_constraint("uq_members_email", "members", type_="unique")
    op.drop_constraint("uq_churches_email", "churches", type_="unique")
