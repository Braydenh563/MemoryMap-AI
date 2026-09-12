# Brief 7, the event log (WORLD_CLASS_PLAN B1): what is left

> Companions: [HISTORY.md](../HISTORY.md) ("From WORLD_CLASS_PLAN.md B1 and
> SESSION_BRIEFS Brief 7") · [SESSION_BRIEFS.md](../SESSION_BRIEFS.md)
> Brief 7 · the spec, `tests/test_events.py`

Built this session: `AuditLog.actor` and `AuditLog.payload` with an Alembic
migration, `src/memorymap/core/events.py` (record, the write scope, replay,
`exercise_for_test`), every public write in `src/memorymap/entry/manager.py`
recording exactly one event with whole-field values, `GET
/entries/{id}/history`, `POST /entries/{id}/restore/{event_id}`, `GET
/events?since=`, the actor threaded from tool calls and background jobs, and
the History sheet in `frontend/app.js`. All five strict-xfail markers in
`tests/test_events.py` removed; four tests added beside them.

## Open, with the file and the next step

1. **Retention.** `file: src/memorymap/core/database.py` (`AuditLog`),
   `id: events-retention`. A payload holds whole field values, so every edit
   of a note now stores that note's whole text twice (the event and the
   capped `EntryRevision`). Nothing trims `audit_log`; `DELETE /audit`
   clears one `entity_type` by hand. **Next step:** decide the rule (keep
   every event, but drop `payload` from events older than N days except the
   most recent per entity, which is what replay actually needs) and run it
   as a startup job beside `purge_expired_deleted`.
2. **An index for a note's own history.** `file:
   src/memorymap/core/database.py`, `id: events-index`. `events_for` filters
   on `entity_type` and `entity_id`, neither indexed, so opening the History
   sheet scans `audit_log`. Cheap on a small notebook, linear on a busy one.
   **Next step:** `index=True` on `AuditLog.entity_id` plus an Alembic
   migration (the additive startup path cannot add an index, so both halves
   are needed, the same way the `actor`/`payload` migration is written).
3. **The other managers.** `file:
   src/memorymap/api/routes_whiteboard.py`, `id: events-whiteboard`. B1's
   brief names the whiteboard manager, reminders, tags and settings as well
   as entries. They still write through `log_action` (so they have an actor
   and a row), but no payload and no write scope, so a board cannot be
   replayed or restored. **Next step:** wrap the whiteboard write helpers in
   `@events.writes(...)` with a node-state payload, and extend the spec's
   enumeration to that module, which is the half of the spec's own wording
   ("and `routes_whiteboard.py`'s manager") this session did not reach. Note
   another agent was editing that file the same session.
4. **Global undo of an AI action.** `file: src/memorymap/core/events.py`,
   `id: events-undo`. `replay` and `restore` cover one note. "Undo
   auto-filing" means selecting the events of one actor in one window and
   applying each `before` in reverse. **Next step:** `events.undo(session,
   actor, since_id)` plus the Settings surface that offers it; Brief 13
   expects it for a skill run's Undo.
5. **The Timeline and Dashboard strips.** `file: frontend/dashboard.js`,
   `id: events-strip`. `GET /events?since=` exists and nothing reads it yet.
   The "Recently added" widget was deliberately left alone (it re-reads a
   list the dashboard has already loaded, and events would list notes that
   no longer exist). **Next step:** an activity strip that polls `/events`
   with the cursor, rendering actor and action.
6. **The sheet stops at one page.** `file: frontend/app.js`
   (`openEntryHistory`), `id: events-history-page`. The route pages with
   `before` and returns `next_cursor`; the sheet reads the first fifty
   events and ignores the cursor, so a note edited more than fifty times
   shows its newest fifty with nothing saying there is more. **Next step:**
   a "load older" row at the bottom that re-requests with `before` and
   appends.
7. **Sync (B6) as log shipping.** `id: events-sync`. Unstarted, and
   deliberately: it needs the retention rule above to exist first.

## Not verified

- No pre-Brief-7 database was upgraded. The migration is exercised by the
  suite and is written to be idempotent against `_add_missing_columns()`;
  a real year-old file was not opened.
- Nothing about a real model driving the tool path: the actor threading is
  verified against `execute_tool` directly (`tests/test_events.py`), and
  every provider test in this project runs against a fake transport.
