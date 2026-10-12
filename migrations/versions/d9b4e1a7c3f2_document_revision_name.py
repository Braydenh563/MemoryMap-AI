"""document_revisions: name, a named version

Additive only (DOCUMENTS_PLAN 24 row 4). Null on every existing row, which is
what each of them is: an unnamed sitting.

Revision ID: d9b4e1a7c3f2
Revises: c8e2a4f6b1d3
Create Date: 2026-10-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for why
# __all__ names them.
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "d9b4e1a7c3f2"
down_revision: Union[str, Sequence[str], None] = "c8e2a4f6b1d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    """`_add_missing_columns()` in `core/database.py` runs ahead of Alembic on
    every startup, so the column is usually there already."""
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("document_revisions")')}


def upgrade() -> None:
    """Upgrade schema."""
    if "name" not in _existing_columns():
        with op.batch_alter_table("document_revisions", schema=None) as batch_op:
            batch_op.add_column(sa.Column("name", sa.String(length=120), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    if "name" in _existing_columns():
        with op.batch_alter_table("document_revisions", schema=None) as batch_op:
            batch_op.drop_column("name")
