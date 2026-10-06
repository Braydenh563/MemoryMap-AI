# scratchpad

Working tools for the sessions that build this app: UI sweeps that drive the
running app with Playwright, benchmarks and probes, fake model servers, and
small helpers for the docs. Nothing here ships and nothing in `src/` or
`frontend/` imports from it. Git history keeps every deleted file.

## The KEEP rule

A file stays when something still uses it. `python scratchpad/cleanup_inventory.py`
lists every tracked file here as KEEP or DELETE (`--list` for each file and
the reason, `--delete-list` for the paths). KEEP means any of:

- a file under `tests/`, `scripts/` or `.github/` names it (by basename or path);
- `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`,
  `HANDOVER.md`, `INBOX.md`, `SESSION_BRIEFS.md`, a `*_PLAN.md`,
  `AGENT_SKILLS_REFORM.md`, `BACKLOG.md` or an open
  `docs/roadmap/agent-remaining/*.md` names it;
- another KEEP file here requires, imports or names it (followed transitively);
- it is on the always-keep list in the inventory script (the boot library
  `ui-sweeps/lib.js`, the gate sweeps `errors.js`, `contrast.js`, `docks.js`,
  `touch.js`, `chrome.js`, `serve.sh`, the launcher and fake-server helpers);
- it changed in git on any branch in the last three days, because another
  session is probably using it.

CHANGELOG, HISTORY and `docs/roadmap/archive/` mention old sweep names as a
record, not a link; a mention there does not keep a file.

## Retiring a one-off sweep

A sweep that measured one bug is done once its finding is in CHANGELOG (and
the INBOX item is resolved). Delete it in the same commit or the next
cleanup, and leave the CHANGELOG line as it is: it names the sweep as history.
Do not leave PNG, JSON, log or txt outputs behind; an output that matters is
a number in the CHANGELOG line, not a file. A sweep that a test or a plan
still runs stays; the inventory says so.

`tests/test_scratchpad_size.py` caps the tracked file count here so the pile
cannot grow back unnoticed. When it fails, run the inventory and delete what
it marks DELETE before raising the cap.
