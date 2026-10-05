# Fix agents, 2026-10-05: the common rules

1. **Start:** `git merge --ff-only claude/notes-flow-rebuild`, falling back to
   `git merge claude/notes-flow-rebuild`. Read CLAUDE.md sections 2 (orders 4,
   5, 5a, 6, 9, 10, 11, 12, 13) and 7.
2. **Fully local** (the owner, 2026-10-05: "make sure it is fully local dn
   doesnt use any external libraried that arent vendored"):
   - No CDN, no remote font, no network fetch at runtime except the user's
     own configured model server or a URL the user asked for.
   - A new frontend library is vendored under `frontend/vendor/` with its
     licence file; it must be AGPL-compatible.
   - No new Python dependency unless it is already in requirements.txt.
   - Never torch or sentence-transformers, and never press an "Install" on an extra in a sweep: one did, at 03:51 on 2026-10-05, and put torch into the shared .venv.
3. **Tests first** from the audit's reproduction: the failing test, then the
   fix, then the test passing.
   - Targeted tests only, run SERIALLY (`-p no:cacheprovider`, a private
     `--basetemp` under your own scratch dir; the box has 4 cores and 8
     agents).
   - Run `bash scripts/gate.sh --staged`, which must print "failed:  none",
     before each commit.
   - Never run the full suite.
4. **Commit** per finding and at least every 20 minutes, with the trailers:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
   `Claude-Session: https://claude.ai/code/session_01UvMLdXt2CL6M5pkTvwyV17`.
   Do not push.
5. **Docs per fix:**
   - a line in both CHANGELOGs (CHANGELOG.md and docs/CHANGELOG.md
     identical);
   - help text for any control you change (order 13);
   - a "built" claim the audit found false is corrected in its plan (or
     HISTORY).
   - Mark the finding id fixed in the audit report, appending
     "FIXED <commit>" to its line.
6. **UI** comes from DESIGN.md's recipe index (order 11).
   - Copy: sentence case, no em-dashes, no exclamation marks.
   - Verify in a browser with a sweep in scratchpad/ui-sweeps/ (your own
     prefix), at 1440 and 390, light and dark.
   - Server: `bash scratchpad/ui-sweeps/serve.sh <your port> /tmp/mm-<you>`.
     Stop it with `bash scratchpad/killport.sh <port>`, never pkill -f.
7. **Boot JS gzip:** stay under the cap in tests/test_static_compression.py.
   Never raise a cap. Another agent is moving code into lazy modules: if
   you touch boot files, keep your diffs local and small.
8. **Migrations** keep one alembic head. Rebase your revision's
   `down_revision` onto the branch head when you merge it in.
9. **Shared scratchpad files** take your prefix.
10. **Final report, five lines:** status, commits, numbers, not verified,
    found-not-fixed.
