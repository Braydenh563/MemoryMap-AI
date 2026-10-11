# codedocs-1010: code as documents (INBOX 788), what is left

Brief: templates, snippets library, coding assistant, code view width. All four
built on `agent/codedocs-1010`; measured by `scratchpad/ui-sweeps/codedocs.js`
(templates, snippets, assist, contrast, width) at 1440 and 390.

## For the orchestrator at merge

- INBOX 788 resolves (`python scratchpad/inbox_resolve.py 788`); DOCUMENTS_PLAN
  "Placed from INBOX, 2026-10-10 (code as documents)" gets its pointer and the
  Built block goes to HISTORY (standing order 10). Not done here: agents do not
  edit INBOX.
- `docs/CODEMAP.md` is regenerated on each commit; a merge conflict there is
  `python scripts/codemap.py`, not a hand merge.

## Left, one line each

- Right-click and long-press on a snippet row open its menu: needs
  `.doc-snippet-item` in `ROW_MENU_HOSTS` (frontend/js/navigation.js:110), a
  boot file, and TOTAL_CAP had about 35 bytes. The row's ⋮ works.
- Edit a saved snippet's code in place (today: rename and retag; new code is
  Save selection again). `PUT /code-snippets/{id}` already takes `code`.
- Your own snippets in the editor's completion list (the owner's "like with the
  whiteboard and mindmap": the board library's tiles are placeable from the
  canvas too). documents-code.js `docCodeSnippetOptions` is per type and cached.
- Snippet sets export and import (the board library's own export leaves
  snippets out on purpose: `routes_board_library.export_library`).
- The assistant answers in one non-streamed turn and keeps no thread: a
  follow-up question does not see the last answer (frontend/js/documents-codekit.js
  `docAssistAsk`). VS Code's chat keeps the thread.
- The code dock at 390 is 238px tall, four rows (Format with its word, Run, the
  "Install Python in Settings, Packages" line on its own row): measured before
  this work too (the new buttons sit on the existing third row). Found, not fixed.
