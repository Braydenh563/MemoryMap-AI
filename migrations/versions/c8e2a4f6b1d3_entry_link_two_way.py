"""entry_links: two_way, a link that runs both ways (INBOX 693)

Additive only. Null on every existing row: such a link defers to its type's
direction, and an untyped one stays one way, as it has always been drawn.

Revision ID: c8e2a4f6b1d3
Revises: d7a3f1c9e2b5
Create Date: 2026-10-06

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]

# revision identifiers, used by Alembic.
revision: str = "c8e2a4f6b1d3"
down_revision: Union[str, Sequence[str], None] = "d7a3f1c9e2b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    """What `entry_links` has: `_add_missing_columns()` in core/database.py
    runs first on every startup, so the column is usually already there."""
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("entry_links")')}


def upgrade() -> None:
    """Upgrade schema."""
    if "two_way" not in _existing_columns():
        with op.batch_alter_table("entry_links", schema=None) as batch_op:
            batch_op.add_column(sa.Column("two_way", sa.Boolean(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    if "two_way" in _existing_columns():
        with op.batch_alter_table("entry_links", schema=None) as batch_op:
            batch_op.drop_column("two_way")
