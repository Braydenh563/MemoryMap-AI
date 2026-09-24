# Remaining: WORLD_CLASS_PLAN rows 1, 2 and 9 (agent, 2026-09-24)

Built and committed on this worktree: row 1 (F3, `semantic_search` on the
engine's matrix), row 9 (`similar_pairs` cached), row 2 (S1 media cookie, S2
per-client throttle, S3 imports confined, the rest of S5, S6 redirect half,
`/debug/health` paths). Detail in HISTORY.md, "Moved from the plans,
2026-09-24".

Left:

1. `tests/test_lan_mode.py` (app bound to 0.0.0.0 in a subprocess, each
   behaviour end to end), then the "Allow other devices on this network"
   toggle in Settings (Brief 15).
2. S6's other half: the configured model address in the privacy receipt on
   LAN mode (needs row 35's receipt).
3. Not verified: the media cookie in the pywebview window (WebView2,
   WKWebView, WebKitGTK); checked only in headless Chromium.
4. Decisions taken differently from Brief 15's "Decisions made" (recorded in
   SESSION_BRIEFS Brief 15): S1 is a cookie, not an HMAC URL token; S3
   confines to home and the data folder, not "403 off loopback". The owner
   may want to confirm both.
5. Found, not fixed: whiteboard PNG/PDF export rasterises an SVG through
   `<img>`, which never loads external `<image href>`s, so pictures on a
   board are likely missing from the export (read, not reproduced). The
   Settings export-folder preference accepts any writable absolute path.
6. Full suite: the run on this worktree hit shared `/tmp/pytest-of-root`
   exhaustion (894 setup OSErrors from other agents' runs); every failing
   file re-run with a private `--basetemp` passes. A clean full run is
   still owed.
