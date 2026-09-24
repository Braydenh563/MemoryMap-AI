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
4. Accessibility check in the suggestions panel. Open.
5. .docx round trip. Export exists (`core/docexport.to_docx`, python-docx
   extra `docx`); missing: tables and links on export, tables, links and
   numbered lists on the fallback import (`core/docview.docx_to_markdown`).

## Found, not fixed

- `tests/test_static_compression.py::test_a_stamped_asset_is_immutable_and_gzipped`
  fails on the base branch: gzipped `app.js` is 750,706 bytes against a
  750,000 cap. Not touched by this agent (app.js unchanged).
