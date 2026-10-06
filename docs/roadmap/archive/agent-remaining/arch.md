# Remaining: the disk-full behaviour and the architecture review

Agent: arch. Worktree `worktree-agent-arch`, cut from
`claude/open-sections-a-b`, port 8796, data dir `/tmp/mm-arch` (scratch: it
is an 80 MB tmpfs mounted on purpose, see below; unmount and delete it).
INBOX 266, items 6 and 7. Written for a reader with none of this context.

Commits, in order:

| Commit | What it is |
| --- | --- |
| `7f76a4b` | Item 6: what happens when the disk fills up |
| (this batch) | Item 7: idle compute measured and cut, the SQLite decision, docs |

## How the disk-full behaviour was measured

Not injected, reproduced. `mount -t tmpfs -o size=80M tmpfs /tmp/mm-arch`,
the server started against it, then `dd if=/dev/zero of=/tmp/mm-arch/ballast`
until `df` said 100%. Everything in the commit message and in INBOX 266 was
read off that running app. `tests/test_out_of_space.py` injects `ENOSPC`
instead, because the suite has to pass on any machine; the tmpfs run is what
said which failures were worth writing tests for.

## How the idle numbers were measured

`scratchpad/ui-sweeps/idle.js` (requests and timer *fires* per idle minute,
visible and hidden) and the new `scratchpad/ui-sweeps/idlecpu.js` (the tab's
own `TaskDuration` from CDP plus the server's `utime+stime`). The before and
after were taken **against one server and one notebook, with only the two
frontend files swapped**, because two data dirs have different notes,
different preferences and a different Dashboard, and comparing those is
comparing notebooks rather than code.

Two traps worth an hour each, both paid here:

- `SERVER_PID=$(pgrep -f 'port 8796')` matches this sandbox's own shell
  wrapper, which then exits. Four complete runs were lost to
  `ENOENT /proc/<pid>/stat` before `idlecpu.js` was made to survive a bad
  pid. Resolve the pid by looking at `/proc/<pid>/exe`.
- `/tmp` filling up (the ballast plus `/tmp/pytest-of-root` from repeated
  runs) breaks the Bash tool itself, not the app: every command comes back
  "Command output was lost". `rm -rf /tmp/pytest-of-root`.

## Still open on INBOX 266

Items (1) usability and IA gaps, (2) `.tar.gz`, (3) `.msi`, (4) version,
platform and architecture in installer names, and (5) lightweight. Three of
those are another agent's; (1) and (5) belong to nobody yet. The entry stays
open, so `inbox_resolve.py` must not be run on 266.

## Found, not fixed

- **The Dashboard's emblem is most of what an idle window costs.** Measured:
  5.55% of one core with the Dashboard open, 2.09% parked on Notes, on the
  same notebook. The difference is one p5 sketch drawing at 24fps because
  the owner asked for exactly that ("whenever the generated p5.js node graph
  logo shows, make sure it is never static and always rotating"). The five
  emblems that are not on screen were already stopped with an
  `IntersectionObserver` in an earlier session. Turning the visible one down
  (fewer frames, or stopping it after a while) is a design decision for the
  owner, not an agent, which is why it is written here rather than done.
- **`entry_revisions` and `audit_log` still grow with usage and nothing
  prunes either** (already recorded in `docs/ARCHITECTURE.md` section 8, and
  still true). Neither has been reported as large in practice.
- **`GET /storage`'s `data_dir_writable` is still `true` on a disk that is
  100% full.** That is `os.access` answering the question it was asked, and
  it is left alone: `free_bytes` beside it is the honest half, and widening
  the writability check to mean "and there is room" would make one field
  answer two questions.
