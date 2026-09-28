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

## INBOX 404, code side

- ff219d2 merged fix/gemini-fixes-5 (INBOX and CHANGELOG kept both sides).
- b1c7339 (1) snippets: tables for Java, C#, C, C++, Go, Rust, Kotlin,
  Swift, Ruby, PHP, R, SQL and shell; extra rows for JS, TS and Python.
- bbaccfc (2) Run: `/documents/run-sandbox` (`api/run_sandbox.py`, its own
  CSP: opaque origin, `connect-src 'none'`), JS in a blob worker, HTML in a
  srcdoc frame, console and uncaught errors by line in `.cm-run-panel`;
  Stop, 10 s and 500-line limits. `docrun.js` 18/18 light and dark;
  `tests/test_run_sandbox.py` holds the policy. Route added to
  `test_every_route_is_locked.py`'s OPEN list with its reason.
- f07b5bc (4) F12 definition (scope-aware for JS/TS/Python, a defining
  word for the stream modes), Shift+F12 uses, Ctrl+Shift+F Find anything on
  documents.

## Next

1. (3) Python via Pyodide: not built, a decision is missing (INBOX 404 has
   the recommendation: a "download" kind of extra, pinned `pyodide-core`
   with its sha256, served beside the run sandbox). The Run button on a .py
   file says so today (`DOC_RUN_CANNOT.py`).
2. TypeScript Run: vendor sucrase (MIT) to strip types, then run as JS;
   `DOC_RUN_CANNOT.ts` says it needs compiling today.

## Found, not fixed

- Port 8799 was held by an orphaned server from a deleted worktree
  (`agent-a52d41d28d1901f69`); stopped it.
- SCSS, Less and SVG are not file types, so Emmet for them has nowhere to
  run; adding them is a backend file-type change.

## Not verified

- The desktop window (WebView2): all sweeps run in headless Chromium,
  including the run sandbox (WebView2's handling of a `sandbox` CSP on a
  framed response is assumed to match Chromium's).
- The native colour picker's own window: the sweep sets the input's value
  and fires its events; the OS picker never opens headless.
- Ctrl+/ in a note box opening the blocks menu: the binding was removed and
  the guard is unit-tested, but the note composer could not be focused from
  a sweep in the time given.
