# Remaining: a model per feature (WORLD_CLASS_PLAN section 20)

Agent: featuremodels. Worktree `worktree-agent-featuremodels`, cut from
`claude/open-sections-a-b`, port 8796, data dir `/tmp/mm-featuremodels`
(delete it; it is scratch). Written for a reader with none of this context.

Commits, in order:

| Commit | What it is |
| --- | --- |
| `2340ce7` | The backend seam and its 26 tests |
| `e50f4c5` | Merge of the branch head (brings INBOX 286 to 291) |
| `d307a0f` | Settings list, three inline pickers, the rename, the sweep |
| `b94557c` | INBOX 286 and 287, the guide panel |
| `02732ae` | Docs, INBOX resolution, and the chat model pill |
| `5e50fe2` | The pinning test that the 287 fix had to move |

## Done, and how it was measured

**The seam** (`src/memorymap/ai/model_manager.py`). One table, `FEATURES`,
four rows: `chat`, `writing`, `documents`, `guide`, each naming the *role*
(chat or utility) it falls back to. `ModelManager.for_feature(key)` returns
a second manager over the same config whose `chat_model()` /
`utility_model()` answer for that feature; the route hands that view down
and nothing below it, not the agent loop, the drafter or the help chat,
knows features exist. Reading and writing is `feature_model`,
`feature_override`, `set_feature_model`, `clear_feature_model`,
`reset_feature_models` (returns the count cleared) and `feature_rows`.
An unset feature stores `""`, never the resolved name, and resolves through
its role at read time. An unknown key raises `ValueError`; the API turns
that into a 400.

**The routes.** `POST /models/feature-model` ({feature, name}, empty name
clears), `POST /models/feature-models/reset` (returns `cleared`), and
`feature_models` + `feature_models_overridden` on `GET /models/status`.
The four call sites are `routes_chat.py` (two, one per chat endpoint),
`routes_drafts.py` (three), `routes_documents.py` (four),
`routes_help.py` (two).

**The tests** (`tests/test_feature_models.py`, 26, all green). The four that
matter assert the model name that reached the fake provider for a chat turn,
a draft, a document edit and a guide turn. A round-trip test would pass on a
preference that never reaches `chat()`, which is this repo's second
recurring failure shape.

**The UI.** Settings, Models has a row per feature (name, one-line state,
select, per-row reset) built by `renderFeatureModels` in app.js from
`/models/status`, plus `#feature-models-reset` under it. Each of the three
surfaces opens the same `openSheet` picker from the menu it already had:
the Chat tab's `kebabMenu` (`mountChatActionsMenu`), `#draft-model` in the
writing desk's `details.dock-menu`, `#doc-ai-model` in the documents
editor's. Nothing gained a control in its chrome.

