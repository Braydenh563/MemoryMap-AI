# Brief 7, the event log (WORLD_CLASS_PLAN B1): what is left

> Companions: [HISTORY.md](../HISTORY.md) ("From WORLD_CLASS_PLAN.md B1 and
> SESSION_BRIEFS Brief 7", and "The event log's open items" for the second
> run) · [SESSION_BRIEFS.md](../SESSION_BRIEFS.md) Brief 7 · the spec,
> `tests/test_events.py`

Built in the first run: `AuditLog.actor` and `AuditLog.payload` with an
Alembic migration, `src/memorymap/core/events.py`, every public write in
`src/memorymap/entry/manager.py` recording exactly one event, `GET
/entries/{id}/history`, `POST /entries/{id}/restore/{event_id}`, `GET
/events?since=`, and the History sheet.

Built in the second run, and moved to HISTORY.md ("The event log's open
items"): compaction with its startup job (item 1), the
`(entity_type, entity_id, id DESC)` index (item 2), the whiteboard's writes
(item 3) and the History sheet's paging (item 6).

## Decisions made (do not remake)

1. **Retention is compaction, and the policy is ninety days with the newest
   five kept.** Deletion would break replay. A run of events older than
   ninety days folds into one snapshot holding the whole state at that
   point; the rows behind it keep action, actor, detail and time and lose
   only their values. Five newest kept rather than twenty because
   `EntryRevision` already keeps the last twenty versions of every note for
   ever, so twenty here was a second copy of the same thing and collapsed
   nothing on an ordinary notebook.
2. **What compaction gives up, it says.** Restoring a version whose values
   are gone answers 410 with the reason; the History sheet renders "The text
   from this change is no longer kept." in that row.
3. **No `VACUUM` in the compaction pass.** The freed pages are reused
   immediately, so the file stops growing, and `ai/autonomous.py`'s
   `_vacuum` already returns them to the disk on its own schedule.
4. **A board's replayable entity is the item, not the board.** A note is one
   row and replays to one dict; a board is a note plus everything on it. So
   `whiteboard_node`, `whiteboard_sketch` and `whiteboard_object` each
   replay through `events.replay`, the board's own events (created,
   duplicated, generated, imported, settings changed) sit on `board`, and a
   board's whole state is the union of its items' replays.
5. **`rename_board` is not wrapped in a write scope.** Its title change goes
   through `manager.update_entry`; a scope would fold that note's own edit
   into the board's event and take it out of the note's history. The board's
   settings get their own event beside the note's, so that request records
   two events on two entities, by design.
6. **The index lives in `_INDEXES` and in a migration.** The startup path is
   what reaches an existing notebook; the migration is what reaches a
   database upgraded through Alembic alone. Both use IF NOT EXISTS, so they
   cannot disagree.

## Open, with the file and the next step

1. **Global undo of an AI action.** `file: src/memorymap/core/events.py`,
   `id: events-undo`. `replay` and `restore` cover one note. "Undo
   auto-filing" means selecting the events of one actor in one window and
   applying each `before` in reverse. **Next step:** `events.undo(session,
   actor, since_id)` plus the Settings surface that offers it; Brief 13
   expects it for a skill run's Undo. Note compaction now exists, so `undo`
   has to refuse an event whose values are gone (`events.is_compacted`)
   rather than applying an empty `before`.
2. **The Timeline and Dashboard strips.** `file: frontend/dashboard.js`,
   `id: events-strip`. `GET /events?since=` exists and nothing reads it yet.
   The "Recently added" widget was deliberately left alone (it re-reads a
   list the dashboard has already loaded, and events would list notes that
   no longer exist). **Next step:** an activity strip that polls `/events`
   with the cursor, rendering actor and action. The whiteboard's writes are
   in the feed now, so a board's activity would appear there too.
3. **Sync (B6) as log shipping.** `id: events-sync`. Unstarted, and
   deliberately: it needs the retention rule, which now exists, so this is
   no longer blocked. A compacted snapshot ships as a snapshot.
4. **The whiteboard's remaining writes are its routes, not its tools.**
   `file: src/memorymap/ai/tools/whiteboard.py`, `id: events-wb-tools`. The
   AI's own board tools call `manager.log_action` with a detail and no
   payload, so a board the AI built is in the log but does not replay the
   way one built by hand now does. **Next step:** the same
   `@events.writes` treatment, reusing `_node_state`/`_object_state` from
   `routes_whiteboard.py` (they would have to move somewhere both can
   import, which is the only reason this was not done with item 3).

## Not verified

- No pre-Brief-7 database was upgraded. Both migrations are exercised by the
  suite and written to be idempotent against `_add_missing_columns()`; a
  real year-old file was not opened.
- Nothing about a real model driving the tool path: the actor threading is
  verified against `execute_tool` directly (`tests/test_events.py`), and
  every provider test in this project runs against a fake transport.
- Compaction's numbers come from a database this sandbox built (150 notes,
  40 edits each) and from one real running app's own notebook, not from a
  notebook anybody has used for a year.
- The startup job's own log line was not seen in a server log: the app's
  INFO lines do not reach uvicorn's stream. What was measured is its effect
  (one notebook's payloads went from 24,975 to 5,844 bytes across a
  restart, with its 247 rows untouched).
