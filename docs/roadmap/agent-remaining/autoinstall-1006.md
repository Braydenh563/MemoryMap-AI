# Auto-install refusal (2026-10-06, Sonnet agent)

Owner: "the user should be able to cancel or refuse the auto install of sentence transformers".

- done 951b9cc: pref `semantic_auto_install` (default true; `embeddings._maybe_auto_install_missing_package` returns before spending its once-flag), `extras.start(auto=)` and `auto` on the /tasks extra row, Settings, Search and index switch with '?', Guide topic text.
- done (next commit): first-time notice `frontend/js/semantic-notice.js` (lazy `semanticNotice`, reached from `refreshBackgroundTasks` in status.js): persistent toast, Don't install (cancels via /tasks/cancel, pref off, Undo turns it on and installs), once per browser (localStorage `mm-semantic-notice-seen`); onboarding.js diagnostics card offers the same choice (`semanticOnboardingOffer`).
- verified in Chromium on :8825 with a faked auto row (scratchpad fake server, extras patched): toast shows, Don't install flips pref and clears the row, Undo restores and starts a manual install, no reappearance after reload, switch reads the pref, '?' opens; onboarding "Install search by meaning" variant (pref off) flips the pref.
- not verified: the onboarding "Don't install" variant in a browser (same code path, other branch); a real pip install and a real cancel (fake process); the desktop webview.
- found, not fixed: `renderAutonomousSettings` fills Models-pane checkboxes only when Background tasks or Web search opens (comment at settings.js ~158); my switch is filled in `renderPrefs` instead. The manual-parity test (`test_manual_parity.py`) has nothing to add: no new agent tool.
- left: nothing in the brief.

## Next PR: a fresh install's search model "on this computer" with no files (the owner, 2026-10-07)

The owner's log after installing 0.4.1 (Windows, python-extras cp312):
`memorymap.embeddings: BAAI/bge-small-en-v1.5 is on this computer but would
not load (We couldn't connect to 'https://huggingface.co' ... couldn't find
them in the cached files ...); staying offline`, then `EmbeddingCacheBroken`.
The "is it cached" check said yes, so the load ran offline
(`local_files_only`), and the files were not there: an empty or partial
`models--BAAI--bge-small-en-v1.5` folder (the installer's optional-packages
step, or a stopped download). Fix: treat the model as present only when its
weights and config are in the snapshot; otherwise download it (a background
task with progress, as embedswitch does) instead of failing offline; a test
with an empty and a half-filled cache folder.

Also in the same log: `janitor: couldn't warm the filing model (Chat with
'llama3.2' failed: ... not found)`. On a fresh install with no chat model
pulled, the janitor should not warm a default model it never checked exists;
skip it quietly and let Settings, Models say no chat model is chosen.
