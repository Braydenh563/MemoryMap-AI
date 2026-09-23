# Code editor: what this agent did, and what is left

Session of 2026-09-23, worktree cut from `fix/gemini-fixes-5`. The owner's
ask, verbatim: "on the code document types as well, can you add the things
like with vs code how if I write a \" it automatically does \"\" and puts my
cursor position in between them, stuff like that. like if Im writing in a c
language or java or smth where I write var_name { and it automatically does
{} and then if I press enter it automatically indents and code structures
them?? also a button to automatically format the whole document, ot just a
selection. stuff like that. also recommended fixes to apply like the other
autocorrect feature." Builds on the diagnostics and completions of b5d05f4.
The full record is HISTORY.md's "code documents as a code editor, part two".

## Built

| Step | What landed | Probe |
| --- | --- | --- |
| 1 | The pure half, `DOC-CODE` region in documents.js: one structure scan per language (strings, comments, heredocs, raw strings, regexes, PHP tags), the indent a new line gets, the formatter (brackets, markup, whitespace-only for Python and YAML), JSON re-printed from its own tokens, the quick fixes as edits | `tests/test_code_editing.py` |
| 2 | Pairs and Enter wired (`docCodeEditing`): `closeBrackets`, its keymap, `indentUnit` from the file type, `docCodeIndentAt` for the fourteen types with no indenting grammar, per-language pairs. Found and fixed: Tab left the caret before the indent it inserted, in prose and code, since the engine landed | `doccodeedit.js` |
| 3 | Format: `#doc-code-format` in the dock (code types only), Shift+Alt+F, the palette row; refused by the Lezer tree (JS, TS, CSS), the server's check (Python, TOML, YAML) or the scan; one undo step; JSX parsed in `.js` | `doccodeedit.js` |
| 4 | Quick fixes: actions on every checker's diagnostics, recomputed when chosen; Alt+Enter at the caret (falls back to the caret's line) via `openMenuAtPoint`; F8; the hover card's buttons in the tokens. Found and fixed: the Python colon fix never matched the server's capitalised message | `doccodeedit.js`, 48 of 48; `tests/test_code_editing.py`, 39 |
| 5 | DESIGN.md's code-document recipe row, HISTORY, the DOCUMENTS_PLAN pointer, CHANGELOG | lints |

## Remaining

Nothing from the brief. Found and not fixed, for the orchestrator:

1. ~~Fixed by the orchestrator: prose documents carry an inert completer
   (`override: []`, no typing trigger) so the field always exists across a
   state swap.~~ The bundled `@codemirror/autocomplete` 6.20.3 completion plugin has no
   `destroy` that clears its debounce timers, so switching from a code
   document to a markdown one within ~100ms of typing throws "Field is not
   present in this state" from a stale timer (seen once in a probe that
   switched immediately; harmless otherwise). Fix is upstream or a bundle
   bump, not app code.
2. Format for TypeScript with JSX (`.tsx` is not a file type) and JSX in
   `.js` is refused by name, not laid out.
