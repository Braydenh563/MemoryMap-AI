"""relation_types, and entry_links.props (GRAPH_PLAN KG3)

Additive only: a new table (custom link types with an inverse name) and a
nullable JSON column on links. No existing row changes.

Revision ID: c3f7a9e2d5b8
Revises: b8e4f2a6c9d1
Create Date: 2026-10-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for the
# __all__ (read by attribute name, never imported).
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "c3f7a9e2d5b8"
down_revision: Union[str, Sequence[str], None] = "b8e4f2a6c9d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tables() -> set:
    bind = op.get_bind()
    return {row[0] for row in bind.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'")}


def _link_columns() -> set:
    """`_add_missing_columns()` runs first on every startup, so `props` is
    usually already there, and `create_all()` has usually made the table."""
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("entry_links")')}


def upgrade() -> None:
    """Upgrade schema."""
    if "relation_types" not in _tables():
        op.create_table(
            "relation_types",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("key", sa.String(length=24), nullable=False, unique=True),
            sa.Column("name", sa.String(length=60), nullable=False),
            sa.Column("inverse", sa.String(length=60), nullable=True),
            sa.Column("directed", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("colour", sa.String(length=16), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
    if "props" not in _link_columns():
        with op.batch_alter_table("entry_links", schema=None) as batch_op:
            batch_op.add_column(sa.Column("props", sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    if "props" in _link_columns():
        with op.batch_alter_table("entry_links", schema=None) as batch_op:
            batch_op.drop_column("props")
    if "relation_types" in _tables():
        op.drop_table("relation_types")
