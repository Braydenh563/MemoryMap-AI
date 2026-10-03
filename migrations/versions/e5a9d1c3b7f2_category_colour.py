"""categories: the colour a person chose (INBOX 441 (4))

Additive only. A nullable `colour` (a palette key or `#rrggbb`); NULL is
"automatic", which every existing category stays.

Revision ID: e5a9d1c3b7f2
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
revision: str = "e5a9d1c3b7f2"
down_revision: Union[str, Sequence[str], None] = "d3b7c2a91e45"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    """What `categories` already has.

    The same guard as the grounding migration's, for the same reason:
    `_add_missing_columns()` in `core/database.py` runs on every startup ahead
    of the Alembic step, so on most databases the column is already there and
    a plain `add_column` would fail with "duplicate column name" and leave
    `alembic_version` stuck.
    """
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("categories")')}


def upgrade() -> None:
    """Upgrade schema."""
    if "colour" not in _existing_columns():
        with op.batch_alter_table("categories", schema=None) as batch_op:
            batch_op.add_column(sa.Column("colour", sa.String(length=16), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    if "colour" in _existing_columns():
        with op.batch_alter_table("categories", schema=None) as batch_op:
            batch_op.drop_column("colour")
