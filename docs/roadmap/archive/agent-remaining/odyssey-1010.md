# odyssey-1010: Odysseus, fourth read (INBOX 747), placement table

The owner, 2026-10-10: "run another deep analysis on the odysseus repository for
things worth taking and being inspired by and replicating ... analyse absolutely
everything about it, from its features, how they are designed, metadata and
libraries used. how it is packaged and more."

Done: ANALYSIS.md "Odysseus, fourth read 2026-10-10 (INBOX 747)", sections 1 to
10 (256 lines; the file is at 4,477 of 4,500). Branch `agent/odyssey-1010`, not
pushed. No plan was edited: the rows below are for the orchestrator to place,
then INBOX 747 resolves with `python scratchpad/inbox_resolve.py 747`.

## Placement table

| # | Finding | Plan file | Section | Row to add (one line) |
| --- | --- | --- | --- | --- |
| 1 | CI supply chain: 0 of 26 `uses:` pinned, 0 of 5 workflows set `persist-credentials`, no zizmor, no secret-scan job, no pip-audit | `docs/roadmap/WORLD_CLASS_PLAN.md` | 12. Security review | Pin every `uses:` to a commit SHA, `persist-credentials: false`, `permissions: {}` per workflow; add `workflow-security.yml` (actionlint and zizmor, checksum-pinned), a gitleaks job, dependency-review on PRs, pip-audit advisory, Dependabot groups with `cooldown`; start with `release.yml:115` (`softprops/action-gh-release`, `contents: write`); a lint that every `uses:` is 40 hex. Size S to M |
| 2 | No LICENSE or THIRD_PARTY.md in any packaged build (`installer.iss`, `installer.wxs`, both specs, `docker/Dockerfile` name none) | `docs/roadmap/BACKLOG.md` | 7. Desktop packaging | Bundle `LICENSE`, `docs/THIRD_PARTY.md` and `frontend/vendor/*/LICENSE` in the installer, MSI, Linux zip and image; show the AGPL on the installer's first page; one test per build file that it names them (their `test_distribution_paths_include_all_notices`). Check a built folder for wheel `dist-info` licences. Size S |
| 3 | `frontend/board-library/drawio/` (Apache-2.0, 5 sets) and `icons.json` (Phosphor, MIT) are not in `docs/THIRD_PARTY.md`; `test_vendor_manifest.py` walks `vendor/` only | `docs/roadmap/WHITEBOARD_PLAN.md` | The draw.io programme, 2026-10-10 | Add both to THIRD_PARTY.md (the drawio agent's note: "If a THIRD_PARTY.md is started, these two entries go in it"), note upstream's Atlassian-products clause, and extend the manifest test to `board-library/`. Size S |
| 4 | No byte check on vendored files; one data table of unknown origin (`ai/question_noise.py`) | `docs/roadmap/BACKLOG.md` | 7. Desktop packaging | `frontend/vendor/PROVENANCE.json` (path, sha256, size, version, upstream URL, licence, notice; `build: build.sh` for CodeMirror and Emmet) with a recomputing test; a "Data" row per shipped table; a scope line and a "Removed" list in THIRD_PARTY.md. Size M |
| 5 | **Found, not fixed:** `docker/compose.yaml` `build.context: ../..` resolves to `/home/user` (`docker compose -f docker/compose.yaml config`) | `docs/roadmap/BACKLOG.md` | 7. Desktop packaging | Change `context` to `..`; INSTALL.md's `docker compose -f docker/compose.yaml up -d` cannot build today. Size S |
| 6 | **Found, not fixed:** `docker/.dockerignore` is beside the Dockerfile, so BuildKit with the repo root as context reads `docker/Dockerfile.dockerignore` or the root file; `.git` is 461 MB | `docs/roadmap/BACKLOG.md` | 7. Desktop packaging | Rename to `docker/Dockerfile.dockerignore`. Size S |
| 7 | **Found, not fixed (reasoned, no daemon):** `/data` and `/models` are created root-owned and `USER mm` cannot write them | `docs/roadmap/BACKLOG.md` | 7. Desktop packaging | `RUN mkdir -p /data /models && chown mm:mm /data /models` before `USER mm`; add `HEALTHCHECK` on `/health`; hadolint workflow; `tests/test_docker_packaging.py` pinning context, ignore-file name, volume owner. Size S |
| 8 | No container image is published | `docs/roadmap/BACKLOG.md` | 7. Desktop packaging | (needs owner) GHCR multi-arch on a tag with native arm64 runner, push by digest, tags `X.Y.Z` and immutable `X.Y.Z-<sha7>`, `imagetools inspect` as the proof step; Trivy advisory after. Size M |
| 9 | `/health` has `version` only; CLAUDE.md section 5 records the stale-uvicorn trap | `docs/roadmap/WORLD_CLASS_PLAN.md` | 7. The small things | `source_commit` (git at import, build-time stamp when frozen), `started_at` and `data_dir_writable` in `/health`, shown in Settings, About. Size S |
| 10 | **Found, not fixed:** `core/security.py` `is_internal_address` treats NAT64 `64:ff9b::/96` as global (Python 3.13.16: `64:ff9b::a9fe:a9fe`, `::a00:1`, `::7f00:1` all `is_global`) | `docs/roadmap/WORLD_CLASS_PLAN.md` | 12. Security review | Decode the /96 to its IPv4 and judge that, exactly (not `64:ff9b:1::/48`); test the three addresses. Size S |
| 11 | No macOS app; Gatekeeper needs a paid account for a downloaded build | `docs/roadmap/BACKLOG.md` | 79. Linux release packaging: done; macOS still open | `packaging/macos/make-app.sh`: a launcher `.app` the person builds on their own Mac (never quarantined), plus a Chromium `--app=URL` window as the shell when pywebview is absent. Unverified without a Mac. Size S |
| 12 | A user-level systemd unit | `docs/roadmap/BACKLOG.md` | 7. Desktop packaging | `python -m memorymap --print-unit` writes a `systemctl --user` unit with real paths and `127.0.0.1`. Size S |
| 13 | No "nothing else moved" check for CSS work | `docs/roadmap/UI_MODERNISATION_PLAN.md` | Phase 12 (and 13) | Computed-style snapshot over our palettes and phone widths (their 16,224 snapshots in about 21 s), run at phase gates that move CSS, baseline re-recorded only on intent. Size M |
| 14 | A capability the words ask for is off: the model tries it and gets a `ToolError` | `docs/roadmap/CHAT_PLAN.md` | The deterministic foundation, 2026-10-10 | Say so in one line before inference (`tools/__init__.py:1753`, `:4777`), one test per tool group. Size S |
| 15 | Scripting and external agents | `docs/roadmap/BACKLOG.md` | 29. Extensibility ideas | `python -m memorymap tool NAME --json` over `mcp_server.offered_tools()`; a `SKILL.md` in the Settings MCP row (`skills.js:912`): note vs reminder vs board vs document, and "a refused tool is the person's choice". No tokens, no direct SQLite. Size S |
| 16 | Dev loop | `docs/roadmap/HANDOVER.md` | the agents table | Port from `sha1(worktree path)` in `serve.sh`; a smoke table that prints `NOT COVERED` with a reason beside `tests-e2e`. Size S |
| 17 | 54% of our test files (497 of 915) call `read_text`; theirs 27% (349 of 1,300) | `docs/roadmap/WORLD_CLASS_PLAN.md` | 1. The consistency contract | New source-text tests say in the docstring why behaviour cannot be driven; `gate.sh` prints the count. Do not convert old ones. Size S |
| 18 | `docs/SECURITY.md` has no gap list; no dependency-age rule | `docs/roadmap/WORLD_CLASS_PLAN.md` | 12. Security review | A "Known gaps" list in `docs/SECURITY.md`; "pin a release at least 30 days old" in CONTRIBUTING and Dependabot `cooldown`. Size S |
| 19 | The QR trust guide (already placed) must validate what it encodes | `docs/roadmap/WORLD_CLASS_PLAN.md` | Placed from Brief 40, item 2 | One validator for the QR URL: literal private IP or `.local` or a single DNS label; refuse a decimal or `0x` single label (their `pairing.py:40-72`); `qrcode` (BSD) with its SVG factory. Size S |
| 20 | Background job result posted into a chat | `docs/roadmap/BACKLOG.md` | 18. Agent quality | When the first long job must post into a conversation: deterministic message id and delivery marker in one transaction, a reconcile pass at startup, an honest notice if synthesis is unavailable (`docs/BACKGROUND_TOOL_JOBS.md`). Size M, later |

## Left, one line each

- Nothing of Odysseus was run; every container, PyInstaller and CI claim is a
  source read (ANALYSIS section 10).
- Rows 5 to 7 are our defects found while comparing; no code was touched here.
  Row 7 and the unread `.dockerignore` need a Docker daemon to confirm.
- Row 10 needs no NAT64 network to fix, only to exercise end to end.
- Whether PyInstaller output already carries wheel licence files: open
  (row 2).
