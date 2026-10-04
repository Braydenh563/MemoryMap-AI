# Remaining: the writing desk (Notes → Write with AI, WORLD_CLASS_PLAN D16)

Agent: writing desk, 2026-09-20, worktree `agent-a0d40d67dd862a23c`, branch
cut from `claude/open-sections-a-b`, ports 8967 and 8968, stand-in model
server on 8969. Eight commits, `feac0e2` to `910dc20`, not pushed.

Built, with numbers, in WORLD_CLASS_PLAN D16's before/after table. What is
left, in the order it is worth doing:

1. **Stop mid-pass is not verified.** The stand-in server answers a draft in
   about 150ms, so the pass is over before the button can be pressed. The
   abort path is the one that was already here plus a restore of the draft
   that went in. Needs a slow backend (a sleep in
   `scratchpad/fake_openai_server.py` would do it, driven by an env var, so
   every other sweep stays fast).
2. **The thinking panel has never held real thinking.** The 8rem cap and the
   scroll-to-newest were measured against 40 lines of fixture text, not
   against a model that thinks as it writes.
3. **`#draft-text` is `readOnly` while a pass runs, and the mounted editor is
   not.** Once documents.js has been loaded the box is a CodeMirror surface
   over the textarea, and `readOnly` on the host does not reach it, so a user
   who has been in Documents can type into a draft that is still arriving.
   The fix belongs with `mountNoteSurface`: a `setReadOnly` on the surface
   handle rather than a second thing this tab knows about editors.
4. **The five prompts are tested, not judged.** `tests/test_drafts_api.py`
   proves each kind picks its own prompt and that tone and length are clauses
   on it; what a 3B model does with "close this prose back into bullets" is
   the standing caveat's territory.
5. **An empty state was deliberately not added.** The desk's two boxes carry
   placeholders and the quick-start chips stand above them, which is what a
   first-time reader meets; an `.empty-state` block would have to replace the
   box it is about. Worth revisiting if the chips are ever measured as not
   enough.
6. **Sources are notes only.** The composer next door can attach documents,
   files, images and maps; this takes six notes. `_sources` in
   `api/routes_drafts.py` is the one place that would grow.

Found while measuring and filed rather than fixed: INBOX 277 (an
OpenAI-dialect backend that is not there is still reported as running, so
every model-gated control in the app stays enabled) and INBOX 278
(settings/extras scrolls sideways by 4px at 820 only).

INBOX 274 itself is not in this worktree's `INBOX.md`, which was cut before
it was written: its Write with AI sentence is answered by these commits and
needs its "Fixed" note adding on the branch that holds the entry.
