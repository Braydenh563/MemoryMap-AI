# Timeline, Brief 25: what is built and what is left

**Agent: Opus, 2026-09-13.** TIMELINE_PLAN.md Phases 1, 2 and 3 are built,
gated and in HISTORY.md ("Moved from the plans, 2026-09-13"). Phase 4 is the
only phase left, and the plan's section 7 has two measurements still owed.

Back to [../ROADMAP.md](../ROADMAP.md).

## Built (do not rebuild any of it, read it first)

| Phase | Where it lives | Its gate |
| --- | --- | --- |
| 1, the row model and the feed | `timelineRow`, `paintTimeline`, `paintTimelineFeed`, `timelineRowElement`, `toggleTimelineRow` in `frontend/app.js`; `.timeline-feed`/`.timeline-bucket`/`.timeline-row` in `frontend/css/06-timeline-dialogs.css`; `#timeline-feed` in `index.html` | `scratchpad/ui-sweeps/timeline.js` |
| 2, the table | `paintTimelineTable`, `timelineTableRow`, `timelineSortedRows`, `TIMELINE_COLUMNS`; `#timeline-table` in `index.html`; `space`/`words`/`links` in `src/memorymap/api/routes_timeline.py` | `scratchpad/ui-sweeps/timelinetable.js` |
| 3, paging and the strip | `timelineLoadMore`, `appendTimelineRows`, `drawTimelineScrubber`, `drawTimelineWindow`, `timelineScrubTo`; `limit`/`cursor`/`density` in the route; `#timeline-scrubber` in `index.html` | `scratchpad/ui-sweeps/timelinepaging.js`, with `scratchpad/ui-sweeps/seed-timeline-bulk.py` |
| INBOX 146 (the owner, on the built feed) | the same CSS file: the opened row's inset and `.timeline-row-detail`'s column | `scratchpad/ui-sweeps/timelineexpand.js` |

Every one of those sweeps exits non-zero on a failure, so they can gate a
commit rather than be read. Serve a seeded data dir first
(`serve.sh 8936 /tmp/mm-timeline`, `seed-timeline.js` then `seed-timeline.py`;
for the paging sweep, `seed-timeline-bulk.py` into its own dir).

## Left: Phase 4, kinds and the journal

**The shape of the work, in order.** The feed already has a `kind` on every row
(`timelineRow` sets `note` or `board`, and the marker glyph and the table's
Kind column read it), so the frontend half is smaller than it looks. What is
missing is the other three kinds arriving from the endpoint at all.

1. **`/timeline` returns documents and reminders as well as entries**
   (`src/memorymap/api/routes_timeline.py`). Today it selects `Entry` only.
   Documents and reminders are their own tables, so this is a merge of three
   date-ordered streams rather than a join: take `limit` rows from each,
   ordered by their own date descending, merge in Python, keep the first
   `limit`. The cursor already encodes `created_at|id` (base64url,
   `_encode_cursor`); it needs the kind as a third field so each source can be
   filtered by the same place in the order. Timestamps carry microseconds, so a
   tie across two tables is a case to comment on rather than to engineer
   around. `density` (`_density`) has to count the same three sources or the
   strip stops matching the feed.
2. **`kind=note|document|board|reminder` on the endpoint** (decision 9), as a
   repeatable filter, and a test per kind in `tests/test_timeline.py`.
3. **The chips in the dock.** The dock is at its seven-control ceiling, so the
   kinds belong in the Options menu beside `#timeline-band` (the same
   `.dock-menu-section` shape), not in the row. `timelineVisibleRows()` is
   where a kind filter applies, next to the band filter; `syncTimelineFilterChip`
   is the "a filter is on" affordance in the find zone and should say the kind
   too.
4. **Kind markers.** `timelineRowElement` picks the glyph: `ph-note`,
   `ph-tree-structure` (a map), and for the two new kinds `ph-file-text` and
   `ph-bell`. `.timeline-row[data-kind]` in the CSS is where the colour is, and
   decision 10 stands: tokens only, no per-kind hue invented here (the app has
   no category colour tokens, which is why the marker differs by glyph today).
5. **The daily note** (WORLD_CLASS_PLAN D6). A day bucket whose date has no
   daily note gets a "Today" action on its header: `timelineBucketLabel` and
   the header build in `paintTimelineFeed` are the two places to touch. Check
   what a daily note *is* in this app before building anything: grep
   `daily` in `app.js` and `src/memorymap/`.

**Gate for Phase 4** (write it as `scratchpad/ui-sweeps/timelinekinds.js`):
seed one of each kind, then at 1440 and 390, every kind appears with its own
marker, each `kind=` chip reduces the feed to that kind and the count line says
so, and the daily-note action appears only on a day that has none.

## The two measurements section 7 still owes

- **The strip's threshold.** It hides under 200 notes in range, chosen by
  measuring the 48-note seed (forty slots, each one note tall, saying nothing
  the headers do not). That is a floor found on a fixture, not on a real
  notebook; the plan asks for it to be tuned on one.
- **The table at 820.** The plan asks for the column set to be measured on a
  tablet. `timelinetable.js` measures 1440 and 390 only; the wide columns hide
  below 600px, so 820 shows all eight. Nobody has looked at whether eight
  columns at 820 are readable or merely present.

## Two things found and not fixed, both someone else's file

- `frontend/css/02-chat-graph.css` uses `var(--graph-hover-scale, 1.4)` and
  nothing declares the token, so `tests/test_style_scale.py::
  test_no_token_is_used_with_a_dead_fallback` fails on the working tree. It was
  another agent's uncommitted edit at the time.
- `INBOX.md` carries items marked **Fixed** that have not moved to HISTORY, so
  `tests/test_plan_hygiene.py::test_inbox_holds_open_reports_only` fails. INBOX
  is the orchestrator's file; 146 (this session's, fixed and measured) is one
  of the entries waiting for that pass.
