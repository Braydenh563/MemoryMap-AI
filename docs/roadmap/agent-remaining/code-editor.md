# Code editor: what this agent did, and what is left

Session of 2026-09-23, worktree cut from `fix/gemini-fixes-5`. The owner's
ask, verbatim: "on the code document types as well, can you add the things
like with vs code how if I write a \" it automatically does \"\" and puts my
cursor position in between them, stuff like that. like if Im writing in a c
language or java or smth where I write var_name { and it automatically does
{} and then if I press enter it automatically indents and code structures
them?? also a button to automatically format the whole document, ot just a
selection. stuff like that. also recommended fixes to apply like the other
autocorrect feature." Builds on the diagnostics and completions of b5d05f4
(DOCUMENTS_PLAN, placed from INBOX 392).

## Built

| Step | What landed | Probe |
| --- | --- | --- |
| 1 | The pure half, `DOC-CODE` region in documents.js: one structure scan per language (strings, comments, heredocs, raw strings, regexes, PHP tags), the indent a new line gets, the formatter (brackets, markup, whitespace-only for Python and YAML), JSON re-printed from its own tokens, the quick fixes as edits | `tests/test_code_editing.py`, 34 cases in node |

## Remaining, in order

1. Editor wiring: `closeBrackets` and its keymap, `indentUnit` from the file
   type, the indent service for the languages with no grammar in the bundle,
   the languages' pairs and `indentOnInput`.
2. Format: the dock button, Shift+Alt+F, the palette rows, the refusal
   checks (the Lezer tree for JavaScript, TypeScript and CSS; the server's
   check for Python, TOML and YAML), one undo step.
3. Quick fixes: actions on the diagnostics, the Alt+Enter menu at the caret
   (`openMenuAtPoint`), F8 through the problems, the tooltip's buttons in
   the tokens.
4. `scratchpad/ui-sweeps/doccodeedit.js` in Chromium; DESIGN.md row, HISTORY,
   DOCUMENTS_PLAN pointer, CHANGELOG.
