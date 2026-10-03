"""bookmarks: is_read, a saved link you have been through

Additive only. A boolean, false on every existing row, which is the honest
answer: nothing recorded which of those had been opened.

Revision ID: f4c8a2d6b1e9
Revises: e5a9d1c3b7f2
Create Date: 2026-10-03

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
revision: str = "f4c8a2d6b1e9"
down_revision: Union[str, Sequence[str], None] = "e5a9d1c3b7f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    """What `bookmarks` already has.

    The same guard as the other additive migrations: `_add_missing_columns()`
    in `core/database.py` runs on every startup ahead of the Alembic step, so
    on most databases the column is already there and a plain `add_column`
    would fail with "duplicate column name" and leave `alembic_version` stuck.
    """
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("bookmarks")')}


def upgrade() -> None:
    """Upgrade schema."""
    if "is_read" not in _existing_columns():
        with op.batch_alter_table("bookmarks", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false())
            )


def downgrade() -> None:
    """Downgrade schema."""
    if "is_read" in _existing_columns():
        with op.batch_alter_table("bookmarks", schema=None) as batch_op:
            batch_op.drop_column("is_read")
