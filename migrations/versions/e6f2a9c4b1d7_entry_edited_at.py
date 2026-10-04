"""entries: edited_at, when a person last changed what a note says

Additive only. `Entry.updated_at` moves on every write, an open included
(it bumps `access_count`), so it cannot sort a list by "recently edited".
This column moves only on a per-note edit of the text, tags or category;
see the column's own comment in `core/database.py`. Null on every existing
row, which is the honest answer: nothing recorded when those were edited.

Revision ID: e6f2a9c4b1d7
Revises: d3b7c2a91e45
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
revision: str = "e6f2a9c4b1d7"
down_revision: Union[str, Sequence[str], None] = "d3b7c2a91e45"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    """What `entries` already has.

    Same guard, for the same reason, as the ask-turn grounding migration's:
    `_add_missing_columns()` in `core/database.py` runs on every startup
    ahead of the Alembic step, so on most databases the column is already
    there by the time this runs, and a plain `add_column` would fail with
    "duplicate column name" and leave `alembic_version` stuck.
    """
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("entries")')}


def upgrade() -> None:
    """Upgrade schema."""
    existing = _existing_columns()
    with op.batch_alter_table("entries", schema=None) as batch_op:
        if "edited_at" not in existing:
            batch_op.add_column(sa.Column("edited_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    existing = _existing_columns()
    with op.batch_alter_table("entries", schema=None) as batch_op:
        if "edited_at" in existing:
            batch_op.drop_column("edited_at")
