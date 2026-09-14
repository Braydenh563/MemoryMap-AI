"""ask_turns: the answer's citations (INBOX 241)

Additive only. `AskTurn` already kept why each *result* matched
(`match_info`); this keeps why each *sentence* was written, so a turn
reopened from the history panel carries the same numbered references and
the same "grounded in" chips the live answer had.

Revision ID: d3b7c2a91e45
Revises: c7e4a1f60b58
Create Date: 2026-09-14

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
revision: str = "d3b7c2a91e45"
down_revision: Union[str, Sequence[str], None] = "c7e4a1f60b58"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set:
    """What `ask_turns` already has.

    Same guard, and for the same reason, as the audit-log migration's own:
    `_add_missing_columns()` in `core/database.py` runs on every startup
    ahead of the Alembic step, so on most databases this column is already
    there by the time this runs and a plain `add_column` would fail with
    "duplicate column name" and leave `alembic_version` stuck.
    """
    bind = op.get_bind()
    return {row[1] for row in bind.exec_driver_sql('PRAGMA table_info("ask_turns")')}


def upgrade() -> None:
    """Upgrade schema."""
    existing = _existing_columns()
    with op.batch_alter_table("ask_turns", schema=None) as batch_op:
        if "grounding" not in existing:
            # An empty list, not NULL: every reader json-decodes this, and a
            # turn saved before this column existed genuinely has no
            # citations rather than unknown ones.
            batch_op.add_column(
                sa.Column("grounding", sa.Text(), nullable=False, server_default="[]")
            )


def downgrade() -> None:
    """Downgrade schema."""
    existing = _existing_columns()
    with op.batch_alter_table("ask_turns", schema=None) as batch_op:
        if "grounding" in existing:
            batch_op.drop_column("grounding")
