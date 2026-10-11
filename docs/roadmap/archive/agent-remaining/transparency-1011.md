# transparency-1011

INBOX 805 (one process ledger, live lines, a running indicator, backup rows),
807 (Where your data went says what each address was for), 811 item 4 (a
"Started:" notice updates in place when its run ends).

## Step 1: every process, and where it shows today (read from the code, 2026-10-11)

"Running" is Settings, Running jobs and the status bar's job slot (`GET /tasks`);
"Activity" is the Activity panel's Running tab (`GET /activity`); "History" is
the finished list (`taskhistory`); "Last run" is `jobruns` (`/jobs/last-runs`);
"Lines" is a per-run log a person can read.

| Process | Where it starts | Running | Activity | History | Last run | Lines |
| --- | --- | --- | --- | --- | --- | --- |
| Chat answer, Ask, composer answer | routes_chat `_interactive_lines` | no | yes ("Answering in Chat") | no | no | no |
| Agent turn (tool calls) | same stream, mode agent | no | yes (same label) | no | no | no |
| Skill run | same stream | no | yes ("Running a skill") | no | no | no |
| Document review | routes_documents | no | yes | no | no | no |
| Guide answer | routes_help | no | yes | no | no | no |
| Drafting | routes_drafts | no | yes | no | no | no |
| Transcription | routes_recordings, routes_voice | no | yes | no | no | no |
| OCR of a pasted picture | routes_files `activity.track("ocr")` | no | yes | no | no | no |
| Vision OCR, captions | vision_ocr, captioning | yes | yes | yes | yes | captions only |
| Filing, warm-up, note vectors, file reads, bench (pool jobs) | core/jobs.py `_work` | yes (not the quiet kinds) | yes | no | bench only | no |
| File describe, OCR, vision | core/filejobs.py | yes | yes | no | no | no |
| Embedding warm-up | embeddings.py | yes | yes | yes | no | no |
| Embeddings backfill | embeddings.py `job_run` | yes (live) | yes | no | yes | yes |
| Re-index | model_manager.py | yes | yes | yes | yes | no |
| Model pull, embedding model, packages, SearXNG install | model_manager, embedmodels, extras, searxng_install | yes | yes | yes | yes | packages and SearXNG |
| Embedding model switch | embedswitch.py | yes | yes | yes | yes | no |
| Start-up housekeeping, daily backup | app.py `_startup_maintenance` | yes (live) | yes | no | yes | yes |
| Run now passes: backup, night shift, resurface, backfill, housekeeping | passes.py | yes | yes | no | yes | some |
| Autonomous pass | autonomous.py | yes | yes | yes | yes | no |
| Import, export | routes_import, routes_settings | import only | import only | no | yes | no |
| Duplicate scan, tidy, link reasons | routes_duplicates, routes_tidy, routes_entries | live only | live only | no | yes | no |
| Code run in the sandbox | run_sandbox.py | no | yes | no | no | no |
| Grammar check | the browser's WASM worker, no server process | no | no | no | no | no |

The gaps: interactive model calls never reach Running or History; most
`job_run` passes never reach History; no run says who started it; no run
keeps its lines once it ends; Agent tool calls are visible only in the chat.

## Left

All seven steps built (commits on agent/transparency-1011). Open, for the
orchestrator to place:

- Measured only against synthetic and one real row: the privacy grouping
  (a real clip of example.com, through the sandbox proxy, which refused it)
  and two synthetic running tasks in the status bar. No real model ran.
- The status ring keeps turning under the OS reduced-motion setting because
  the app's own default is progress motion "always" (the owner's order);
  with "auto" it pulses (the shared spinner recipe). Not measured with "auto".
- Backup size uses `humanBytes` (KB under 1 MB), the app's one size format,
  rather than always MB.
- Purposes are named at nine call sites (web search, page reader, clipper,
  update check, release list, update download, SearXNG install, optional
  downloads, embedding model). A new outbound call site must wrap itself in
  `egress.purpose` or `@egress.labelled`; no lint checks that yet.
- Interactive turns (chat, agent) are listed in Running jobs but never
  announced (`WATCHED_KINDS`); the Guide, drafting and document review run
  through `activity.track` and get a ledger run, but no narrated lines.

