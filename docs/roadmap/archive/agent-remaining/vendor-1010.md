# vendor-1010: every vendored library at full use (Brief 75)

Worktree `wt-vendor`, branch `agent/vendor-1010`. The owner, 2026-10-10: "make
sure all the vendored repositories are made full use of. I want maximum
utility." Run `python scratchpad/vendor_use.py --groups` for the counts;
`tests/test_vendor_utilisation.py` holds the floors. Each row is placed in its
plan under "Vendored capabilities to use, 2026-10-10 (Brief 75)".

## Top ten, ranked (utility to the surface)

1. VC1, Harper and the word list on the chat composer and Ask box (M): CHAT_PLAN.
2. VC2, D3 time scale and axis for the timeline and calendar (M): TIMELINE_PLAN.
3. VC3, D3 scales, axes and formats for the Ask and statistics charts (M): UI_MODERNISATION_PLAN.
4. VC4, CodeMirror merge view against a chosen version, hunk accept or reject (M): DOCUMENTS_PLAN.
5. VC5, FlashText link and tag offers (5,000 titles load in 27.5 ms, 7.6k characters scan in 1.6 ms) (M): DOCUMENTS_PLAN.
6. VC6, Harper personal dictionary and the Australian, Canadian, Indian dialects (S): DOCUMENTS_PLAN.
7. VC7, the `diff` and `dockerFile` modes already bundled, two file types, zero bytes (S): DOCUMENTS_PLAN.
8. VC8, the word list in search typo tolerance and the question-noise check (M): WORLD_CLASS_PLAN.
9. VC9, one icon picker: Spaces' own `spaceIconPicker` replaced by `pickIconOrEmoji` (S): UI_MODERNISATION_PLAN.
10. VC10, the five converted draw.io sets (196 shapes) in the library picker (M): WHITEBOARD_PLAN, already Phase 2 of the draw.io programme.

Rows 11 to 17 are in the plans too: VC11 treemap and pack (GRAPH), VC12 Harper
on mind map labels (MINDMAP), VC13 lint panel and fold-all (DOCUMENTS), VC14
Phosphor fill weight (UI_MODERNISATION), VC15 Guide did-you-mean (CHAT), VC16
p5 as parameters (WHITEBOARD), VC17 Emmet stylesheet syntaxes (DOCUMENTS).

## Checked, not a row

- Indentation markers: already built (INBOX 402, `documents-code.js` near line 1897).
- CodeMirror's keymaps (`defaultKeymap`, `searchKeymap`, `historyKeymap`,
  `foldKeymap`, `closeBracketsKeymap`) are used wholesale, so most of the 104
  "unused" `commands` and the `search` commands are reachable by key; the
  count under-states reach. `lintKeymap` and `completionKeymap` are the two
  unused keymaps.
- Emmet is fully used (6 of 6 functions); only its syntaxes are unused.
- The Phosphor picker lists all 1,530 glyphs, so a glyph the code never names is still reachable.

## Left, one line each

- Each VC row is unbuilt; the script and test are the only code (Brief 75 says no code beyond them).
- `docs/THIRD_PARTY.md` has no row for the draw.io stencils (`frontend/board-library/drawio/`, Apache-2.0, notice beside the data) or `icons.json` (Phosphor, MIT): `tests/test_vendor_manifest.py` covers only the two vendor directories. Left for the draw.io agent, who owns that notice.
- `tests/test_scratchpad_size.py` already failed on this branch before this work (778 tracked files, cap 766); this adds one scratchpad file (`vendor_use.py`).
- The p5 API list in `scratchpad/vendor_use.py` is a Chromium dump pinned to 1.9.4; regenerate it with a p5 upgrade.
- INBOX 751 is not moved to HISTORY: the rows are placed but nothing is built.
