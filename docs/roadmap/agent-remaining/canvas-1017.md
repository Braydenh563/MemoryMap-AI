# canvas-1017: B29, B35, B37, B38, B73, B70, B78 (INBOX 904)

Order: B29, B35, B37, B38, B73, B70, B78. Sweeps: scratchpad/ui-sweeps/wb1017-*.js, companion1017-*.js.

- B29 whiteboard: done (commit below). "Popup controls all over the place" not pinned to a measurement: the multi bar measured one row, all tops equal (5px), 575x38; placed as a design request.
- B35 companion: done (adopts a scroll area that only began to scroll after the perch; drift 71px mid / 2037px settled to 0/0, companion1017-dash3.js). dash2.js (perch on each panel with the page already scrollable) drift 0 before the fix: that case was never the bug.
- B37: fixed on the graph (middle drag moved camera 1.8px of 93 and mousedown default not prevented; now 93/-47 and prevented, pan1017-b37graph.js). Board and mind map measured clean (pan1017-b37.js: worst deviation 0px from the first 1px move); Windows autoscroll itself not observable here (Linux Chromium).
