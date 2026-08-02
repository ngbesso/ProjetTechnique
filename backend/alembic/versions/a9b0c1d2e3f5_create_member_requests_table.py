"""create member_requests table (demandes libres des membres)

Revision ID: a9b0c1d2e3f5
Revises: f8a9b0c1d2e3
Create Date: 2026-07-28
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a9b0c1d2e3f5"
down_revision: str | None = "f8a9b0c1d2e3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS member_requests (
            id              SERIAL PRIMARY KEY,
            member_id       INTEGER      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
            request_type    VARCHAR(100) NOT NULL,
            message         TEXT         NOT NULL,
            status          VARCHAR(20)  NOT NULL DEFAULT 'new',
            handled_by      INTEGER      REFERENCES users(id) ON DELETE SET NULL,
            admin_response  TEXT,
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
            resolved_at     TIMESTAMPTZ
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_member_requests_member_id "
        "ON member_requests (member_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_member_requests_handled_by "
        "ON member_requests (handled_by)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS member_requests")
