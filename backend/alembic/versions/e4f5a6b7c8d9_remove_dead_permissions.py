"""remove unused permission codes (donation:read, donation:create, event:read, sermon:read)

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-08-04
"""

from typing import Sequence, Union

from alembic import op

revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DELETE FROM permissions WHERE code IN ('donation:read', 'donation:create', "
        "'event:read', 'sermon:read')"
    )


def downgrade() -> None:
    op.execute(
        """
        INSERT INTO permissions (code, description) VALUES
            ('donation:read', 'Consulter les dons'),
            ('donation:create', 'Faire un don'),
            ('event:read', 'Consulter les événements'),
            ('sermon:read', 'Consulter les sermons')
        ON CONFLICT (code) DO NOTHING
        """
    )
