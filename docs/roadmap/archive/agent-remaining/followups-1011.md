# followups-1011: what is left

Agent followups-1011 (branch `agent/followups-1011`), 2026-10-11. Built the ten items of `brief-followups.md`; one commit each (the last also carries the graph chip's focus fix). Sweeps: `scratchpad/ui-sweeps/wbfollowups.js` (layers and hollow ends); the others were measured with throwaway scripts (numbers in the commit trailers' tests).

Open, one line each:

- Hollow ends on a free line or arrow (not a link) still draw the shaft through the shape: its stored `d` begins `M sx sy L ex ey` and `wbRegenerateShapeCaps` (whiteboard.js) re-reads those two points as the endpoints, so trimming the shaft there would shift the line's ends on every edit. Needs the true tip kept beside the trimmed shaft (a `tip` field in the sketch's data).
- A mind map thumbnail's branch colours are the classic palette only (`MAP_BRANCH_PALETTE`); a template whose map uses Dark2, Set2 or Category10 (`MAP_BRANCH_PALETTES`) is still drawn in classic. `wbMapThumbSpec` has no palette name to read.
- The Layers rows' eye and lock for an item on a hidden or locked named layer now say the layer decides and a press explains; an item cannot be shown on its own (the simpler of the two options: no second per-item override to explain). If the owner wants per-item override, it is a `showOnHiddenLayer` flag read in `wbItemHidden`.
- Topic renames (Contents list, note panel) keep the blur save the topic card has beside Save and Cancel; if blur should cancel instead, change `field.addEventListener("blur", ...)` in `contentsRenameTopic` (library.js) and `gcRenameTopicInline` (graph-canvas.js) together.
- `.dash-find` and the unlinked-mention Link are done; still open from uipolish: the rows view's meta `button.ghost.small.icon-only` is 28px in a 24px line (01-forms-settings.css:1461), the tool-confirm Confirm and Cancel pair, and `BOOT_CSS_CAP` (tests/test_boot_budget.py) can come down to the measured boot CSS plus 2%.
- Guide topics: "what are all the whiteboard shortcuts" now answers with whiteboard-controls (tools, moving around) and names whiteboard-selection under Related, so the composed answer is half the old one. Tab-level Guide landing is unchanged.
- Reminder notification token: the signing key is invented per process (the app keeps no other signing secret; sessions and the vault key also end with the process), and `/auth/lock` and `end_every_session` replace it, so a notification left on screen after a lock or a restart opens the app instead of acting. The desktop launcher's own toasts act in-process (`core/reminder_notifier.py`) and are unchanged.
- Found, not fixed: `tests/test_ux1005_copy.py::test_a_menu_item_without_a_title_gets_no_tooltip` failed on this branch before the merge of `gemini/composer-improvements` (fixed there by 72d4a9ac4).

Not verified:

- The service worker's Done and Snooze press itself (no headless way to click a system notification): the route is tested through the app (forged, expired, other reminder's, other routes, after the session ended, after a lock), and the worker's request shape is a source test.
- The graph chip and the fade on the owner's screen and on the desktop webview; the fade under reduced motion in a browser (it is skipped in source, as a note arriving is).
- The shimmer under the OS reduced-motion setting on a real OS (Chromium's emulated `reducedMotion` was used: none under default Always, shimmer when Always move is chosen).
- The Guide's retrieval against a real model: only the offline keyword route was run.
