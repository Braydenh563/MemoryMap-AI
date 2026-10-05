"""documents, reminders: deleted_at, the recycle bin for both

Additive only (WORLD_CLASS_PLAN 5 item 10, section 8 row 30). A document and a
reminder were deleted outright; set, this column says one is in the bin, and
`core/database._hide_binned` keeps it out of every ordinary read. Null on every
existing row: nothing was in their bin before there was one.

Revision ID: b7e3d1a9c5f2
Revises: a4c9e2f7b1d3
Create Date: 2026-10-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for why
# __all__ names them.
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "b7e3d1a9c5f2"
down_revision: Union[str, Sequence[str], None] = "a4c9e2f7b1d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("documents", "reminders")


def _existing_columns(table: str) -> set:
    """`_add_missing_columns()` in `core/database.py` runs ahead of Alembic on
    every startup, so the column is usually there already."""
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql(f'PRAGMA table_info("{table}")')}


def upgrade() -> None:
    """Upgrade schema."""
    for table in TABLES:
        if "deleted_at" not in _existing_columns(table):
            with op.batch_alter_table(table, schema=None) as batch_op:
                batch_op.add_column(sa.Column("deleted_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    for table in TABLES:
        if "deleted_at" in _existing_columns(table):
            with op.batch_alter_table(table, schema=None) as batch_op:
                batch_op.drop_column("deleted_at")
