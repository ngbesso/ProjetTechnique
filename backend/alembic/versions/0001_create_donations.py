"""create donations table

Revision ID: 0001
Revises:
Create Date: 2026-06-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "donations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("receipt_number", sa.String(length=50), nullable=False),
        sa.Column("amount", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "currency",
            sa.Enum("CAD", "USD", name="donationcurrency"),
            nullable=False,
        ),
        sa.Column(
            "category",
            sa.Enum(
                "soutien_spirituel",
                "action_communautaire",
                "developpement",
                name="donationcategory",
            ),
            nullable=False,
        ),
        sa.Column("member_id", sa.Integer(), nullable=True),
        sa.Column("donor_name", sa.String(length=200), nullable=True),
        sa.Column("donor_email", sa.String(length=254), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["member_id"], ["members.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("receipt_number"),
    )
    op.create_index(op.f("ix_donations_id"), "donations", ["id"], unique=False)
    op.create_index(
        "ix_donations_member_id", "donations", ["member_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_donations_member_id", table_name="donations")
    op.drop_index(op.f("ix_donations_id"), table_name="donations")
    op.drop_table("donations")
    op.execute("DROP TYPE IF EXISTS donationcurrency")
    op.execute("DROP TYPE IF EXISTS donationcategory")
