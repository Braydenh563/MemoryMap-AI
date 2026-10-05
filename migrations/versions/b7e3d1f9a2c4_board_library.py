"""board_libraries, board_library_items, board_library_marks; whiteboard_nodes.hidden

The board's object library (WHITEBOARD_PLAN decisions 25 and 27). Additive
only: three new tables and one column. `hidden` is False on every existing
card: nothing was hidden before the Layers tab existed.

Revision ID: b7e3d1f9a2c4
Revises: f3c7a9e1d5b8
Create Date: 2026-10-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. See the baseline migration for the
# __all__ (read by attribute name, never imported).
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "b7e3d1f9a2c4"
down_revision: Union[str, Sequence[str], None] = "f3c7a9e1d5b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tables() -> set:
    """`create_all()` runs first on every startup and usually made them."""
    bind = op.get_bind()
    return {row[0] for row in bind.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'")}


def _card_columns() -> set:
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("whiteboard_nodes")')}


def upgrade() -> None:
    """Upgrade schema."""
    have = _tables()
    if "board_libraries" not in have:
        op.create_table(
            "board_libraries",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=80), nullable=False),
            sa.Column("kind", sa.String(length=12), nullable=False),
            sa.Column("sort", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
    if "board_library_items" not in have:
        op.create_table(
            "board_library_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("library_id", sa.Integer(), sa.ForeignKey("board_libraries.id"), nullable=False, index=True),
            sa.Column("kind", sa.String(length=12), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("tags", sa.JSON(), nullable=True),
            sa.Column("payload", sa.JSON(), nullable=True),
            sa.Column("favourite", sa.Boolean(), nullable=False),
            sa.Column("use_count", sa.Integer(), nullable=False),
            sa.Column("last_used_at", sa.DateTime(), nullable=True),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.Column("deleted_at", sa.DateTime(), nullable=True, index=True),
        )
    if "board_library_marks" not in have:
        op.create_table(
            "board_library_marks",
            sa.Column("key", sa.String(length=120), primary_key=True),
            sa.Column("favourite", sa.Boolean(), nullable=False),
            sa.Column("use_count", sa.Integer(), nullable=False),
            sa.Column("last_used_at", sa.DateTime(), nullable=True),
        )
    if "hidden" not in _card_columns():
        with op.batch_alter_table("whiteboard_nodes", schema=None) as batch_op:
            batch_op.add_column(sa.Column("hidden", sa.Boolean(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    have = _tables()
    for table in ("board_library_marks", "board_library_items", "board_libraries"):
        if table in have:
            op.drop_table(table)
    if "hidden" in _card_columns():
        with op.batch_alter_table("whiteboard_nodes", schema=None) as batch_op:
            batch_op.drop_column("hidden")
