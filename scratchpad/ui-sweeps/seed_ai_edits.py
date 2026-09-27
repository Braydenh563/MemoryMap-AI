"""Seed a scratch notebook with changes made by an AI actor, for activityundo.js.

    PYTHONPATH=src MEMORYMAP_DATA_DIR=<the server's data dir> python scratchpad/ui-sweeps/seed_ai_edits.py

Goes through the real write path (`manager.update_entry` inside
`events.acting_as`), so the events are the ones the app itself would write
when a skill re-files and re-tags notes. Three notes are made by the person,
then `ai:tidy_up` moves two of them and re-tags one.
"""

from memorymap.core import deps, events
from memorymap.entry import manager

deps.init_app_state()
session = deps.get_db().session()
try:
    made = [
        manager.create_entry(session, text, category_name="Garden", tags=["garden"])
        for text in (
            "Repot the fig before it gets root bound",
            "The pond pump hums at night, check the impeller",
            "Sow the broad beans in October",
        )
    ]
    session.commit()
    with events.acting_as("ai:tidy_up"):
        manager.update_entry(session, made[0], category_name="Houseplants", tags=["plants", "repotting"])
        manager.update_entry(session, made[1], category_name="Maintenance")
    session.commit()
    print("seeded", [entry.id for entry in made])
finally:
    session.close()
