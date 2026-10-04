# Whiteboard and mind map tails, ranked (2026-10-04)

Ranked by what a person making boards and maps notices first, then cost
(S under an hour, M a few hours, L a session). Every row was checked against
the running app on this head (`serve.sh 8850`), not against the docs: four of
the five tails the brief named were already built.

## Named in the brief, checked first

| Item | State on this head | Measured by |
| --- | --- | --- |
| WHITEBOARD_PLAN decision 7's other half (one highlighter table, two renderers) | built 2026-09-20 | `sketchparity.js` 10/10 |
| The phone context bar comparison | decided and built (it pins) | `wbcontextphone.js` 6/6 at 390x844 |
| Sketch handles at zoom | built | `wbhandlezoom.js` 17/17 |
| The arrange panel items (INBOX 12) | built; the probe was stale | `wbinbox12.js` 4/6 to 6/6: it read the first of four `data-wb-ctx="arrange"` groups (Group, Ungroup) and reported the other ten missing |
| The mapux leftover list | bend-grip right-click built 2026-09-26, marquee Escape built 2026-09-23; three rows left (7, 11, 13 below) | `maptwokinds.js`, `wbmarqueeescape.js` |

## Ranked

| # | Item | Impact | Cost | Source |
| --- | --- | --- | --- | --- |
| 1 | **Map: Tab, a name and Enter typed at speed saved two empty topics.** The Enter reached the map's Enter before the editor opened. A required sweep was red on the base (`wbkeywalk.js` 8/10). | high | S | found here |
| 2 | **Board: text inside a shape.** Double-click (or Enter on) a rectangle, ellipse, diamond or triangle does nothing; tldraw, Excalidraw, Miro and FigJam all type a centred label. The first thing anyone drawing a flowchart tries. | high | M | competitor |
| 3 | **Map: a topic can be a task.** A checkbox on the topic, done state, and a parent showing how many of its tasks are done (MindNode, XMind). MINDMAP_PLAN 12.2 item 4's first slice. | high | M | plan + competitor |
| 4 | **Quick sketch pad bar wraps to two rows at 820 on Large text** (INBOX 276): `sketchbar.js` FAIL, rows=2 at 820/large-text and 820/large+spacious. | medium | S | plan (INBOX 276) |
| 5 | **Map: nothing says which kind a connect drag will make while it is in flight** (13c remainder). | medium | S to M | MINDMAP_PLAN 13c |
| 6 | **Map: a note behind a topic** (12.2 item 5; XMind, MindNode notes). | medium | M | plan + competitor |
| 7 | **Map: outline view beside the map** (12.2 item 8). | high | L | plan |
| 8 | **Map: branch numbering toggle** (12.2 item 7). | low | S to M | plan |
| 9 | **Board: labels on connectors** (Miro, FigJam, Excalidraw). Double-click a link adds a bend today, so the gesture needs a decision. | medium | M | competitor |
| 10 | **Map: branch palette and font at map level** (13e remainder; drawn in two places, decision 8). | medium | M | MINDMAP_PLAN 13e |
| 11 | Map: Insert and Arrange markup still in a map's top bar (18 hidden controls). Not user visible. | low | S | mapux2 |
| 12 | Map: boundaries, summaries, presentation mode, comments (12.2 items 1, 2, 9, 6); board frames and lock. | medium each | L each | plan |
| 13 | Needs the owner: 13g middle-button pan, INBOX 419 (WebView2 menus), right-drag pan (a decision), the AI half (fake transports only). | n/a | n/a | plan |

Built this run: see the plans' Built blocks in HISTORY.md and the CHANGELOG.
