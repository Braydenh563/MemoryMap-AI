# Documents tails: ranked, each checked against the running app (2026-10-04)

Source: DOCUMENTS_PLAN open items (17d, 17e, 18's not-verified), the Documents
section of OPEN.md (Phase 2, 6 and 8 tails), `documents-tail.md`. The engine's
three omissions (atomic ranges, Mod+click, toolbar state) are decisions and are
left. Server on :8852, a 20,919-word and a 52,294-word document, Chromium.

Ranked by impact for a person writing long documents, then cost (S under an
hour, M a few, L a session).

| # | Item | Checked against the app | Impact | Cost |
| --- | --- | --- | --- | --- |
| 1 | Live view stays raw after a jump into a long document | **Bug, measured.** Jump the scroller to 30% of a 21k-word document: 3 heading lines drawn as `### Section`, 0 styled, and still so 2.5s later. The decoration plugin rebuilds on doc, viewport, selection and focus, not when the parser catches up, so the syntax tree arriving after the viewport moved never repaints | High | S |
| 2 | Reopen a document where you left it | **Absent, measured.** No per-document caret or scroll memory anywhere in `documents.js`; reopening a long document lands at the top (or wherever the previous document's scroller left it) | High | M |
| 3 | The breadcrumb follows the caret even when the caret is off screen (17d) | **Measured.** Scrolled to 60% with the caret at line 1: `Top > Annual report`. The outline already marks "the caret's section while visible, the top of the view otherwise" (`docCaretVisibleLine`); the breadcrumb does not use the rule | High | S |
| 4 | How far through (17d) | Status bar says `Ln 1, Col 1` and `1.6h read`, no position in the document; nothing says "62% of the way" | Medium | S |
| 5 | A suggestion menu drawn over its own word (OPEN) | Not yet re-measured; `spellwide2.js` table-cell case read a 0px gap while the menu covered `655..707` | Medium | M |
| 6 | The surface aliases have no lint (OPEN) | Absent; static check, `autoGrow(` and friends handed a surface | Medium (prevents a silent runtime throw) | S |
| 7 | Outline rows 24px against the 28px floor (OPEN) | **Already density-aware**: compact 24 to 25.2, comfortable and spacious 28 (measured) | Low to medium | S |
| 8 | 17e: contrast over the Documents tab in both themes | `contrast.js` TABS has no documents tab; will find pre-existing findings | Medium | M |
| 9 | Word menu's shrink-to-fit width (OPEN) | Never observed; speculative | Low | S |
| 10 | `editor.js` sweep still describes the retired editor (OPEN) | Throws; tooling only, no writer sees it | Low | L |
| 11 | IME composition in the engine (not verified) | Cannot be driven headless | n/a | n/a |

Already exist, so not built (CLAUDE.md section 1): typing latency at 20k words
(`doctype.js`, p50 16 to 24 ms), a selection's word and character count in the
status bar, word goal, typewriter scrolling, outline folding and filter,
focus mode with sidebar, open time (893 ms at 20,919 words, 980 ms at 52,294).

Decided, not remade: the phone outline sheet, the 820 to 1100 icons rail,
atomic ranges, Mod+click, the AI assistant bar's pill (the owner likes it,
INBOX 409 (f)), the whiteboard note card (not the documents agent's).

## Outcome (2026-10-04)

| # | Result |
| --- | --- |
| 1 | Built: the plugin rebuilds when the tree is replaced. `doclonglive.js` 5 of 6 to 6 of 6 |
| 2 | Built: caret and top offset per document, `docreturn.js` 6 of 9 to 9 of 9 |
| 3 | Built: trail follows the view, `doccrumbview.js` 9 of 9 (3 of the scroll checks failed before) |
| 4 | Decided against: the scrollbar, the outline mark and the trail answer it; 17 adds nothing to the chrome |
| 5 | Assertion added (`spellwide2.js`); the recorded case does not reproduce; the reveal question is still open |
| 6 | Built: `tests/test_doc_long.py` |
| 7 | Already existed: density-aware, compact 24 to 25.2 px, others 28 px |
| 8 | Built as `contrast.js` with `ONLY=document`: 0 findings, both themes, 390, 820, 1440 (390 and 820 in one theme each) |
| 9 | Not built: never observed |
| 10 | Not built: tooling only, a session of its own |
| 11 | Not verifiable here |

Also fixed: `docfocus.js` (the sweep's, not the app's), 20 of 23 to 24 of 24.
