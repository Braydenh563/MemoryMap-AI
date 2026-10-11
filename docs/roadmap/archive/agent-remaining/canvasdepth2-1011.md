# canvasdepth2-1011: what is left (INBOX 797, round 2)

The owner, 2026-10-10: "I feel like the mindmap and whiteboard are still
missing a lot of features and options and stuff that draw.io and other
things like the craft repos have :(". Built rows: HISTORY.md "Moved from the
plans, 2026-10-11 (canvasdepth2)"; sweeps `scratchpad/ui-sweeps/map*.js`,
`wb*.js` named there (cd2lib.js holds the shared helpers).

Built: f83ca306f structure per branch; 76335486e callouts; 71e416864 labels;
444a75654 .xmind export and a fuller import; 521048b00 stamps and votes;
04ce22f1c current layer; e24a84a84 hand-drawn look; d61536fd4 tables;
818418ee9 edit data; c21e0b023 every .drawio page.

Open, one line each:

- Structure per branch: the sideways trees keep one column per depth across the map, so a wide structured branch pushes its depth's siblings' children right (`wbMapLayoutPositions`, offsets per depth); XMind spaces per branch.
- Structure per branch: a fishbone or timeline branch on a radial map lays out, but its lines into the block run from the ring; not measured for looks, only for overlap (`mapdepth2.js mapbranchstructure`).
- Callouts, labels, stamps: the map's PNG and SVG pictures not checked for them (`wbExportPng` path); the AI's map tools (`ai/whiteboard_tools`) do not read or set them.
- `.xmind` export: boundaries, summaries, markers other than priority and task, pictures and the map's theme are not written (`_xmind_topic`); not opened in XMind itself (none here).
- Stamps on a board card (MINDMAP_PLAN 14.4 row "Reaction stamps and voting", the card half); linked stickers (14.4).
- Named layers: layer order (WHITEBOARD_PLAN section 6); an item's own eye on a hidden layer still reads hidden and changes nothing visible (`wbSetHidden`, round 1's row).
- Hand-drawn look: labels keep the app's font; fills are solid, not Excalidraw's hachure; a connector with line jumps is redrawn plain by `wbApplyLineJumps`.
- Tables: a column's or a row's own size (a line dragged), merged cells, striped rows, Markdown table paste; find (Ctrl+F) does not read cells (`wbSearchTextFor`).
- Edit data: `%name%` placeholders in labels, find reading the values, the AI tools reading `data.props`, a note card's own data (WHITEBOARD_PLAN section 3).
- `.drawio`: export, rotation and images (`wbDrawioPlan`); a page's frame takes no `page` number of its own, so Present orders it with the board's other frames.
- Found, not mine: `maplayouts.js` "tree-left carries the branch bar on the edge the parent is on" fails on the base commit too (right 1px against left 1px; the sample is the centre topic).
- Not verified: dark theme for the four whiteboard rows (rough, table, data tab, current layer); a real touch double-tap into a table cell (the sweep's 390 run uses a mouse double-click in a touch context); a real multi-page draw.io file from draw.io (the sweep's file is hand-made, plain and deflated).
