"""whiteboard_nodes: locked, a card held in place (WHITEBOARD_PLAN decision 15)

Additive only. False on every existing card: nothing was locked before the
flag existed. A sketch and an object keep the flag in their own data blob.

Revision ID: e5a1c8f3b7d2
Revises: d9b2e6f4a1c7
Create Date: 2026-10-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for the
# __all__ (read by attribute name, never imported).
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "e5a1c8f3b7d2"
down_revision: Union[str, Sequence[str], None] = "d9b2e6f4a1c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    """What `whiteboard_nodes` has: `_add_missing_columns()` in
    core/database.py runs first on every startup, so the column is usually
    already there."""
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("whiteboard_nodes")')}


def upgrade() -> None:
    """Upgrade schema."""
    if "locked" not in _existing_columns():
        with op.batch_alter_table("whiteboard_nodes", schema=None) as batch_op:
            batch_op.add_column(sa.Column("locked", sa.Boolean(), nullable=True, server_default=sa.false()))


def downgrade() -> None:
    """Downgrade schema."""
    if "locked" in _existing_columns():
        with op.batch_alter_table("whiteboard_nodes", schema=None) as batch_op:
            batch_op.drop_column("locked")
