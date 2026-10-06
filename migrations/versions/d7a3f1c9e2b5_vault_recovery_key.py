"""vault: the recovery key's wrap of the data key (INBOX 663)

Additive. Three nullable columns on the one vault row: the salt the recovery
key is stretched with, the data key wrapped by it, and when it was made. Null
on every existing row, which is the honest answer: no notebook has had a
recovery key before this. The key itself is never a column; see
`core/crypto.new_recovery_key`.

Revision ID: d7a3f1c9e2b5
Revises: b4e8d2a6f1c9
Create Date: 2026-10-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. Read by attribute name by Alembic's
# ScriptDirectory (see the baseline migration on why `__all__` is here).
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "d7a3f1c9e2b5"
down_revision: Union[str, Sequence[str], None] = "b4e8d2a6f1c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = (
    ("recovery_salt", sa.LargeBinary(32)),
    ("recovery_wrapped_dek", sa.LargeBinary(128)),
    ("recovery_created_at", sa.DateTime()),
)


def _existing_columns() -> set:
    """What `vault` already has. `_add_missing_columns()` in core/database.py
    runs on every startup ahead of Alembic, so on most databases these are
    already there and a plain `add_column` would fail as a duplicate."""
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("vault")')}


def upgrade() -> None:
    """Upgrade schema."""
    existing = _existing_columns()
    missing = [(name, kind) for name, kind in _COLUMNS if name not in existing]
    if missing:
        with op.batch_alter_table("vault", schema=None) as batch_op:
            for name, kind in missing:
                batch_op.add_column(sa.Column(name, kind, nullable=True))


def downgrade() -> None:
    """Downgrade schema. The recovery wrap goes; the password's wrap, and so
    every private note, is untouched."""
    existing = _existing_columns()
    present = [name for name, _kind in _COLUMNS if name in existing]
    if present:
        with op.batch_alter_table("vault", schema=None) as batch_op:
            for name in present:
                batch_op.drop_column(name)
