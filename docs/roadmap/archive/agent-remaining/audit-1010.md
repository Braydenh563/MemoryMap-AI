# Left by the audit agent (Brief 43), 2026-10-10

The owner: "fix, improve and extend and add everything I have missed or havent thought of." The findings that were not fixed are the fifteen rows of BACKLOG.md, "Expert audit, 2026-10-10"; this file is only what the audit itself did not get to.

- Boot to interactive under 2.5 s at 4x CPU was not established: the host ran at load 6 to 14, so 6.1 s (4x) against 4.1 s (1x) is a ratio, not a verdict. Re-run `scratchpad/ui-sweeps/audit-hw.js` on a quiet machine (BACKLOG row 1).
- Graph worker frame at 2,000 nodes: no linked fixture; `scratchpad/graph-fixture.js 2000 6000` then `gwperf.js` (row 12). graph*.js is the graph agent's.
- Semantic search precision needs a real embedder; `scratchpad/search-relevance-1010.py` runs unchanged with one installed.
- HTML, docx and PDF export re-import diffs need the `documents` extra (markitdown, python-docx) installed (row 5).
- 20,000-note memory curve (row 11), and idle CPU with the Atlas companion animating (the audit measured 0.72 percent of one core total, server 0.28, tab 0.44, at 5,000 notes).
- Lock-screen rate limit and the LAN certificate were read, not attacked: `tests/test_auth_hardening_1005.py` holds the first, Brief 40's packaging agent owns the second.
- Gate state at the audit's head: `scripts/gate.sh --staged` fails only on the vendored-library rows of BACKLOG row 8 (ruff in vendor/, a conflict marker, the README tool count); nothing else.
