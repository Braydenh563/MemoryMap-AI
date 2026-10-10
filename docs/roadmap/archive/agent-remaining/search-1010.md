# search-1010: Brief 47, the search box (WORLD_CLASS_PLAN 25a, decision 46)

Branch `agent/search-1010`, worktree `scratchpad/wt-search`, port 8816.

## Built

- `tests/test_search_box.py`: the eight operators against `search/query.py` (they already passed: the reader existed), the route's shape, one of each kind by one query, paging, the boot reconcile, the box's lazy load, chips, keys, help and saved searches.
- Index: `chat` kind (saved chats slot 9, Ask turns slot 10); `index.reconcile_sources` fills a late source once at boot. Kinds indexed: 7 before (note, document, board, map, file, bookmark, reminder), 8 after.
- `GET /search`: `page` (1 to 20) beside `limit`; answers `page`, `limit`, `more`.
- `frontend/js/search.js` (lazy, `LAZY_MODULES.search`, stand-in `openFinder`, preloaded at 3 s): Find anything moved whole out of spaces-find.js, plus a Chat chip and opener, a kind chip on every row, Show more results, `openFinder(q, { kind })`, Escape left to a dialog above the box.
- Saved searches: preferences `saved_finds` (decided over a table: the one stored list beside the sidebar's rows, the saved filters, is preferences), the star in the box's head, rows under Saved searches in the Notes sidebar (row recipe of `#category-list`, a ⋯ with Rename and Forget).
- The Notes filter's no-match state: Search everything (`data-empty-action="search-everything"`).
- Fixed on the way: the card ran 11 px past a 900 px window (ceiling 12vh vs the overlay's 15vh drop) and 111 px past 390x844; zero kind chips were 2.32:1 (opacity 0.55, now `--muted`).
- `tag:` alone now filters in the SQL (`engine._filter_only`): over the newest 200 rows it found 5 of the ~110 notes tagged `tag3` at 5,000 notes; a test fails on the old engine (0 of 3).
- Help: the box's '?' lists every operator and the keys; Guide topics `search` (help_chat.py) and `find-anything` (help_topics_more.py). No manual parity row: saving a search is not an agent tool.
- Sweep `scratchpad/ui-sweeps/search.js` (+ `search-seed.py`); bench `scratchpad/search-bench-1010.py` (5,000 notes from `scripts/scale_test.py`'s `build_notebook`).

## Left

- WORLD_CLASS_PLAN 25.4 row "25a Search": move its Built block to HISTORY.md at merge (orchestrator; agents do not edit plans).
- "the sidebar's search field routes here" (Brief 47 step 3): the Notes sidebar has no search field; the routes built are the no-match Search everything button and the saved-search rows. If a sidebar field was meant, it needs naming.
- Per-turn chat hits: a chat is one row (the whole thread); a hit opens the chat, not the turn that matched (`index._conversation_row`).
- The phone's saved-search rows live in the Notes sidebar sheet; not driven at 390 beyond the DOM count.
- Found, not fixed: `GET /resurface/near/{id}` 500s (`ValueError: shapes (384,) and (4,) not aligned`) when the notebook holds vectors of another dimension (seen on the scale_test fixture's 4-d vectors after a 384-d note was saved); a model switch with stale vectors would do the same (`api/routes_resurface*`).
- Found, not fixed: `tag:` with words still filters after the keyword pass's 200 candidates (`engine.search`, the `wanted_tags` block), so a common word plus a rare tag can miss.

## Not verified

- Real embedding model: every timing is keyword plus the fake backend (no torch here), so `hybrid` ranking cost at 5,000 notes with a real model is not measured.
- The saved-search ⋯ menu was not opened in a browser (Rename and Forget run through `persistSavedFinds`, which the sweep exercises).
