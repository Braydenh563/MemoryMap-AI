# Remaining: a model per feature (WORLD_CLASS_PLAN section 20)

Agent: featuremodels, worktree `worktree-agent-featuremodels`, port 8796.
Commits: `2340ce7` (the seam and its tests), `d307a0f` (Settings, the three
inline pickers, the rename, the sweep), `b94557c` (INBOX 286 and 287),
plus the docs commit that carries this file.

## Done, with the numbers

- `model_manager.FEATURES` (chat, writing, documents, guide) and
  `for_feature()`, with `feature_model` / `feature_override` /
  `set_feature_model` / `clear_feature_model` / `reset_feature_models` /
  `feature_rows`. `POST /models/feature-model`, `POST
  /models/feature-models/reset`, and `feature_models` +
  `feature_models_overridden` on `/models/status`.
- 26 tests in `tests/test_feature_models.py`, including four that assert the
  model name that reached the provider per surface, and the three INBOX 288
  cases (routing on, routing off, pinned).
- Settings list, per-row reset, mass reset; inline picker in the Chat tab's
  kebab, the writing desk's dock menu and the documents editor's dock menu.
- `scratchpad/ui-sweeps/featuremodels.js`, registered by name in
  `scripts/gate.sh`'s sweep list. Findings: 0. Measured at 1440: four rows
  at 44px, 273px selects; at 390: 268x96 rows, 216px selects, no overflow.
- INBOX 286 (send button read as disabled: it was painted in the tonal tier;
  `.icon-primary`) and 287 (thinking box was a 29px clip of 262px of text;
  it is the chat's `details.agent-step.step-thinking` recipe now).

## Remaining, in order of how much it matters

1. **Smart model routing moves the Guide, and its copy does not say so.**
   Measured: routing off sends a guide turn to the chat model. That is the
   cause of INBOX 288 and it is a decision rather than a bug, written up in
   WORLD_CLASS_PLAN section 20 "Still open". Either the switch names the
   surfaces it moves, or the Guide stops being one of them.
2. **The feature list is inside `#models-config`**, which Settings hides
   whole when no backend answers, so an override cannot be seen or cleared
   while the model server is down.
3. **Only the Chat tab shows its pinned model on the surface itself.** The
   writing desk and the documents assistant say it only inside their menus.
   A design question (does a writing desk want a model badge in its dock?).
4. **The transcript in the guide panel does not scroll itself.** Measured
   while streaming: `#help-chat-messages` stayed at `scrollTop` 0 while its
   `scrollHeight` grew from 125 to 215, so `toBottom()` is writing to an
   element that is not the scroller. Harmless on a short answer, not on a
   long one. Found while measuring 287; not fixed, because it is a different
   fault in a different part of that function.
5. **Not verified:** nothing here has met a real model. Every model name in
   every test and sweep is a fake transport's, per CLAUDE.md section 4, and
   the sweep patches `/models/status` so a backend appears to be up. What is
   real in the sweep is every preference write and read.
