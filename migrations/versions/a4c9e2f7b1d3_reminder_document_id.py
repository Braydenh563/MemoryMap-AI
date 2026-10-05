"""reminders: document_id, a reminder about a document

Additive only (WORLD_CLASS_PLAN 1.3, section 8 row 15). A board or a map is an
`Entry`, so `entry_id` already points at those; a document is its own table.
Null on every existing row, which is what each of them is: about a note, or
about nothing.

Revision ID: a4c9e2f7b1d3
Revises: f3c7a9e1d5b8
Create Date: 2026-10-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for why
# __all__ names them.
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "a4c9e2f7b1d3"
down_revision: Union[str, Sequence[str], None] = "f3c7a9e1d5b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    """`_add_missing_columns()` in `core/database.py` runs ahead of Alembic on
    every startup, so the column is usually there already; a plain
    `add_column` would then fail with "duplicate column name"."""
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("reminders")')}


def upgrade() -> None:
    """Upgrade schema."""
    existing = _existing_columns()
    with op.batch_alter_table("reminders", schema=None) as batch_op:
        if "document_id" not in existing:
            batch_op.add_column(sa.Column("document_id", sa.Integer(), nullable=True))
    op.execute("CREATE INDEX IF NOT EXISTS ix_reminders_document_id ON reminders (document_id)")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS ix_reminders_document_id")
    existing = _existing_columns()
    with op.batch_alter_table("reminders", schema=None) as batch_op:
        if "document_id" in existing:
            batch_op.drop_column("document_id")
