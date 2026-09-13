# Chat Phase 3, Timeline Phase 4, Skills Phase D: what is left

Written 2026-09-13 by the agent that built all three. Each phase's gate is
green and its Built block is in `HISTORY.md` ("Moved from the plans,
2026-09-13"); the sweeps are `scratchpad/ui-sweeps/chatphase3.js` and
`scratchpad/ui-sweeps/timelinekinds.js`, and the transport half is
`tests/test_ask_answer_object.py`, `tests/test_timeline.py` and
`tests/test_skills.py`.

## 1. Left open, with the file and the next step

1. **CHAT_PLAN Phase 1 is still the gap under Phase 3.** The answer object
   (`answerObject`, `frontend/app.js`) has a `sentences` list whose marks carry
   `start`/`end` as `null`, because decision 2's passage scoring does not
   exist: `src/memorymap/ai/grounding.py` still scores a sentence against a
   whole note by bag of words and returns `{sentence, note_id}`. Next step:
   Phase 1 itself (BM25 over a 40-word window, the span on the mark), at which
   point hover-highlights-the-passage becomes a renderer change of about ten
   lines because the shape is already carried.

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

5. **TIMELINE: the paging sweep was not re-run against the merge.**
   `scratchpad/ui-sweeps/timelinepaging.js` (Phase 3's 2,048-note seed) proves
   the cursor at scale, and the new per-source cursor is proved only by
   `tests/test_timeline.py` at three rows. Next step: seed with
   `seed-timeline-bulk.py`, add a document and a reminder, and run it.

6. **TIMELINE: a board row was not exercised in a browser.** The sweep's
   notebook has no map, so `kind=board` is covered by
   `tests/test_timeline.py` and by the glyph table, not by a rendered row.
   Next step: `seed-boards.js` before `timelinekinds.js`.

7. **TIMELINE: the "auto" scale counts all four kinds as one number**
   (`timelineResolvedScale`). A notebook with hundreds of reminders will pick
   month buckets for a week of writing. Next step: decide whether auto should
   count only what is on screen, which is what the reader sees, or everything
   in range, which is what it does now. TIMELINE_PLAN section 7 already lists
   the thresholds as a first guess.

8. **WORLD_CLASS D6 is only part built.** Phase 4 gave the journal its daily
   note (a convention: a note whose first line is `# <ISO date>`) and the
   Today action. D6's calendar strip on the dock, `Ctrl+D` from every tab and
   the streak are untouched. Next step: `Ctrl+D` is the cheapest and reuses
   `startTodaysNote` in `frontend/app.js` directly.

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
  mislead the next person who reads a red log. Next step: `_current.reset` in
  `spending` should tolerate a token from another context (catch `ValueError`
  and set `None`).

- **`/timeline`'s response still calls its row list `notes`** while it holds
  documents and reminders. Deliberate (renaming breaks every caller for nothing
  the per-row `kind` does not say) and recorded here so the next reader does not
  think it is an oversight.
