"""entry_links: origin, "wiki" for a link a [[name]] made

Additive only. Null on every existing row: nothing recorded which links a
wiki name made, so none is removed for a name leaving its text (GRAPH_PLAN
518).

Revision ID: a7d3e9c1f5b4
Revises: f4c8a2d6b1e9
Create Date: 2026-10-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for the
# __all__ (read by attribute name, never imported).
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "a7d3e9c1f5b4"
down_revision: Union[str, Sequence[str], None] = "f4c8a2d6b1e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    """What `entry_links` has: `_add_missing_columns()` in core/database.py
    runs first on every startup, so the column is usually already there."""
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("entry_links")')}


def upgrade() -> None:
    """Upgrade schema."""
    if "origin" not in _existing_columns():
        with op.batch_alter_table("entry_links", schema=None) as batch_op:
            batch_op.add_column(sa.Column("origin", sa.String(length=8), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    if "origin" in _existing_columns():
        with op.batch_alter_table("entry_links", schema=None) as batch_op:
            batch_op.drop_column("origin")
