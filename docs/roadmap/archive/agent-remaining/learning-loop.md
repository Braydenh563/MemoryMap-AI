# The learning loop: what is built, and what is left of I9

Brief 23 built I7 and I4; Brief 24 built I9's backend and the first pass of
I1 (2026-09-13 evening). Rewritten then, so the next pass starts from what is
there rather than from the spec's picture of it.

## Built, and green

| What | Where | Specs |
| --- | --- | --- |
| The corrections store and its boosts | `src/memorymap/ai/learning.py` | `tests/test_learned_spec.py`, the five I7 tests |
| The three consumers: filing, search, link suggestions | `librarian` reads `learning`; `search_manager._learned_order`; `routes_entries.link_suggestions` | same file |
| `POST`/`GET /learned/corrections` | `src/memorymap/api/routes_learned.py` | same file |
| Resurfacing | `src/memorymap/ai/resurface.py`, `routes_resurface.py`, `note_scores` | `tests/test_resurface_spec.py`, all six |
| The derived facts pipeline: table, derivation, lifecycle, switches, routes, the night task | `core/database.DerivedFact`, `ai/facts.py`, `api/routes_learned.py`, `api/routes_night.py`, `ai/autonomous.py` | `tests/test_learned_spec.py` (all nine I9 tests, no markers left in the file), `tests/test_derived_facts.py` (11 more) |

`tests/test_learned_spec.py` now has **no strict-xfail markers left**. The
reasoning behind the shape of the pipeline, including the decision not to ask
a model for a JSON list of claims, is in `ai/facts.py`'s module docstring and
in HISTORY.md, "Built, I9's whole backend and the first pass of I1".

## What is left

- **The Settings section (frontend).** Not in Brief 24 and not built. The
  backend it sits on is complete: `GET /learned?kind=&q=&limit=&offset=`
  returns `{items, total}` with `X-Total-Count`, `GET|PATCH|DELETE
  /learned/{id}`, `POST /learned/{id}/reset`, `GET|PUT /learned/switches`,
  `DELETE /learned` (body `{confirm: true}`), `GET /learned/export`. Every row
  carries `span` as `[start, end]` into `entries.content`, so "open the note
  scrolled to the sentence" needs no further backend work.
- **`POST /learned/bulk`** (`{ids, action}`), in the plan and not built: no
  caller exists until the table does, and a route with no caller is a route
  nothing keeps honest.
- **I1's later passes**: tensions, duplicates, entities and dates as kinds in
  the same table. `ai/tensions.py` and `ai/entities.py` already produce the
  first two in their own shapes; folding them in means giving each a span and
  a `DerivedFact` row, not a second pipeline.
- **`GET /night/latest` and the morning card** (I1's own surface). `POST
  /night/run` returns the counts a card would need; nothing stores a run yet,
  so grouping facts by run needs the `night_runs` table the plan names.
- **The four switches with no runner yet** (`margin_reader`, `open_questions`,
  `evidence_checks`, `model_bench`) are stored and reported but gate nothing,
  because their features are not built. Each of those briefs adds its
  `runner_enabled(...)` check.

## Not verified

- No real model has run the night pass. What a small local model keeps when
  asked to narrow a candidate list is untested, which is the standing caveat
  (CLAUDE.md section 4). The pass is designed so that a bad reply keeps the
  local candidates rather than emptying the table, which is the failure this
  whole section exists to prevent, but that path is exercised only against
  the fake transport.
- Nothing was measured past a test-sized notebook. The pass is O(notes) with
  one query per note for the already-known fingerprints, which is the first
  thing to profile when a real notebook goes through it.
- The resurfacing numbers are still this sandbox's: read 6.7 ms at 800 notes,
  compute 50 to 230 ms.
