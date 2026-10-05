"""entries: client_key, the offline queue's idempotency key, unique where set

Additive only. A resend of a save whose answer was lost carries the same
`client_key`; an in-memory dict was the only guard, so a restart forgot it and
two resends at once both created (audit 2026-10-05, ARCH-23). Null on every
existing row, which no unique index counts.

Revision ID: a7d3e9c1f5b2
Revises: f3c7a9e1d5b8
Create Date: 2026-10-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
#
# Read off this module by attribute name by Alembic's ScriptDirectory, never
# imported anywhere in this repo: the baseline migration's own comment
# explains why CodeQL calls these unused and why __all__ answers it without
# changing any behaviour.
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "a7d3e9c1f5b2"
down_revision: Union[str, Sequence[str], None] = "f3c7a9e1d5b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    """What `entries` already has: `_add_missing_columns()` runs on every
    startup ahead of the Alembic step, so the column is usually there."""
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("entries")')}


def upgrade() -> None:
    """Upgrade schema."""
    existing = _existing_columns()
    with op.batch_alter_table("entries", schema=None) as batch_op:
        if "client_key" not in existing:
            batch_op.add_column(sa.Column("client_key", sa.String(length=80), nullable=True))
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_entries_client_key "
        "ON entries (client_key) WHERE client_key IS NOT NULL"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS uq_entries_client_key")
    existing = _existing_columns()
    with op.batch_alter_table("entries", schema=None) as batch_op:
        if "client_key" in existing:
            batch_op.drop_column("client_key")
