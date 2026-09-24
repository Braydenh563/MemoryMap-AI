# codecomplete: completions, Emmet and VS Code features in code documents

Agent E2, worktree cut from `fix/gemini-fixes-5`, server :8799, data
`/tmp/mm-agentE2`. INBOX 394 (c), then INBOX 402, then INBOX 404.

## Landed

- 59649bc Emmet 2.4.11 vendored (`frontend/vendor/emmet`, MIT, own
  on-demand bundle, build.sh, pinned package.json, LICENSE with the list).
- b8db643 INBOX 394 (c): `docCompletionExtras`. `!` + Enter writes the HTML5
  page (caret on the title), Emmet in HTML and CSS, each CSS property's own
  values after `: `, ghost text taken with Tab. `doccomplete.js` 35/35.
- 929dd76 402 (1): Ctrl+/ by the language at the caret (CodeMirror's
  toggleComment), Shift+Alt+A in the palette. Fixed on the way: Ctrl+/ wrote
  "/" over prose it had just commented (registry `editorMenu` ran too); a
  .sql document threw on open (`CM.sql` is the factory; now `standardSQL`).
- 66a0948 402 (2): Emmet in JSX (className, only inside JSX) and XML; wrap
  with abbreviation; balance in and out (`@emmetio/html-matcher` added).
- cbaaad9 402 (3): rename the matching tag as you type (transaction filter,
  one undo); XML auto-close and `</` completion.
- c190d2e 402 (4): CSS colour swatches with the native picker.
- cd8f69a 402 (5): hover docs, this app's own one-liners (no MDN text).
- 96108c5 402 (6): indentation guides per step, bracket pair colours.
- 57a7cfd 402 (7): code symbols as the outline and breadcrumb; Go to a symbol
  in the palette. Fixed on the way: `#` comments were outline headings.
- bd16f93 402 (8): Alt+Z wrap, Show whitespace (document menu).
- e7d1776 402 (9): sticky scroll.

Sweeps, light and dark: `doccomplete.js` 35/35, `doccodevs.js` 25/25,
`doccodevs2.js` 32/32, `doccodevs3.js` 8/8; `doccodeedit.js` 48/48 and
`doccode.js` all pass. Tests: `test_code_completion.py`,
`test_code_vscode.py` (the latter runs the real CodeMirror bundle in node).

## Keys skipped because the registry has them

- Ctrl+Shift+O (Go to symbol): `newChat`. The palette row has no chord.
- Emmet wrap and balance: no chord (VS Code has none either).

## Next (INBOX 404, after merging fix/gemini-fixes-5)

1. Per-language snippets through the completion list.
2. Run with an output console: JS/TS in a sandboxed Worker, HTML in a
   sandboxed iframe, console piped to one panel.
3. Python via Pyodide only as an opt-in extra (core/extras.py).
4. F12 go to definition, Shift+F12 references in a file; Ctrl+Shift+F
   across documents through the search endpoint.

## Found, not fixed

- Port 8799 was held by an orphaned server from a deleted worktree
  (`agent-a52d41d28d1901f69`); stopped it.
- SCSS, Less and SVG are not file types, so Emmet for them has nowhere to
  run; adding them is a backend file-type change.

## Not verified

- The desktop window (WebView2): all sweeps run in headless Chromium.
- The native colour picker's own window: the sweep sets the input's value
  and fires its events; the OS picker never opens headless.
- Ctrl+/ in a note box opening the blocks menu: the binding was removed and
  the guard is unit-tested, but the note composer could not be focused from
  a sweep in the time given.
