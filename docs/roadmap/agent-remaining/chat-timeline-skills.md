# Chat Phase 3, Timeline Phase 4, Skills Phase D: what is left

Written 2026-09-13 by the agent that built all three. Each phase's gate is
green and its Built block is in `HISTORY.md` ("Moved from the plans,
2026-09-13"); the sweeps are `scratchpad/ui-sweeps/chatphase3.js` and
`scratchpad/ui-sweeps/timelinekinds.js`, and the transport half is
`tests/test_ask_answer_object.py`, `tests/test_timeline.py` and
`tests/test_skills.py`.

## 1. Left open, with the file and the next step

1. **CHAT_PLAN Phase 1: the span is in, the highlight is not.** Half of
   decision 2 is built (2026-09-13): `grounding.best_passage` scores a
   sentence against each of a note's own overlapping 40-word passages with
   BM25, document frequency counted within the note (which is what makes it
   able to choose between three paragraphs that all say "starter"), with a
   bonus for a passage holding a figure the sentence quotes; every grounding
   row now carries `start`, `end` and `score` in character offsets, which is
   the shape `answerObject` already reads. Four tests in
   `tests/test_grounding.py`; 26 tests there and in `test_inline_citations.py`
   green, 32 in `test_chat_api.py` and `test_ask_answer_object.py`.
   **What is deliberately not done**: BM25 does not choose *which note*
   grounds a sentence, only where inside it. Decision 2 asks for that too, at
   "a threshold calibrated on the eval fixtures (Brief 12)", and those
   fixtures do not exist; changing what counts as supported without them would
   be a judgement dressed as a measurement. Next steps, in order: the ten-
   question fixture set, then the threshold, then the renderer (hover
   highlights `note.content.slice(start, end)`, about ten lines, in
   `frontend/app.js` which four agents were editing today).

2. **Ask's answer object was measured on the offline branch only.** The sweep
   runs against a server with no model, so `sentences` was empty in every
   measurement and the grounding chips and inline marks under an Ask answer
   were not re-measured (they are Phase 1's gate and predate this work). Next
   step: anyone with a local model should run `chatphase3.js` again and add a
   line for the sentence count and the mark count.

3. **The follow-up chips were stubbed at the route** in the sweep, because
   `/chat/followups` answers `[]` with no model. What is measured is the
   request a chip causes, not the model's choice of question. Nothing to fix;
   worth knowing before reading the sweep as proof of the whole feature.

4. **`chatSourcesPanel` is shared, the renderer is not.** Decision 3 says "the
   renderer is one function" for Chat, Ask and the agent. What was built is one
   *object* and three shared components; the Chat tab still assembles its own
   bubble and the popup agent still has `cmdPaletteResultRow`. Next step, if it
   is worth it: move the Chat bubble's foot onto `renderAskAnswerFoot` (renamed)
   and delete the palette's own result row. Not obviously worth it: the three
   surfaces have genuinely different frames around the same three components.

5. **TIMELINE: the paging sweep was not re-run against the merge.** **Done**
   (2026-09-13), and with more than the document and the reminder this line
   asked for: one document is never in the same page twice, so it cannot
   exercise a mark that has to advance. `scratchpad/ui-sweeps/seed-timeline-mixed.py`
   adds 600 documents, 600 reminders and 40 boards beside the bulk script's
   2,000 notes, and `scratchpad/ui-sweeps/timelinepagingmix.js` pages the whole
   3,240-row notebook to exhaustion: 11 requests, 3,240 distinct keys, 0
   missing against the four single-kind feeds paged separately, 0 invented, 0
   ordering inversions across page boundaries, and 1,800 rows drawn over five
   scrolls in the view with no key twice. `timelinepaging.js` re-run on the
   same notebook: worst frame 67ms over 262 frames, 0px horizontal scroll.

6. **TIMELINE: a board row was not exercised in a browser.** **Done**
   (2026-09-13): `timelinepagingmix.js` asserts a rendered `data-kind="board"`
   row and prints its title ("Map 32", 40 boards in the feed). Worth knowing
   for the next fixture: a board's `Entry.content` is `# <name>` and nothing
   else (`routes_whiteboard.py`), so a seed that puts the board's JSON there
   makes the feed's preview read as `{"title": ...` and looks like a product
   bug. The first run of this sweep did exactly that.

7. **TIMELINE: the "auto" scale counts all four kinds as one number.**
   **Decided and done** (2026-09-13). Neither of the two options this line
   offered: counting the loaded rows re-cuts every header when the second page
   arrives (the reason the old comment gives), and counting everything in range
   is the bug. What auto is really choosing is how many headers the feed will
   draw, and with day buckets that is the number of days with something on
   them, so that is what it counts now, from the density strip, with the old
   thresholds re-based (under 60 days keeps the feed under 60 headers; 400 days
   in week buckets is about 57). Measured in
   `scratchpad/ui-sweeps/timelineauto.js`: a week of writing with 180 reminders
   due in it reads as 7 active days and keeps day buckets, where the old rule
   read 188 rows and chose week; the 3,240-row notebook still reads 989 active
   days and month, 365 days reads 367 and week, 90 days reads 97 and week. The
   count line under the dock said "188 notes" for a feed of reminders and says
   "188 items" now.

8. **WORLD_CLASS D6: the backend is built (2026-09-13 evening), the frontend
   is not.** `GET /entries/daily/{date}` creates or returns, and
   `GET /entries/daily?through=&days=` gives the calendar strip its days and
   the streak (`tests/test_daily_journal.py`). Next step, all frontend:
   `startTodaysNote` in `frontend/app.js` should call
   `/entries/daily/${key}` instead of posting a new note, which fixes the
   duplicate it makes today; then `Ctrl+D` on that, then the strip and the
   yesterday/tomorrow pair.

9. **SKILLS Phase D: no model ran any of it.** The fake transport answers every
   step, so "a rewritten step fixes a run a 3B model stalled on" is the claim
   the mechanism is for and not one the tests make. The chat control (Edit step
   N, beside Resume) is asserted statically against `app.js` because reaching it
   needs a run that stops, which needs a model. Next step: the dev-only
   llama.cpp script (WORLD_CLASS_PLAN 9) is what would close this and three
   other "not verified" notes on this branch.

## 2. Found, not fixed

- **A commit from another worktree reverted work from this one three times
  today** (the twelve starters, the link card twice, the Phase 3 plan edits and
  the Phase 3 history block), each time silently, each time recovered because
  the files on disk were whole. The mechanism: `git read-tree HEAD` freezes
  every path in an index at that moment, and a later commit made from that
  index writes the frozen version of every path the committer did not re-add.
  The shared-worktree protocol in the briefs asks each agent to do exactly that
  `read-tree`. Next step for whoever owns the protocol: commit with explicit
  paths (`git commit -- <paths>`) or re-read the tree immediately before each
  commit, and check `git show HEAD:<file> | grep` for your own markers after
  every push. This is the third occurrence on the branch (see `09d19ee` and
  `460a692`).

- **A failing test inside a `/chat/stream` skill run logs
  `ValueError: <Token …> was created in a different Context`** from
  `ai/budget.py`'s `spending` context manager, on the way out of a generator
  closed during teardown. It is noise on an already-failing test rather than a
  fault of its own, and it did not appear on any passing run, but it will
  mislead the next person who reads a red log. **Fixed** (2026-09-13):
  reproduced in three lines in `tests/test_harness_verifier.py`
  (`test_a_scope_closed_in_another_context_does_not_raise`: advance the
  generator inside `contextvars.copy_context()`, close it outside), and
  `spending`'s `finally` now catches the `ValueError` and clears the variable
  in whichever context is running it. 34 tests in
  `test_harness_verifier.py` and `test_harness_verifier_spec.py` green.

- **`/timeline`'s response still calls its row list `notes`** while it holds
  documents and reminders. **Fixed** (2026-09-13): the list is `rows` now, with
  `notes` carrying the same list until the release after 0.3.0, because the one
  caller that can be older than the server is the app's own cached `app.js`
  (the desktop window keeps a profile for days, CLAUDE.md section 5). The
  duplicate was measured rather than waved through: a full 300-row page against
  a 3,240-row notebook is 263,828 bytes of JSON with both keys against 140,096
  with one, 22,278 against 13,764 gzipped on the wire. The view reads `rows`
  (`frontend/app.js`, `renderTimeline` and `timelineLoadMore`) and drew 1,800
  rows over five pages in `timelinepagingmix.js`.
