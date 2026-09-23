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
- done 2d013e1: 4, `has:image`, `has:link`, `has:reminder`.
- done 9e0ff43: 5, the keyword index rebuilt by the re-index job.
- done 3129aa8: 6, support on both replay paths, CHAT_PLAN Phase 1
  moved to HISTORY; `oi-replaysupport.js` 3 of 3.
- done 513324c: 7, the Recent activity widget; `oi-activity.js` 6 of 6.
- done 5f2e0ca: 8, `POST /learned/bulk` plus the selection bar;
  `oi-learnedbulk.js` 7 of 7.
- done 47d34a3: 9, dead matrix rows skipped and compacted (and the -1
  answer they could produce).
- done 61c613d: GRAPH_PLAN's open line, the lasso selection drags as
  one; `oi-groupdrag.js` 1 finding before, 0 after.
- done (this commit): the stale-row pass. OPEN.md: the GRAPH_PLAN row in
  section B, Reminders paging, first-page callers, INBOX 235 and 237, I9's
  Settings section, Settings Extras at 820 (not reproduced), the D6 row
  re-read. INBOX: 269 and both 271s resolved to HISTORY; 266, 268, 270 and
  272 annotated with which parts are built and which are left.
- done c8c4296: the stale-row pass.
- done f3f8dd7: INBOX 266 (5) measured (104MB before the embedding
  model, 774MB after; no heavy import at startup) and said in Settings.
- done (this commit): 11, INBOX 321 decided and built, `Ctrl+D` opens or
  starts today's page; `oi-ctrld.js` 3 of 3.
- measured: the tour (`tour.js`) 339 checks ok; its 7 failures are exactly
  the doors `TOUR_ENABLED = false` closes, so what the owner calls broken is
  not something the sweep sees (INBOX 272 annotated).
- done (this commit): H7's boot duplicates, `/chat/recent` and
  `/entries/most-accessed` asked twice at every start (6 boot requests to 4,
  `oi-dupfetch.js`), and the reminder alert's one page read open reminders.
- next: the Settings fold summary at 390 (`help-popovers.js`, new: 81
  popovers, 1 finding, the skill tools '?' unreachable).
