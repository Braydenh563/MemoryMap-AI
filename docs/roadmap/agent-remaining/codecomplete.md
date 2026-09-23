# codecomplete: completions, Emmet and VS Code features in code documents

Agent E2, worktree cut from `fix/gemini-fixes-5`, server :8799, data
`/tmp/mm-agentE2`. INBOX 394 (c), then INBOX 402.

## Landed

- 59649bc Emmet 2.4.11 vendored (`frontend/vendor/emmet`, MIT, own
  on-demand bundle, build.sh, pinned package.json, LICENSE with the list).
- (this commit) INBOX 394 (c): `docCompletionExtras` in the code
  compartment. Emmet rows in HTML (line start or after a tag) and CSS
  (declaration start); `!` + Enter writes the HTML5 page with the caret on
  the title; each CSS property's own values after `: ` (Emmet's table plus
  `DOC_CSS_VALUES_EXTRA`, dead values dropped); ghost text taken with Tab.
  `tests/test_code_completion.py` 51 pass; `doccomplete.js` 35/35 light and
  dark; `doccodeedit.js` 48/48; `doccode.js` all pass.

## Next (INBOX 402, in order; commit per item)

1. Comment toggle at the caret: `toggleDocComment` (documents.js) for code
   types reads the language at the cursor (`<script>` `//`, `<style>`
   `/* */`, JSX children `{/* */}`); keep its rules as tests. Shift+Alt+A
   block comment if free in the shortcut registry.
2. Emmet beyond HTML: JSX/TSX (`className`), XML/SVG; wrap with
   abbreviation; balance/select tag.
3. Auto-close and rename-matching-tag for HTML/XML/JSX.
4. CSS colour swatches with the native picker.
5. Hover docs for CSS properties and HTML tags/attributes (packages' data).
6. Indentation guides and bracket-pair colours on tokens.
7. Outline jump (Ctrl+Shift+O) from the Lezer tree.
8. Alt+Z wrap toggle and render-whitespace in the document's menu.
9. Sticky scroll of the enclosing function or rule header.

## Found, not fixed

- Port 8799 was held by an orphaned server whose worktree had been deleted
  (`agent-a52d41d28d1901f69`); stopped it.

## Not verified

- The desktop window (WebView2): the sweeps run in headless Chromium.
