# Prose editor: what this agent did, and what is left

Worktree cut from `fix/gemini-fixes-5`, port 8802, data `/tmp/mm-agentP2`.
The brief: the prose side of INBOX 404 (plain text, markdown, docx-imported
documents), with INBOX 401's Harper first. A second agent owns the code side
of `frontend/documents.js` (completions, emmet, run console); everything this
agent wrote there sits between `// PROSE-TOOLS-BEGIN` and `// PROSE-TOOLS-END`
(after `renderDocProse`), plus one-line hooks named below.

## Decisions taken

- **Harper ships vendored and lazy, not as an extra.** Measured
  (`scratchpad/ui-sweeps/p2-harper.js`): nothing is fetched at boot, so the
  H7 boot budget does not move; 1.75 s cold on the first prose document or
  note box, ~100 to 160 ms per 1,400-word check, all in a module worker.
  `core/extras.py` is for pip installs and was not needed. Slim binary,
  15.9 MB; `application/wasm` is excluded from gzip (755 ms per cold fetch
  against 60 ms raw). CSP gains `'wasm-unsafe-eval'` only.
- Harper's `Spelling` lints are dropped; the app's dictionary owns spelling.
  Grammar findings never carry a `replacement`, so "Fix all" never applies
  one unasked.

## Steps

1. Harper grammar in documents and note boxes. Done: see git log
   ("Grammar checking with Harper").
2. Suggestion mode (tracked changes). Done: see git log ("Suggestion
   mode"). Stored inline as CriticMarkup, so no field and no migration
   (decision, with the reason, at `DOC-SUGGEST-BEGIN`'s header); per-viewer
   on/off in `localStorage`; `p2-suggest.js` 16 of 16, node model tests in
   `test_prose_tools.py`. Not tracked by design: command edits (toolbar,
   word-menu fixes, AI). Export of pending marks to .docx as Word revisions
   is step 5's.
3. Read aloud. Done: see git log ("Read aloud"). `p2-readaloud.js` 6 of 6
   against a stand-in voice (headless Chromium lists 0 voices), node tests
   for what is said. **Not verified:** a real system voice speaking, in the
   desktop window (WebView2) or a browser.
4. Accessibility check in the suggestions panel. Done: see git log
   ("Accessibility check"). A fifth finding kind, `access` (dashed accent
   underline, ring dot), pure model `DOC-A11Y` with node tests;
   `p2-a11y.js` 6 of 6, light and dark.
5. .docx round trip. Done: see git log ("Word round trip"). Export existed
   (`core/docexport.to_docx`, the `docx` extra) with headings, lists, quotes
   and bold/italic/code; added tables, links (http, https, mailto only),
   nested and task lists, code fences, strike, and CriticMarkup as `w:ins` /
   `w:del`. The built-in importer (`core/docview.docx_to_markdown`) now walks
   the body in order and reads tables, links (from the rels part), numbered
   vs bullet lists (from `numbering.xml`) with levels, code-face runs, strike
   and tracked changes; a .docx with revisions skips markitdown, which would
   accept them silently. Round trip exact over a 10-shape fixture
   (`test_prose_tools.py`, runs where python-docx is installed; the importer
   test runs everywhere on a hand-built file). Word's "List Number" continues
   its count across separate lists (python-docx has no restart API): known,
   not fixed.

Commits: db64249 (Harper), dc6ee81 (INBOX 401 to HISTORY), 1706972
(suggestion mode), c3af0d3 (read aloud), be76070 (accessibility), 2a9f407
(Word round trip). Hooks outside the region, for the merge: `renderDocProse`
(two lines), `docFindingKind`, `DOC_FINDING_GROUPS`, `docCmTheme` (two
underline kinds), `docSuggestAlternatives` and `docSuggestAnswers` (grammar's
own answers, "Remove"), `noteSurfaceExtensions` (one line), `docCmExtensions`
(one line), `renderDocPreview` (one line), `DOC_PROSE_SKIP` (two patterns),
the variant handler and `openDocDictionary` (the grammar switch).

## Left to do

Nothing from the brief. Worth doing next, in order:

1. Harper's lint config per kind in the dictionary dialog (it has ~200 rules;
   today it is all or nothing). `harper-worker.js`, `setLintConfig`.
2. Suggestion mode's author and date (CriticMarkup has `{>>comment<<}` for
   both); export writes `MemoryMap` as the author of every revision.
3. A voice and speed picker for read aloud (system voices only).

## Not verified

- A real system voice speaking (headless Chromium lists none).
- Harper and read aloud in the desktop window (WebView2, WebKitGTK):
  module workers, `'wasm-unsafe-eval'` and `speechSynthesis` are all
  supported there on paper, not run here.
- A .docx from Word itself with tracked changes (the importer test is a
  hand-built file; the round trip is python-docx's output).

## Found, not fixed

- `tests/test_static_compression.py::test_a_stamped_asset_is_immutable_and_gzipped`
  fails on the base branch: gzipped `app.js` is 750,706 bytes against a
  750,000 cap. Not touched by this agent (app.js unchanged).
- `tests/test_docexport_bundle.py::test_the_word_export_is_a_real_docx_with_the_words_in_it`
  fails wherever python-docx is installed (skipped in CI, which lacks it):
  it expects `essay.docx`, the route sends `Essay.docx`. The route's
  `_safe_filename` keeps case; the test or the route is wrong, not decided
  here.
