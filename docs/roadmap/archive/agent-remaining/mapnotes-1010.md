# mapnotes-1010: what is left

- Ask cannot show a relevant map as a map. Decision taken: retrieval is notes only (a map's entry text is its title, so it grounds nothing). Owner's words: "mindmaps still appear as notes in the ask subtab search". To surface maps, add a `maps` list to `ChatResponse` (`src/memorymap/api/routes_chat.py:673`) and draw it with `mapChip` in `frontend/js/capture-ask.js` (the `raw_results` loop near line 2296), fed by `search.engine` hits of kind `map`.
- `GET /entries/count` (`src/memorymap/api/routes_entries.py:2293`) counts every entry row including boards and the bin; its only reader is onboarding's "is the notebook empty" check (`frontend/js/onboarding.js:73`), so left alone.
- The Timeline labels a map under the "Boards" kind chip (`frontend/js/timeline.js:266`); it draws it with a map chip and an "Open this map" action, so it is not a note leak.
- Notes keep the old `updated_at` rule (any write moves it): `edited_at` answers "when a person changed it", but `lexical_filing` (`src/memorymap/ai/lexical_filing.py:554`) keys stamps on `updated_at`, so the board-only guard in `core/database.py` was not widened.
- `tests/test_ask_answer_object.py::test_ask_is_never_disabled_when_the_model_is_off` fails on this branch before and after these commits (`dataset.needsModel =` in a JS file); not touched.
