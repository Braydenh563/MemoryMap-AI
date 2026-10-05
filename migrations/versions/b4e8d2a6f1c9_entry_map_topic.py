"""entries: map_topic, a note a map gesture made (audit 2026-10-05, UX-06)

Additive. A concept map's root and every card Tab or Enter added on a board is
a real note, and a forty-topic map put forty one-word rows at the top of Notes
and in Recently added. The flag lets those two lists leave them out.

The existing ones are marked by the shape the gesture leaves: a card placed on
a board within ten seconds of its note being written (the map gesture writes
the note and then the card in one go; a note dragged onto a board is placed
long after it was written), and short (a topic is a phrase, at most 200
characters). A note that fits by chance stays in every search and on its
board; it only leaves the two lists.

Revision ID: b4e8d2a6f1c9
Revises: a7d3e9c1f5b2
Create Date: 2026-10-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic. Read by attribute name by Alembic's
# ScriptDirectory (see the baseline migration on why `__all__` is here).
__all__ = ["revision", "down_revision", "branch_labels", "depends_on"]
revision: str = "b4e8d2a6f1c9"
down_revision: Union[str, Sequence[str], None] = "a7d3e9c1f5b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("entries")')}


def upgrade() -> None:
    """Upgrade schema."""
    existing = _existing_columns()
    if "map_topic" not in existing:
        with op.batch_alter_table("entries", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column("map_topic", sa.Boolean(), nullable=True, server_default=sa.false())
            )
    op.execute(
        "UPDATE entries SET map_topic = 1 WHERE COALESCE(is_board, 0) = 0 AND length(content) <= 200 "
        "AND id IN (SELECT n.entry_id FROM whiteboard_nodes n JOIN entries e ON e.id = n.entry_id "
        "WHERE (julianday(n.created_at) - julianday(e.created_at)) * 86400 BETWEEN 0 AND 10)"
    )


def downgrade() -> None:
    """Downgrade schema."""
    if "map_topic" in _existing_columns():
        with op.batch_alter_table("entries", schema=None) as batch_op:
            batch_op.drop_column("map_topic")
