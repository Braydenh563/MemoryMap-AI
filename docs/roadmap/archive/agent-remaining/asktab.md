# Agent: the Ask sub-tab, INBOX 297 to 300

Worktree `.claude/worktrees/agent-asktab` on `worktree-agent-asktab`, cut
from `claude/open-sections-a-b`. Port 8802, data dir `/tmp/mm-asktab`
(`bash scratchpad/ui-sweeps/serve.sh 8802 /tmp/mm-asktab`).

The four reports are placed in CHAT_PLAN under "Placed from INBOX,
2026-09-21 (the Ask sub-tab, four reports in one pass)".

## The probe, and how to run it

`scratchpad/ui-sweeps/asktab.js`, registered in `scripts/gate.sh`'s sweep
list. It starts `scratchpad/fake_answer_server.py` itself (that fixture now
takes `FAKE_DELAY_MS`, so a stream lasts long enough to poll).

    BASE=http://127.0.0.1:8802 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
      node scratchpad/ui-sweeps/asktab.js

The Ask sub-tab is inside `#tab-notes`: `switchTab('notes')` then
`showNotesSection('ask')`. A probe that used `switchTab('chat')` measured
every rect at 0 for a run, which is this codebase's display:none trap.

## Before numbers (measured, 1440 unless said otherwise)

| What | Before | After |
| --- | --- | --- |
| Attachment row to badge row | 0.0px (also 0.0 at 1024, 820, 390) | not yet |
| Badges the data implies | 5 | not yet |
| Badges drawn in the Ask column | 5, none clipped, 0px of the lane scrolled out at any width | not yet |
| Frames with the answer streaming | 250 | not yet |
| Of those showing anything moving | 0 | not yet |
| Frames before the first token showing the dots | 122 of 372 | not yet |
| Matching records rendered | 5 | not yet |
| Of those carrying a citation number | 0 | not yet |
| Sources control | 525px in a 525px column (100%), `<button>`, "Sources: 5 notes, on the right" | not yet |

## Where each report stands

**297, spacing and missing badges. Half done: measured, not fixed.**
The gap is real and is 0px at every width: `.entry-links`
(01-forms-settings.css:1933) has `margin-top` and no `margin-bottom`, and
`.entry-meta` has no `margin-top`, so the file chip sits on the badge row.
The fix is one margin, in `.entry-links`, scoped so it does not move the
links row that shares the class further down the same card.

The second half is **not** a truncation and **not** a wrap: with a real
entry payload the row draws every badge its data implies, at 1440, 1024,
820 and 390, none clipped and no part of the lane scrolled out. It is the
third possibility, a condition that never fires: the Ask column builds its
rows through `clickableResult` (app.js:12365), which calls `entryItem(entry)`
with **no options**, so every chip gated on `options.actions` is absent from
a row that is otherwise the same note: the "No tags yet" flag, "Tag with
Atlas" and the reference-count chip (`referenceCountChip`, app.js:11421,
which returns null without `options.actions` before it looks at anything).
The measurement that proves it was mid-write when this was committed: the
probe reads the same note's chips in Browse and in Ask and diffs them, and
the Browse read came back null because the row for `seeded.ids[2]` was not
in `#entry-list` yet (the list renders in chunks; it needs a longer wait or
a `waitForSelector` on that row). **Next step: finish that comparison, then
decide per note fact whether it belongs on a read-only row.** My
recommendation, for the plan's "Decisions made": a *fact* about the note
belongs on the row wherever the row is drawn (the reference count), and a
chip that is really an action does not (Tag with Atlas opens a model call;
"No tags yet" opens the edit form). That means passing a third option, not
`actions: true`, so the Ask column gains the facts and not the buttons.

**298, no generating animation. Measured, not fixed.**
250 of 250 streaming frames showed nothing moving. Cause, read from the
code: `askQuestion` (app.js:13407) puts `typingDots()` in `#ai-answer` and
`onThinking` removes it on the first thinking delta, `onAnswer` adds
`.is-generating` to the answer box only when the first token lands, and
`#ask-status` is plain text throughout. The Chat tab already does this
properly and says why in its own comment (app.js:20598): `.is-generating`
goes on before the request and comes off in the `finally`, and a
`progressLine()` lives for the whole turn. **Next step: the same two calls
on the Ask path.** `progressLine(...)` into `#ask-status` in place of the
`status.textContent = "..."` writes (it carries `setStatus` and
`setPhase("writing")`), `.is-generating` on `#ai-answer` from before
`streamChat` to the `finally` that already removes it. No new control: both
components exist and this is a missing call site, which is what CHAT_PLAN
says.

**299, numbering. Measured, not fixed.**
5 records rendered, 0 numbered, against 2 inline marks. `citationNumbers`
(app.js:12440) is already the one numbering the prose markers, the
"Grounded in" chips and the Sources panel share. **Next step: stamp the
record rows from that same map**, inside `renderAnswerGrounding` where
`numberFor` already exists, guarded on `target.id === "ai-answer-grounding"`
so the Chat tab's calls (which pass a bubble holder) cannot renumber a
stale Ask column. The mark reuses `.chat-source-index` (02-chat-graph.css:5040),
the app's existing "this is source n" treatment, rather than a new one. An
uncited row gets no number.

**300, the sources control. Measured, not fixed.**
It spans 100% of its column because `.ask-sources-line`
(03-dashboard-widgets.css:1905) sets `display: flex; width: 100%`, and its
words describe where to look. It does do something (`askRevealRecords`
brings the records column into view), so the answer is not to stop being a
button: it is to stop being a banner. **Next step:** take the width off so
it sizes to its content beside the follow-up chips it sits above, and
relabel it for what pressing it does rather than for where the notes are.
DESIGN.md's recipe index has the shape already: "a fact on a facts line
that is also the way in" (`.library-chip` on a `<button>`).

## Not verified

Nothing here has an after number yet. No model runs in this sandbox: the
stream is `scratchpad/fake_answer_server.py`, and `ai_confidence` (the
"AI 72%" chip in the owner's screenshot) is set on the fixture entry before
`renderChatMeta` is called, because no API route accepts it. Both are
stated in the probe's own comments.
