"""entities: kind, aliases and merged_into (GRAPH_PLAN KG5, KG9)

Additive only. Null on every existing row: no entity had a kind, another
name or a merge before this.

Revision ID: b8e4f2a6c9d1
Revises: a7d3e9c1f5b4
Create Date: 2026-10-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for the
# __all__ (read by attribute name, never imported).
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "b8e4f2a6c9d1"
down_revision: Union[str, Sequence[str], None] = "a7d3e9c1f5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = (
    ("kind", sa.String(length=16)),
    ("aliases", sa.JSON()),
    ("merged_into", sa.Integer()),
)


def _existing_columns() -> set:
    """What `entities` has: `_add_missing_columns()` in core/database.py runs
    first on every startup, so the columns are usually already there."""
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("entities")')}


def upgrade() -> None:
    """Upgrade schema."""
    have = _existing_columns()
    missing = [(name, kind) for name, kind in _COLUMNS if name not in have]
    if missing:
        with op.batch_alter_table("entities", schema=None) as batch_op:
            for name, kind in missing:
                batch_op.add_column(sa.Column(name, kind, nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    have = _existing_columns()
    present = [name for name, _ in _COLUMNS if name in have]
    if present:
        with op.batch_alter_table("entities", schema=None) as batch_op:
            for name in present:
                batch_op.drop_column(name)
