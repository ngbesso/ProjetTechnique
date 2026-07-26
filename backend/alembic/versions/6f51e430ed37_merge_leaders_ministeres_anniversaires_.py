"""merge leaders/ministeres/anniversaires branch with actualites branch

Revision ID: 6f51e430ed37
Revises: b0c1d2e3f4g5, c47e91a2f5b3
Create Date: 2026-07-26 08:11:31.077909

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = '6f51e430ed37'
down_revision: Union[str, Sequence[str], None] = ('b0c1d2e3f4g5', 'c47e91a2f5b3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
