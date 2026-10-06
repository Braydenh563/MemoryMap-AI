# progress696-1006: task progress, scheduled passes, embedding models (INBOX 696, 700, 713)

Status: built. 696, 700 and 713 are in HISTORY's "INBOX resolved". The
owner's two addenda to 700 (models found on this computer; install,
uninstall and pull by name) are built with it.

## Where things are

- Background tasks rows: `routes_tasks.collect` (every row has `started`,
  `/tasks` returns `now`), `renderTasks` and `taskSteps` in `ai-tools.js`.
- Scheduled passes: `core/passes.py`, `POST /jobs/passes/{kind}/run`, the
  Run now in `renderJobOverview` (`settings.js`).
- Embedding models: the catalogue in `core/embedmodels.py`, the switch in
  `core/embedswitch.py` (table `embeddings_staged`), the scan in
  `core/embedfind.py`, the list in `frontend/js/embed-choices.js` (lazy),
  Settings, Search and index.
- Sweep: `scratchpad/ui-sweeps/tasks696.js` (1440 and 390, light).

## Not verified

- A real model load for any new built-in model: the sandbox has no
  sentence-transformers. Qwen3 Embedding needs transformers 4.51 or later;
  an older one fails the switch with its message and search stays put.
- The Hub's metadata shape for Pull a model by name is mocked
  (`siblings`, `tags`, `cardData.license`, `gated`), read from the public
  API's documented fields, not a live call.
- Ollama pulls and the found scan against a real Ollama; LM Studio and the
  Hugging Face cache on Windows (paths are `Path.home()` based).
- Stop measured in tests (`test_passes.py`, `test_embedding_switch.py`), not
  in the sweep: no pass in a sweep notebook runs long enough to catch.
- Dark theme for the new rows (tokens only, not measured).

## Left

- Stop part way for the night shift, the backup, resurfacing and the
  embeddings backfill: each is one call with no step to stop at; the row
  says so. The backfill's loop could check `passes.stop_requested`.
- Settings, Packages still has its own Embedding models list (download and
  remove by catalogue id); Search and index's list now does the same and
  more. One of the two should go; recommendation: Packages keeps a single
  line pointing to Search and index.
- The autonomous pass's Run now still runs on its own deduped thread
  (`autonomous.trigger_now`), not the pool.
