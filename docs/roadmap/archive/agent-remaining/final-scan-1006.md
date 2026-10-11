# final-scan-1006: the 0.4.0 release candidate's last scan (INBOX 645)

Scope: `git diff origin/main...HEAD` (PR 162, 2,304 files). Security, CodeQL
shapes, the four review shapes on this release's largest features, CI on a
tag. Not redone: SEC-01 to SEC-17 (HISTORY, "Security audit fixes,
2026-10-05" and its second pass), whose pinning tests were run and pass
(`test_every_route_is_locked`, `test_security_boundaries`,
`test_outbound_inventory`, `test_update_ask_once`, `test_lan_tls`,
`test_injection_fence`, `test_no_innerhtml_interpolation`,
`test_markdown_link_schemes`, `test_lazy_bundle_calls`, `test_motion_tokens`).

## Landed (each test written first and seen failing)

| Commit | Class | What |
| --- | --- | --- |
| 94f1747 | ReDoS (`py/polynomial-redos`) | `entry/app_import.py`: five quadratic patterns on uploaded Evernote and Notion exports (the `en-media` pair, `en-todo`, the xml/doctype strip, `_NOTION_LINK`, `_NOTION_ID`), 2 to 10 s on 20 to 180 KB, so minutes on a 200 MB ENEX; each now one pass (under 0.5 s on the same pumps). |
| df31d86 | ReDoS (`py/polynomial-redos`) | `ai/agent.py` `_ADDRESS` (SEC-02's named-site reader) on the chat question: 64,000 chars of `a.a.` took 61 s; a lookbehind keeps a match from starting inside a host, now under 0.5 s. |
| e6f5f41 | CodeQL `py/empty-except` | The five bare `pass` handlers new since main (provider lenient JSON, agent `tool_choice` fallback) say why. |
| 92dfd7f | Bug (500) | `routes_whiteboard._clean_theme` and `_clean_levels`: JSON `1e999` is infinity and `int(inf)` raised OverflowError on a theme patch, and the cleaner runs on every map read. Same catch added to `routes_settings._validated_context_windows` (unreachable through the route's int model; hardened). |
| 04a69b8 | CI (release) | `release.yml` notes: the awk range `/^## x/,/^## /` ended on its own header, so every release's notes were empty (GitHub's generated list instead). Fixed; and since 0.4.0's section is about 278,000 chars and GitHub refuses a body over 125,000 (failing the release job), the notes are cut at a line end under 120,000 bytes with a link to CHANGELOG.md, behind a unique heredoc delimiter. Measured on the real CHANGELOG with the header renamed to 0.4.0: 119,592 chars. |
| 184030b | CI (release) | `workflow_dispatch`'s `${{ inputs.version }}` was spliced into `run:` (Actions script injection); now through `env:`, and a test holds every run block to it. |
| e7ef51d, 5211870, 1ec5be7, 543fccc | ReDoS (`py/polynomial-redos`) | Item 4 (found, then fixed): `manager._md_links`, `docexport.inline_split`, `answer_trim._METADATA` (each test first; 0.3 to 15 s on 20 KB, now under 0.02 s) and `questions._title` (already linear, bounded loop). Detail in `quickwins-1006.md`. |
| d1ada94 | Raw exception text | Item 5 (found, then fixed): Background jobs shows a plain sentence for an unreadable document and an unresumable job; the exception is in the log. |
| 9ea1470 | CI (E2E) | The `first-run` project does not retry. |

## Reviewed, nothing to fix

- Zip slip and XML: `backup_bundle._safe_target` (resolve plus `is_relative_to`, absolute members refused), `app_import.expand` (in memory, declared sizes capped), XMind (one member, size checked), ENEX and OPML through defusedxml, `searxng_install` tar with `filter="data"`.
- Subprocess: no `shell=True`, `os.system` or string command in src, packaging, scripts, scratchpad or tools.
- Secrets in logs: no logger call carries a password, token or key; new route logs carry ids or `logbuffer.safe_value`.
- Web fetch: `security.public_addresses` checks every resolved address and refuses credentials in URLs; every redirect hop is re-checked and pinned (`websearch._get_external`, `webclip`, `routes_update`).
- Media cookie: httponly, `secure` on HTTPS, SameSite strict.
- CSP: no inline `style=` built in frontend JS (the pasted-HTML cleaner rewrites it to `data-mm-style=`).
- Stand-ins (`LAZY_ENTRY_POINTS`): a scan of every call site whose result is used synchronously found 8; each handles the promise.
- The four shapes on: `:ph-name:` reading-view icons (class from `[a-z0-9-]{1,40}`, DOM built), the map icon field (`_is_one_emoji` or the Phosphor pattern), map levels, drag to delete (`wbTrashTake` cancels the gesture so the save path returns), progress phases (`meta` is sent once per stream, so the load-hint timer cannot leak; `setStatus` idempotent), whole-line copy and cut (CM6 calls `preventDefault` when a handler returns true, checked in the vendored bundle), the status-slot move, drag-edge, history rows (`mediaSrc`; a private note gets no thumbnail).
- CodeQL on the PR: all 87 review threads resolved; the head's `Analyze (python)` green with no new alert.
- CI on the head: every job green; E2E 6 m 41 s of its 15 m timeout.

## Open (found, not fixed)

1. Pre-tag checklist: `__version__` is `0.3.32` and CHANGELOG's header `## [Unreleased]`; `release.yml` refuses a `v0.4.0` tag until `__init__.py` says 0.4.0, and the notes need `## [0.4.0] - <date>` (README's version is held by `test_readme_freshness`).
2. CI margin: Tests (Python 3.13) took 16 m 14 s of its 25 m timeout on the head (3.11 15 m 01 s, 3.12 14 m 37 s). A slow runner is a red build; raising it is the owner's call.
3. Linux release smoke is weaker than Windows': `build-linux-package` only curls `/`, while Windows runs `packaging/frozen_smoke.py` (every lazy asset and the API), and no PR job builds the Linux bundle. Recommend `frozen_smoke.py` there too; not changed, as it cannot be verified without a Linux PyInstaller run.

## Not verified

- No browser was driven: the feature reviews are reading, not sweeps (each feature's sweep is named in its own commit).
- The release changes are verified by running the step's script in bash (`tests/test_release_smoke_step.py`) and a YAML parse; no tag run.
- CodeQL's verdict on these six commits arrives with the next push.

## Log

- done: 94f1747, df31d86, e6f5f41, 92dfd7f, 04a69b8, 184030b; `gate.sh --changed` green (92 test files, 1,624 passed, 10 skipped).
- next: nothing; the open items are the orchestrator's.
