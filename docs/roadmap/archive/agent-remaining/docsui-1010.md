# docsui remaining (2026-10-10), INBOX 788's design fixes

Built on `agent/docsui-1010`: graph topic card, Documents References and Outline, code diagnostic card, code panel. Sweep: `scratchpad/ui-sweeps/docsui1010.js` (WIDTH=390, THEME=dark).

- The owner's "accent bar" for the current outline row was not taken: DESIGN.md's list-where-you-are row says a fill and a weight, never a fill plus an edge. If the owner wants a bar, that row changes first (`frontend/css/library-lazy.css`, `.outline-row:has(> .outline-link[aria-current])`).
- A code file's editor is capped and centred at 78ch (`.doc-editor .cm-editor`, `frontend/css/09-editor.css:59`), so its bottom panel is 724px wide at 1440 with 180px of card either side. The panel, footer and keys line now share that column; making a code file use the card's width (the `doc-wide` behaviour) is the owner's call.
- The contents rename (`contentsRenameTopic`, `frontend/js/library.js:11763`) and a note panel's topic rename (`frontend/js/graph.js:4124`) still save on blur with no Save and Cancel buttons; only the topic card has them.
- The Outline's sibling blocks (Comments, Linked from, Notes it draws on) take the new heading row but their rows keep the old styling (`.doc-comment-item`, `#doc-notes`); "References styled the same way" is done for References only.
- Not in this brief, still open in INBOX 788: code templates as document templates, a code modules library, the AI as a coding assistant (DOCUMENTS_PLAN).
- Not verified: a real Python run (the head with "Starting Python" is a status string set by hand; Pyodide is not installed in the test data dir), a real touch device (390 is Chromium's mobile emulation), the hover and focus order of reference actions with a screen reader.
