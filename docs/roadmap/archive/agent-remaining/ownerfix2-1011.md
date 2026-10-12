# ownerfix2-1011 remaining (Sonnet agent, branch agent/ownerfix2-1011)

Built (INBOX 838, 839, 840, 841, 842, 845, 846): see the commits; sweeps are in the agent's scratchpad (chatradius, year, agenthint, constmove, navhist, sketch, palette, graphticks). Nothing here is pushed.

## Not built

- INBOX 839, graph: only the drag's heat is changed (graph-worker.js `dragHeat`). A single-tick 7.1px step still shows in one of two 8px runs (a non-dragged node, 3 ticks after release); not traced. The main-thread glide (graph-canvas.js `gcGlideStep`) was not touched.

## Found, not fixed

- Attach: at 390 `#attach-image` reads a 999px radius while `#attach-note` reads 4.8px in the chat composer row (the owner's 841 asked for one corner; only the gear was in scope). 04-chat-dock-appearance.css, `#attach-image.has-attachments` near line 2854 is the nearest rule.
- The guide topic `ask-chat` is at 1916 of 1919 characters (`tests/test_help_controls.py`), so Agent-with-no-model could not be named in the Guide without trimming another sentence. The segment's title and the hint line carry it.
- `graphjitter.js`-style rAF sampling is useless on a loaded machine (frames 50 to 170 ms apart, load average 10 to 33); the worker-tick measure (graphticks.js: per-tick steps from the 'tick' messages, the page's onmessage wrapped) is the one that holds.
- Nav history on a phone: the popup was measured by calling `openNavHistoryMenu` directly (the status-bar button is not drawn at 390), so its placement on a phone was not verified, only its widths and 44px targets.
