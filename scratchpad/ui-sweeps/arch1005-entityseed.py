"""Seed two entities named in three notes, for arch1005-entitymerge.js.

    PYTHONPATH=src .venv/bin/python scratchpad/ui-sweeps/arch1005-entityseed.py /tmp/mm-arch1005
"""

import sys
from pathlib import Path

from memorymap.core import deps
from memorymap.core.database import Entity, EntityMention
from memorymap.entry import manager

data = Path(sys.argv[1])
deps.init_app_state(data_dir=data)
with deps.get_db().session() as session:
    notes = [manager.create_entry(session, content=f"Met Sam about the launch, note {i}") for i in range(3)]
    keep = Entity(name="Sam Lee", kind="person")
    gone = Entity(name="Sammy")
    session.add_all([keep, gone])
    session.flush()
    session.add_all(
        [
            EntityMention(entity_id=keep.id, entry_id=notes[0].id),
            EntityMention(entity_id=gone.id, entry_id=notes[1].id),
            EntityMention(entity_id=gone.id, entry_id=notes[2].id),
        ]
    )
    session.commit()
    print("seeded", keep.id, gone.id)
