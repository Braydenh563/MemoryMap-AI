# Remaining: the open-items pass (backend, graph, timeline, settings, docs)

Agent: open items, 2026-09-23, worktree `agent-a4caec8ceb7f85793`, branch
cut from `fix/gemini-fixes-5`, port 8801, data `/tmp/mm-agentO`. Not pushed.
Out of scope (two other agents own them now): whiteboard, mind map, Library,
the documents editor UI, the notes list, the chat UI polish.

## Triage, measured before building (2026-09-23)

Stale, closed with evidence in OPEN.md or INBOX:

- OPEN Backend "Reminders tab reads one page": `loadReminders` and
  `clearDoneReminders` read `apiPagedList("/reminders", 200)` (app.js 26444,
  26691), the palette too (33443), the dashboard too (dashboard.js 401).
- OPEN Backend "Other first-page-only callers": capture documents and the
  attach picker (app.js 11941, 12157) and `notePickerRows` (20451) all page.
- OPEN Settings "I9's frontend is not built": settings.js 4117 onward is it.
- OPEN Settings "INBOX 235" and "INBOX 237": Advanced response settings sits
  above Installed models (index.html 7398 vs 7425); `PERSONA_ALIASES`
  maps Librarian to Atlas (librarian.py 120).

Genuinely open and mine, in build order (impact first):

1. INBOX 277: Settings, Models shows what each role resolves to.
2. `filing_state = "auto"` on the recategorise and re-evaluate paths.
3. A bulk write leaves the search index stale (`touch` has no caller).
4. `has:image`, `has:link`, `has:reminder` match nothing.
5. FTS reindex as a job, with `/search/stats` counts.
6. CHAT_PLAN Phase 1 tail: a remembered turn loses its support notice.
7. The dashboard activity strip over `GET /events` (B1).
8. `POST /learned/bulk` and the table's bulk actions.
9. The vector matrix's dead rows (compaction, counted).
10. Settings, Extras scrolls sideways by 4px at 820.
11. D6: `Ctrl+D` (collides with the board's duplicate; needs a decision).

Recorded for the orchestrator (inside another agent's surface): INBOX 312,
317 (whiteboard and mind map), 319 (notes connections row), the board card's
Phase 8c, the templates preview, outline row height.

## Log

- done 22dbe4b: 1 (INBOX 277), `oi-utilitynote.js` 6 of 6; also the
  routing switch that read unchecked on Models.
- done b67b068: 2, the two re-filing paths set `auto`.
- done 6ece5af: 3, `search_index.forget` on the purge and space-delete
  paths, plus the lint.
- done (this commit): 4, `has:image`, `has:link`, `has:reminder`.
- next: 5, FTS reindex as a job (search/index.py `rebuild`, /search/stats).
