# Third-party code and data

MemoryMap is AGPL-3.0 and runs offline, so what it borrows ships inside the
repository rather than being fetched. This page credits every library vendored
into it, with the version and licence it came under; each one's licence text
sits beside it. `tests/test_vendor_manifest.py` fails the build when a file
under `src/memorymap/vendor/` or `frontend/vendor/` is missing from this page.

## Python (`src/memorymap/vendor/`)

| Library | Files | Version | Licence | Source | Used by |
| --- | --- | --- | --- | --- | --- |
| FlashText | `flashtext.py` | 2.7 | MIT (`flashtext.LICENSE.txt`) | https://github.com/vi3k6i5/flashtext | `ai/taxonomy.py`, matching the taxonomy pack's phrases in a note |

## Browser (`frontend/vendor/`)

| Library | Files | Version | Licence | Source | Used by |
| --- | --- | --- | --- | --- | --- |
| CodeMirror 6 | `codemirror/` | packages pinned in `codemirror/package.json` (view 6.x) | MIT (`codemirror/LICENSE`) | https://codemirror.net | the documents editor's source mode |
| Emmet | `emmet/` | 2.4.11 | MIT (`emmet/LICENSE`) | https://github.com/emmetio/emmet | abbreviations in the code editor |
| Harper | `harper/` | harper.js 2.10.0 | Apache-2.0 (`harper/LICENSE`) | https://github.com/Automattic/harper | grammar checking in documents, as WebAssembly |
| D3 | `d3.v7.min.js` | 7.9.0 | ISC (`d3.LICENSE.txt`) | https://d3js.org | the graph and the whiteboard's layouts |
| p5.js | `p5.min.js` | 1.9.4 | LGPL-2.1 (`p5.LICENSE.txt`) | https://p5js.org | the generated brand emblem |
| Phosphor Icons | `phosphor/` | the web font build | MIT (`phosphor/LICENSE`) | https://phosphoricons.com | every icon in the app |
| Mammoth | `mammoth/` | 1.13.0 (`mammoth.browser.min.js`) | BSD-2-Clause (`mammoth/LICENSE`) | https://github.com/mwilliamson/mammoth.js | reading a .docx imported into the Library, loaded on demand by `documents-word.js` |
| docx | `docx/` | 9.9.0 (`dist/index.iife.js` minified) | MIT (`docx/LICENSE`) | https://github.com/dolanmiu/docx | writing a document as .docx (Download as Word), loaded on demand by `documents-word.js` |
| English word list | `wordlist/` | built by `wordlist/build.sh` | the English Speller Database licence (`wordlist/LICENSE`) | https://wordlist.aspell.net | the documents editor's spelling check |

## Board library (`frontend/board-library/`)

| Library | Files | Version | Licence | Source | Used by |
| --- | --- | --- | --- | --- | --- |
| draw.io stencils | `drawio/` | converted by `scripts/build_board_library.py` | Apache-2.0 (`drawio/LICENSE`, `drawio/NOTICE.txt`) | https://github.com/jgraph/drawio | the whiteboard's shape library (basic, flowchart, arrows, BPMN, networks) |
| Phosphor Icons | `icons.json` | glyphs converted to paths by `scripts/build_board_library.py` | MIT (`../vendor/phosphor/LICENSE`) | https://phosphoricons.com | the whiteboard's icon shapes |

## Data

- `ai/data/taxonomy/` is the MemoryMap taxonomy pack, 5.0.0-consolidated
  (527 categories, 6,478 phrase assignments, 1,109 roles, 44 institutions,
  facets and 30 context rules), commissioned by the project's owner and
  generated with Perplexity from the owner's own uploaded taxonomy; it ships
  under the project's licence. Its original vocabulary is kept in
  `tests/fixtures/taxonomy/original_taxonomy.json`, and its tests in
  `tests/test_taxonomy_pack.py` (WORLD_CLASS_PLAN 23, decision 1).
- `ai/question_noise.py`'s misspelling table (the block added 2026-10-10)
  appears to be drawn from Wikipedia's "Lists of common misspellings", which
  is CC BY-SA 4.0. Its origin is not recorded in the commit that added it;
  until it is confirmed or replaced, it is credited here as that list.
  https://en.wikipedia.org/wiki/Wikipedia:Lists_of_common_misspellings

## Elsewhere in the repository

- `.claude/skills/`: vendored design skills, MIT, credited in
  `.claude/skills/README.md`. They are tools for working on the app and are
  not shipped in it.
