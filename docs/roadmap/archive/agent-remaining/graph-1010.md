# graph-1010: what is left

- Brief 39b: "How are they different from categories??": turning a topic into a category (or offering it when a topic's notes span categories) is the taxonomy's; GRAPH_PLAN "Decision made, 2026-10-10" says so.
- "Should topics from the graph be more integrated app wide??": the note card's topic chip is on every card in a topic (60 of 60 on the seed); on a tag-named topic it repeats the tag chip beside it (`noteTopicChip`, notes-list.js). Not measured on the owner's notebook; a dedupe against the card's own tags is the next judgement.
- The floating rename field over a plate is the app's text field, 42px tall over a 17px plate (`gcRenameTopicInline`, graph-canvas.js); not seen by eye.
- A topic drag writes its core note's pin with its own `PUT /graph/pin` beside the group's one `PUT /graph/pins` (`gcDragEnd`, graph-canvas.js).
- `scratchpad/ui-sweeps/graphfslightbox.js` fails three lines: it calls the lazy `openLightbox` and reads `.lightbox` in the same tick; the sweep needs an await, the app is unchanged.
- `graphfit.js`'s offX is now 10 to 19 by design: a fit centres the drawing, names included (`gcBalanceFit`); `graphfitmargins.js` is the measure of the drawing.
- Base branch, not this branch: `test_plan_hygiene.py::test_no_conflict_marker_survives_a_merge` (a docstring underline in `src/memorymap/vendor/networkx/conftest.py:3`), `test_readme_freshness.py` (README tool count, registry 67), ruff 1,140 findings under `src/memorymap/vendor/`.
- GRAPH_PLAN has no open phase left; its live list is the decisions.
