"""entry_opens: how often each note was opened on each day

A new table (WORLD_CLASS_PLAN section 17 row 5, "most opened this month"):
`Entry.access_count` is all time, so "this month" needed a row per note per
day. `create_all` builds it on a fresh database; this builds it on one Alembic
already stamped, and leaves it alone when a startup's `create_all` got there
first.

Revision ID: c2f8a6d4e9b1
Revises: b7e3d1a9c5f2
Create Date: 2026-10-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for why
# __all__ names them.
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "c2f8a6d4e9b1"
down_revision: Union[str, Sequence[str], None] = "b7e3d1a9c5f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(name)


def upgrade() -> None:
    """Upgrade schema."""
    if _has_table("entry_opens"):
        return
    op.create_table(
        "entry_opens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entry_id", sa.Integer(), sa.ForeignKey("entries.id"), nullable=False),
        sa.Column("day", sa.String(length=10), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.UniqueConstraint("entry_id", "day", name="uq_entry_opens_entry_day"),
    )
    op.create_index("ix_entry_opens_entry_id", "entry_opens", ["entry_id"])
    op.create_index("ix_entry_opens_day", "entry_opens", ["day"])


def downgrade() -> None:
    """Downgrade schema."""
    if _has_table("entry_opens"):
        op.drop_index("ix_entry_opens_day", table_name="entry_opens")
        op.drop_index("ix_entry_opens_entry_id", table_name="entry_opens")
        op.drop_table("entry_opens")
