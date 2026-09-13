# Chat and popup agent, 2026-09-13 evening: what landed and what is left

The chat agent's run against INBOX 181, 182, 183, 187, 188, 189, 190 and
`chat-timeline-skills.md`'s chat items. Port 8795, data dir `/tmp/mm-chat`.

## Landed

- `6167d5e` INBOX 187: the popup agent's caret waits for the first token
  (`scratchpad/ui-sweeps/agentcaret.js`).
- `614b987` INBOX 183's badge: the subline separator left the context pill
  (`scratchpad/ui-sweeps/chatbadge.js`).
- `16c96ea` INBOX 188: the table bar is Copy plus a `kebabMenu`
  (`scratchpad/ui-sweeps/tablefull.js`).
- `9ce8353` INBOX 181: the fit toggle works in a bubble, full view resizes
  columns and rows (same sweep).
- `8e652a2` WIP, INBOX 182: `openMenuAtPoint` plus the delegated contextmenu
  and 500ms hold listeners in `frontend/app.js`, the `.pointer-menu-host`
  recipe in `frontend/css/02-chat-graph.css`,
  `scratchpad/ui-sweeps/linkmenu.js`.

## Next

1. INBOX 182, finish: the anchor is losing to `.small.icon-only` so the menu
   opens 28px across and 32px below the pointer rather than at it (fix the
   `.pointer-menu-anchor` rule's specificity in `02-chat-graph.css`), and a
   second right-click on the same link may not reopen the menu. Then the
   DESIGN.md recipe row and the `tests/test_ui_recipes.py` ratchet, the
   CHANGELOG line and `inbox_resolve.py 182`.
2. INBOX 189 and 190's "open note" question: `syncAgentOpenNoteToggle` and
   `agentOpenSubject` in `frontend/app.js` (~40685) name a board and a map as
   notes; five label states wanted, and the run's scope must carry the kind.
3. INBOX 190: the popup agent app-wide and the help chat (CHAT_PLAN decision
   9, section 4), including INBOX 193 for the help chat's name.
4. `chat-timeline-skills.md` item 1's last step: the hover highlight of
   `note.content.slice(start, end)` in the sources panel.
