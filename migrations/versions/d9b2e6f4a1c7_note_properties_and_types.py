"""entry_properties and note_types (GRAPH_PLAN KG4)

Additive only: two new tables. The properties themselves live in each note's
text; `entry_properties` is an index rebuilt on save, so an upgraded notebook
fills it as notes are saved (and a reindex fills it at once).

Revision ID: d9b2e6f4a1c7
Revises: c3f7a9e2d5b8
Create Date: 2026-10-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for the
# __all__ (read by attribute name, never imported).
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "d9b2e6f4a1c7"
down_revision: Union[str, Sequence[str], None] = "c3f7a9e2d5b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tables() -> set:
    """`create_all()` runs first on every startup and usually made both."""
    bind = op.get_bind()
    return {row[0] for row in bind.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'")}


def upgrade() -> None:
    """Upgrade schema."""
    have = _tables()
    if "entry_properties" not in have:
        op.create_table(
            "entry_properties",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("entry_id", sa.Integer(), sa.ForeignKey("entries.id"), nullable=False, index=True),
            sa.Column("key", sa.String(length=60), nullable=False, index=True),
            sa.Column("value", sa.String(length=300), nullable=False),
            sa.Column("number", sa.Float(), nullable=True),
            sa.Column("date", sa.DateTime(), nullable=True),
        )
    if "note_types" not in have:
        op.create_table(
            "note_types",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=60), nullable=False, unique=True),
            sa.Column("icon", sa.String(length=30), nullable=True),
            sa.Column("colour", sa.String(length=16), nullable=True),
            sa.Column("fields", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )


def downgrade() -> None:
    """Downgrade schema."""
    have = _tables()
    if "note_types" in have:
        op.drop_table("note_types")
    if "entry_properties" in have:
        op.drop_table("entry_properties")
