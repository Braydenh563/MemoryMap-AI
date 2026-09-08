# CHAT batch B (Opus): INBOX 39 and 40

Branch `claude/epic-ramanujan-8xocc0`, worktree `agent-aaf982b12113f9499`,
server on :8871 with data in `/tmp/mm-chat-b`, stand-in model server on
:8879 (`scratchpad/ui-sweeps/fake.sh`, new).

## Done

- **INBOX 39** (commit "The chat mode is called Agent, and a skill switches
  to it"). The mode segment, its tooltip and accessible name, the per-turn
  chip on a message meta line, the progress musing, the nudge action, the
  Plan-mode toast and the plan docs all say "Agent" now; `tools_enabled` and
  `use_tools` are untouched. `startSkill` switches the mode to Agent before
  it sends, toasts "Switched to Agent for this skill." and leaves it
  switched.
- **INBOX 40** (commit "Citations land on the answer a run actually ends
  with"). Three causes, all measured, any one of which alone left a skill run
  uncited:
  1. `addInlineCitations` was handed the *first* `.bubble-answer` by
     `querySelector`, and a run's prose is one block per step, so the walker
     hunted the final answer's sentences in step one's narration. It takes
     every block of the turn now, latest first; three call sites pass all of
     them and `test_inline_citations.py` fails any that narrows back.
  2. `routes_chat.py` concatenated the answer deltas of every round with no
     separator, gluing the last sentence of one round to the first of the
     next; `split_sentences` cannot split that, so the grounding row named
     text that exists in no paragraph on screen. It now breaks paragraphs
     where the transcript does (`tests/test_grounding.py`, and the new test
     fails without the fix).
  3. `liveMarkdownRenderer` arms a paint up to `LIVE_RENDER_INTERVAL_MS`
     ahead. On a fast run it fired after `finalise()` and after the markers
     went in, repainting identical prose without them, which is why this read
     as "citations do not work" rather than as a race. `finalise` (and
     `replaceAnswer`) cancel it first.
  Plus the badges: `setNoteLabel`/`plainText`/`flattenNoteMarkdown` render a
  badge's Markdown instead of printing it, on the grounding chips, the
  "elsewhere" chips and the touched ("viewed") badges.
  Sweeps: `phasec.js` (extended, prints an "INBOX 40" pass/fail),
  `citeunit.js` (the placement rule in isolation), `citeskill.js` (an
  instrumented skill run: what each `addInlineCitations` call was handed, and
  a three-second trace of whether the markers survive), `fake.sh` (starts the
  stand-in model server the way `serve.sh` starts the app).

## Left, with the next step

1. **`plainText` has one caller.** It was added next to `noteLabel` as the
   brief asked (batch A was doing the popup agent's chips at the same time
   and may have added a helper of its own). If batch A's merge brings a
   second stripper, keep one of them: `plainText` is the thin wrapper over
   `stripMarkdownPreview`, and the popup agent's `cmdPaletteResultRow` /
   `cmdPaletteTouchedRow` chips (app.js, near `CMD_SOURCE_PREVIEW`) are the
   obvious next callers of `setNoteLabel`. Not touched here on purpose, to
   keep the two batches off the same lines.
2. **A truncated badge is still flattened, not rendered.** `setNoteLabel`
   falls back to plain text whenever the label is longer than its budget,
   because a cut can land inside `**bold**`. The grounding chips (budget 30)
   therefore render Markdown only for short note openings. The better fix is
   to cut on the rendered DOM and let the chip's CSS ellipsis do the rest,
   which needs a measured max-width on `.result-reason-chip` first (INBOX 35
   asks for the same chip recipe, so do them together).
3. **The `1.` prefix on a grounding chip is app text prepended into the
   rendered span.** It reads correctly, but the chip's number and its label
   are now one text flow; if the chip recipe from INBOX 35 gives the number
   its own element, move it out of `setNoteLabel`'s prefix argument.
4. **Not verified: a real model.** Everything measured here ran against
   `scratchpad/fake_openai_server.py` (CLAUDE.md section 4). The grounding
   event was made possible by seeding a note that contains the stand-in's one
   fixed sentence (`seedGroundableNote` in phasec.js); a real model
   paraphrases, and the distinctive-terms half of `ground_answer_sentences`
   is what would carry it. Untested.
5. **Not verified: dark theme and narrow widths for the badges.** In light at
   1440 a chip with a rendered `**bold**` run is the same height as the plain
   one (20px and 20px, `citeunit.js`), `# CAB432` loses its hash, a link
   flattens to its text and no `<a>` is built inside a `<button>`; dark passes
   the same checks. A 1024 pass, where these chips wrap, is not measured, and
   nor is the truncated case at a real note length on a narrow dock.
