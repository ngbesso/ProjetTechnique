"""create formation_registrations table

Revision ID: l4m5n6o7p8q9
Revises: k3l4m5n6o7p8
Create Date: 2026-07-11

"""

import sqlalchemy as sa
from alembic import op

revision = "l4m5n6o7p8q9"
down_revision = "k3l4m5n6o7p8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "formation_registrations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "formation_id",
            sa.Integer(),
            sa.ForeignKey("formations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "formation_id", "email", name="uq_formation_registration_email"
        ),
    )


def downgrade() -> None:
    op.drop_table("formation_registrations")
