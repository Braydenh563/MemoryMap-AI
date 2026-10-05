"""whiteboard_nodes: comments, a card's thread (WHITEBOARD_PLAN decision 17)

Additive only. NULL on every existing card: nothing was commented before the
column existed. A sketch and an object keep their thread in their data blob.

Revision ID: f3c7a9e1d5b8
Revises: e5a1c8f3b7d2
Create Date: 2026-10-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for the
# __all__ (read by attribute name, never imported).
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "f3c7a9e1d5b8"
down_revision: Union[str, Sequence[str], None] = "e5a1c8f3b7d2"
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
    if "comments" not in _existing_columns():
        with op.batch_alter_table("whiteboard_nodes", schema=None) as batch_op:
            batch_op.add_column(sa.Column("comments", sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    if "comments" in _existing_columns():
        with op.batch_alter_table("whiteboard_nodes", schema=None) as batch_op:
            batch_op.drop_column("comments")
