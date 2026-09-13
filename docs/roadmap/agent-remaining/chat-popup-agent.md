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
- `5bd85ee` INBOX 182 (over `8e652a2`): right-click and long-press on any
  link opens one `kebabMenu` at the pointer, with the DESIGN.md recipe row and
  its ratchet (`scratchpad/ui-sweeps/linkmenu.js`).
- `8e652a2` WIP, INBOX 182: `openMenuAtPoint` plus the delegated contextmenu
  and 500ms hold listeners in `frontend/app.js`, the `.pointer-menu-host`
  recipe in `frontend/css/02-chat-graph.css`,
  `scratchpad/ui-sweeps/linkmenu.js`.

- `9bd0c07` INBOX 189 and 190's label: the palette names a map a map, a board
  a board, and scopes the run to `board_ids`
  (`scratchpad/ui-sweeps/agentsubject.js`).

- `c052eb6` INBOX 190 and 193: the wand and the '?' in the header and the
  Settings head, the Guide as one shared `openSheet`, per-tab starters, arrow
  keys through them, a state line naming the tool
  (`scratchpad/ui-sweeps/agentwide.js`). CHAT_PLAN decisions 13 and 14.

- `6147863` INBOX 190's last part: `/help/ask` takes the tab and the tab's
  own control labels; `TAB_TOPICS` grounds a question that names nothing.
  INBOX 190 closed.

## Next

1. `chat-timeline-skills.md` item 1's last step: the hover highlight of
   `note.content.slice(start, end)` in the sources panel.