**Measured** by `scratchpad/ui-sweeps/featuremodels.js` (registered by name
in `scripts/gate.sh`'s sweep list; 0 findings). At 1440: four rows at 44px
with 273px selects; changing one row leaves the other three reading
"Inherited: llama3.2"; each per-row reset is disabled until its own row is
overridden; the inline picker in all three surfaces sets the value the
Settings row then shows; the mass reset clears three overrides and goes
quiet. At 390 the row folds to a name over a select and a reset, 268x96,
216px select, no overflow. `errors.js` at 1440, 1024, 820 and 390: 0
console errors, 0 layout findings.

**The rename.** The Notes sub-tab button said "Write with AI" while the
heading of the panel it opens already said "Write with Atlas". Both say
"Write with Atlas" now and nothing in `frontend/` says the old name.

**INBOX 286** (the guide's send "looks disabled"): it was never disabled.
Measured with a model connected: `disabled` false, opacity 1, background
`rgba(31, 36, 48, 0.12)`, because
`button.icon-only:not(.ghost):not(...)` in 07-whiteboard-misc.css paints
every unclassed icon-only button in the tonal tier. `.icon-primary` was
added to that rule's exception list (it is the general form of the
`.graph-popup-tool-primary` exception already there) and to the button.
Both send buttons now measure identical: accent fill, 0px border, 8.4px
radius, the same glow.

**INBOX 287** (the thinking box): reproduced on the current head with a
scripted stream. Measured mid-flight: a bare div clipped to 29px holding
262px of text, unlabelled, with no way to open it. Not the splitter, which
delivered the events correctly. It is `details.agent-step.step-thinking`
over a `.thinking` body now, the chat transcript's own recipe, and it folds
when the first answer delta lands: 152px while thinking, 34px after.

**INBOX 288** (the guide "doesnt use my utility model"): measured at the
provider on both guide routes. With smart model routing ON it *does* reach
the utility model, so the report does not reproduce in that configuration.
With routing OFF it reaches the chat model, which is the one setting that
produces the reported symptom on a thinking chat model, and it is the switch
doing what its label says. The Guide is now a feature row, so it can be
pinned whatever routing says. All three cases are pinned in
`tests/test_feature_models.py`.

## The gate

`GATE_BASE=claude/open-sections-a-b scripts/gate.sh --full`: **green**, on
`5e50fe2`. `lints node-check ruff full-suite` all passed, none failed.

The run before it failed one test,
`tests/test_chat_resume_controls.py::test_the_guide_reads_a_stream_and_can_fall_back`,
which pinned the source line that built the old thinking div, the shape
INBOX 287 reported as broken. `5e50fe2` moves that assertion onto the new
recipe (summary, body, fold) rather than deleting it. `--changed` was green
twice earlier in the run (67 files selected each time).

The only thing not covered by the gate is the sweep: run it with the app up,
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers BASE=http://127.0.0.1:<port>
node scratchpad/ui-sweeps/featuremodels.js`, exit 0 and `"findings": []`.

## Remaining, in order of how much it matters

1. **Smart model routing moves the Guide, and its copy does not say so.**
   The measured cause of INBOX 288. A decision, not a bug: either the
   switch names the surfaces it moves, or the Guide stops being one of them.
   Written up in WORLD_CLASS_PLAN section 20 "Still open".
2. **The feature list lives inside `#models-config`**, which Settings hides
   whole when no backend answers, so an override cannot be seen or cleared
   while the model server is down. Every other model picker is in there too,
   so this is consistent rather than wrong, but it is the one place the
   consistency costs something.
3. **Only the Chat tab shows its pinned model on the surface itself**
   (`#chat-active-model`, taught about features in `02732ae`). The writing
   desk and the documents assistant say it only inside their menus. Neither
   has a pill to put it in, so this is a design question rather than an
   oversight.
4. **The guide panel's transcript does not scroll itself.** Measured while
   streaming: `#help-chat-messages` stayed at `scrollTop` 0 while its
   `scrollHeight` grew from 125 to 215, so `toBottom()` in
   `helpChatStreamTurn` writes to an element that is not the scroller.
   Harmless on a short answer, not on a long one. Found while measuring 287
   and deliberately not fixed: it is a different fault in the same function
   and wanted its own measurement.

## Things learned that are not obvious from the diff

- **`enhanceSelect` moves every select into a `.select-shell` at boot**, via
  a MutationObserver, so a dynamically built select needs no wiring, but a
  CSS rule naming the select alone sizes a 1px aria-hidden control nobody
  can see, and "the first button in the row" is the shell's opener, not
  yours. Both cost a sweep round; the fix is in the CSS and in the
  `.feature-model-reset` class.
- **`kebabMenu` reparents its open dropdown out of its container**
  (`wireEscapedActionMenu`), so a sweep that looks for menu items inside the
  host finds nothing while the menu is open. Query `.action-menu:not(.hidden)`
  document-wide.
- **`refreshModelStatus` is on demand, not a free-running poll**, so a
  Playwright `page.route` patch of `/models/status` does not take effect
  until something asks for the status again. Call it explicitly.
- **`syncModelGatedControls` only re-enables what it disabled.** If anything
  else disables a `data-needs-model` control first, the gate declines
  ownership but still overwrites the title, so the control can be left
  disabled with its real tooltip back. Not hit in practice here, but it is a
  live trap in that function.
- **`pkill -f <sweep>` kills your own shell** the same way `pkill -f uvicorn`
  does (exit 144). It took out two background jobs.
