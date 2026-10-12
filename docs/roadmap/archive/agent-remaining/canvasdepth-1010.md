# canvasdepth-1010: what is left (INBOX 797)

The owner, 2026-10-10: "I feel like the mindmap and whiteboard are still
missing a lot of features and options and stuff that draw.io and other
things like the craft repos have :(". Ranked rows: WHITEBOARD_PLAN.md and
MINDMAP_PLAN.md, "canvasdepth, ranked by how often a person meets the gap";
built rows are in HISTORY.md "Moved from the plans, 2026-10-10 (canvasdepth)".

Built: 81bae3ff5 audit; 83348ead4 draw.io sets with ports; f6e7b2273 Mermaid
state, class, sequence and .drawio import; 60d8a8250 swimlanes; d874867ac
named layers; fbebc1f13 find and replace; the laser pointer (this file's commit).

Open, one line each:

- Whiteboard row 7, the hand-drawn look (Excalidraw): a board option that roughens strokes; WHITEBOARD_PLAN.md "canvasdepth, ranked" item 7. M; touches every sketch render path in whiteboard.js.
- Whiteboard row 8, tables (draw.io): WHITEBOARD_PLAN.md section 12. M.
- Whiteboard row 10, edit data and placeholders: WHITEBOARD_PLAN.md section 3 (Brief 44 phase 7). M.
- Named layers: a current layer new items land in, and layer order (WHITEBOARD_PLAN.md section 6 rows). The create paths are many (`apiJson("/whiteboard/sketches"` in whiteboard*.js); one helper would carry `data.layer`.
- Named layers: an item's own eye on a hidden layer reads hidden and pressing it changes nothing visible (`wbSetHidden` compares `wbItemHidden`, which now includes the layer; whiteboard.js `wbSetHidden`).
- `.drawio`: pages after the first, rotation, images and `.drawio` export (`wbDrawioPlan`, whiteboard-interchange.js); the report names what was dropped.
- Mermaid: sequence `alt`/`loop` blocks are a label, not a frame round their messages; class generics and namespaces are skipped (`wbMermaidSequenceParse`, `wbMermaidClassParse`).
- Class diagram ends use the triangle and diamond caps that the canvasui branch adds (`WB_CAP_KINDS`); on this branch they fall back to the arrow (`wbMermaidCap`). After both merge, re-run `scratchpad/ui-sweeps/wbmermaidkinds.js`.
- Mind map row 1, a structure per branch (XMind): `layout` on a topic read by `wbMapColumnPositions` for its subtree; MINDMAP_PLAN.md "canvasdepth, ranked" item 1. L.
- Mind map rows 2 to 5: callouts, labels under a topic, `.xmind` export, stickers and votes (MINDMAP_PLAN.md "canvasdepth, ranked").
- The Guide entries `board-library` and `whiteboard-controls` sit at 1,918 of the 1,920 characters `tests/test_help_controls.py` allows; the next help line for the board needs a split topic, not a longer one.
- Not verified: dark theme for the new rows and the laser; touch drag of a draw.io shape from the panel; a real draw.io file from the app (the sweep's files are hand-made in the format, plain and deflated).
