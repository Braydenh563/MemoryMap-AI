# Documents: the engine (DOCUMENTS_PLAN Phase 2 steps 2 to 4)

Steps 2, 3 and 4 are built, measured and committed. What follows is what the
next session should pick up, in order, with the file and the line area.

## 1. `revalidateSelection` reads the stale fallback (a real bug, not a tidy-up)

`frontend/app.js`, `function revalidateSelection` (around line 15830).

It resolves a selection's surface with
`document.getElementById(context.surfaceId)` and requires an
`HTMLTextAreaElement`. With CodeMirror mounted, `#doc-content` is still that
element and still holds whatever text the fallback last had, which for an
open document is empty or stale. So a selection sent to the chat from a
document is re-checked against the wrong string: it reports `gone` or
`unknown` and the model is told the passage may no longer be there when it
is sitting on screen.

The fix is one line plus its guard:

```js
const surface = typeof docSurfaceById === "function" ? docSurfaceById(context.surfaceId) : null;
if (!surface) return { ...context, position: "unknown" };
const value = surface.text;
```

`docSurfaceById` is in documents.js inside the adapter markers and already
resolves `doc-content` to the live surface. **Not done here because this
agent was told not to touch app.js**, and it is app.js's function.

## 1b. The same `tagName` guard is wrong everywhere else in app.js

`frontend/app.js` around line 33916 decides "is the user typing?" with
`["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)`.
A `contenteditable` is not in that list, so every bare shortcut fired while
you typed in the engine. That is stopped at the editor's own host now
(`docGuardGlobalShortcuts` in documents.js), which fixes the documents
editor and nothing else. The guard itself is still wrong, and the next
contenteditable anywhere in this app will meet it again. One line there:

```js
const typing =
  ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) ||
  document.activeElement?.isContentEditable;
```

The chorded branch twenty lines above it already checks `isContentEditable`,
so this is the two halves of one function agreeing rather than a new rule.

## 2. `scratchpad/ui-sweeps/editor.js` still describes the old editor

1,058 lines, 89 checks, written against the textarea, the per-paragraph Live
view, the Phase 0 backdrop and the D3 snapshot stack, all four of which are
gone. It references `docUndoStack`, `docUndoAt`, `docUndoReset`,
`#doc-live .lp-src` and `has-backdrop`, so it throws rather than failing
usefully.

The undo gate it existed for is covered, on the engine's own history, by
`scratchpad/ui-sweeps/cm-engine.js` (`live_reached_document` and
`undo_removed_live_edit`, both true), and the D2 selection toolbar, the `/`
menu, the `[[` picker, the inline AI bar and the completion popup are
covered on the engine by `scratchpad/ui-sweeps/cm-editor.js` (14 checks).
What the old sweep still carries that nothing else does is the long tail:
the colour menus, the footnote and table commands, the toolbar's collapse
and wrap modes, the gutter pairing for the two note editors. Re-point its
reads at `docSurface()` and its Live interactions at
`#doc-editor .cm-content`, drop the checks for the four retired things
(`docUndoStack`, `docUndoAt`, `#doc-live .lp-src`, `has-backdrop`), and
report how many of the 89 survive.

## 3. Things the plan lists for this phase that are deliberately not here

- **Atomic ranges.** A hidden marker can still be walked into with the
  arrow keys, which reveals it, which is correct but means the caret
  appears to jump two characters. `EditorView.atomicRanges` over the
  replace decorations is the usual answer.
- **`Mod+click` on a link chip opens it; a plain click does not**, which is
  the Obsidian behaviour the plan asked for. There is no affordance saying
  so beyond the tooltip.
- **The formatting toolbar's own state** (which buttons are "on" for the
  caret's position) is not driven from the syntax tree. It never was, but
  the tree makes it cheap now.

## 4. Named losses, for whoever hears about them

The Notion-style block handle, its drag to reorder and its
move/duplicate/delete menu were deleted with the block DOM, as
DOCUMENTS_PLAN Phase 2 decision 3 said they would be. Phase 3 is where block
structure comes back over one document. If someone reports it missing before
then, that is the answer rather than a regression to chase.

## 5. Not verified

- IME composition inside the engine (CodeMirror handles it; this app's own
  composition handling was removed from the fallback path only).
- The fallback path end to end. `docCmBroken` was set by hand to compare
  engines in `doctype.js`; a genuinely blocked request was never tried.
