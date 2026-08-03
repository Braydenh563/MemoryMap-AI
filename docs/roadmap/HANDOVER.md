# Session handover

> **The other four:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the AGPL/MIT constraint) · [HISTORY.md](HISTORY.md) (already built).

Written at the end of the session that landed PR #54. Everything here is either
a fact you can check or a thing I could not check and am saying so about.

---

## Read this before you touch anything

**Two of the five gestures built this session were broken on arrival**, and
both were found by driving them in Chromium — not by reading, not by tests,
not by review. Drag-to-link never linked anything; the composer's drag handle
saved a height and instantly undid it. Both read correctly. Both were already
committed with commit messages saying they worked.

That is the base rate to assume for anything involving a pointer, a drag, or a
moving target: **not zero, about 40%.** The sandbox has Chromium and the app
runs on localhost — the recipe is in CLAUDE.md and there are working scripts to
copy in the scratchpad notes below.

**Four roadmap entries turned out to be already done.** §1's log console (fully
built — follow, both filters, copy, support-bundle export), §35H's streaming
claim, §35C's confident "No", and half of §35A. Each is struck through now with
what was measured. *Check before building* is the rule this repo opens with and
it paid four times in one session.

---

## What is now true that wasn't

### The notebook is a graph the whole app walks

`src/memorymap/entry/paths.py` is one engine with **five** surfaces. If you add
a sixth, use this rather than writing another traversal — a picture and an
answer that disagree about what is connected is worse than either alone.

| Surface | What it does |
| --- | --- |
| `GET /graph/path` | The chain between two notes, or *why* there isn't one |
| `GET /graph/structure` | Clusters, hubs, orphans, and `cluster_of` for colouring |
| `path_between` (tool) | "How are these two related?" for the agent |
| `notebook_structure` (tool) | The notebook's *shape*, as opposed to its filing |
| `search_manager.graph_expansion` | A match brings the notes it links to, in **every** answer |
| `digest_structure_note` | The weekly digest counts what is joined to nothing |

Three constants encode judgements, not tuning. Do not "optimise" them without
reading why:

- **Weighted, not breadth-first.** An unweighted search returns fewest hops, so
  one shared `#misc` beats a three-step chain of deliberate links — technically
  a path, actually noise.
- **`HUB_TAG_NOTES = 12`.** A tag on more notes than this creates *no* edges.
  Otherwise one heavily-used tag makes everything two hops from everything and
  the feature reports a relationship between any two notes it is handed.
- **`MAX_PATH_HOPS = 6`.** An honesty cap, not a performance one. Six
  intermediaries is not a relationship.

### Retrieval reads the question before searching it

`search/query.py` is new. A time phrase becomes a **filter**; the question's
scaffolding comes off before anything is embedded; both searches run and their
rankings are fused by reciprocal rank (`RRF_K`, `FUSION_DEPTH`). RRF combines by
*rank* rather than score deliberately — a cosine similarity and a keyword tally
are not on the same scale, so any weighted sum needs a constant tuned per
notebook, and RRF needs none.

The `search_mode` values a client must handle are now `hybrid`, `semantic`,
`keyword`, `dated`, `recent`, `none`, and `attached + …`.

### The agent

- A follow-through ("implement those suggestions", "do it", "yes") is read
  against the previous exchange. **This was the reported bug**: `focus_for` saw
  only the current message, so a follow-up was offered no category tools at all
  and prose was the only thing it *could* produce.
- It keeps its own reasoning across a tool call (`THINKING_CARRIED_CHARS`),
  carried as content because a `thinking` field is not portable across the two
  dialects.
- An identical read with nothing written since is answered from the turn's own
  history. `fresh_reads` is cleared by a write; `done_calls` — the earned-round
  ledger — never is, or a model repeating one write would buy a round each time.
- A long turn is checkpointed every round, so a stall loses the round rather
  than the conversation.

---

## What I could not check, and you should not assume

1. **Anything involving a real model.** Every provider test runs against a fake
   transport. The follow-through fix, the carried reasoning and the read cache
   are all verified by scripted turns — the *plumbing* is proven, the model's
   behaviour with it is not. Half an hour with a real Ollama would settle it.
2. **§35H's server half.** The client streams — measured, 10 → 25 → 42 → 63 → 94
   characters against a stream paced at one line per 120 ms. What is *not*
   disproved is `ollama_client._ToolTextGate`, which holds prose back while
   deciding whether it is the start of a tool call. On a model that writes tool
   calls as prose that would look exactly like a section landing complete.
   **Do not rewrite the timeline** — measure the gate.
3. **The desktop shell.** §35E is fixed by reproducing the *behaviour* (wiping
   localStorage between loads), not by running pywebview, which is not in this
   sandbox. The remaining §35E items — file saves and markdown export in the
   desktop window — are untested and unfixed.
4. **Windows.** §8b's two fixes remain unverified on Windows itself.

---

## Where I would start next

1. **§36D's bottom bar.** The roadmap has already made the hard decision: the
   AI status pill moves *down* rather than appearing twice. Note the header is
   now consistent (one `--header-control-h` for every control) and has gained a
   notifications bell — so this is a move, not an addition, and it will touch
   what was just tidied.
2. **§4 the Library, and the tab bar it lives in.** Still gated on the decision
   §36F asks for: does Library *absorb* Documents and the conversation sidebar,
   or does the bar gain an overflow? Decide before building; it is much more
   expensive afterwards.
3. **§9's decorative half** — skins, minimap, PNG/SVG export of the current
   view. The utility half is done.
4. **§10's `events` table**, so the Timeline's bands can be events and places
   rather than only categories and tags.

---

## Practical notes for the next session

- **Running the app:** `PYTHONPATH=src MEMORYMAP_DATA_DIR=<scratch> .venv/bin/python -m uvicorn memorymap.api.app:create_app --factory --port 8781`.
  The `PYTHONPATH` is required and is not in CLAUDE.md's recipe.
- **Do not install torch.** It has failed to install in several sessions. The
  suite passes without it and without `sentence-transformers`.
- **Driving the graph in Playwright**, both traps I hit:
  - press the `.graph-core` circle, **not** the `.graph-node` group — a group's
    bounding box includes the label below it, so its centre is empty space;
  - a module-scope `let` is **not** a property of `window`. `graphNodesRef`
    works as a bare identifier inside `page.evaluate`; `window.graphNodesRef`
    is `undefined` and will quietly tell you the graph is empty.
- **Pacing a stream:** Playwright's `route.fulfill` delivers one body at once
  and cannot show whether a client renders incrementally. Replace `window.fetch`
  with a `ReadableStream` instead.
- **Lints that are load-bearing:** `test_style_scale.py`, `test_frontend_ids.py`,
  `test_frontend_handlers.py`, `test_docs_layout.py`, and now
  `test_docs_site.py` (the Pages site) and `test_ui_state.py` (the settings
  mirror). If one fails it has found something real.
- **CI runs `ruff check .`** and CodeQL. Run ruff locally before pushing; CodeQL
  caught a genuine polynomial-ReDoS in code I had written that same session.
