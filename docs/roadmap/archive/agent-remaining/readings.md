# The lightbox's two readings, two stale probes, and two gates that passed on silence

> Companions: [OPEN.md](OPEN.md) (the consolidated ledger, struck with these
> numbers) · [../DOCUMENTS_PLAN.md](../DOCUMENTS_PLAN.md) ·
> [../../DESIGN.md](../../DESIGN.md), the recipe index
>
> Every number below was measured in a real Chromium against the running app
> on port 8797. Nothing here is a screenshot read as a result. Where a probe
> is called stale, it was told apart from a regression by serving the frontend
> at the commit before the change and running the same file against it.

## Closed, with the number that closed it

| Item | Before | After |
| --- | --- | --- |
| A picture with both readings, in the lightbox | `.lightbox-text` held the vision reading and the whole `.lightbox-info` panel held not one character of the Tesseract one | Both, the second under the first with "Also read with Tesseract OCR" under it. Panel 163px, no overflow, primary at y 465.7 and the alternate at 519.7 |
| A picture with one reading, or none | 109px panel | 109px panel, unchanged, in all three of the one-reading cases |
| Paging across a gallery | n/a | Stepping to a one-reading picture and back leaves no stale alternate |
| `imagefold.js` | Printed its "shut" numbers twice and exited 0: its `<details>` was removed from picture cards by `35a9ef9` | Images: 6 cards, 0 folds at rest, 0.0px row spread. Files: the fold opened, 0 of 0 row-mates moved, its own row 160 to 167.5px. Exits 1 on any finding |
| `imagecardfoot.js` | `fold` and `foldStyle` null on every card; its seed-once guard read `Response.length` and seeded six more cards on every run (it measured twelve) | `SUBTAB=files` measures the fold where one still is; the guard reads `apiJson`; six cards on the Images side. The "Text" chip's contrast read for the first time: 6.6 |
| `pixelcontrast.py`'s working directory | Hard-coded to the main checkout, so a worktree's screenshot was scored against another tree's script | This file's own repository |
| `contrast.js` on an empty surface | Printed a line of prose among thirty "ok"s and exited 0 | Names every empty surface with the width and theme and exits 1. 33 surfaces at 390, 820 and 1440 in light and dark: 0 low-contrast, 0 skipped, 0 empty |
| `scripts/gate.sh` on pytest's exit 5 | A bare red step name over a one-byte log | "failed: changed-tests (exit 5: no tests collected)" |

## Decisions taken, and why they are not new ones

**The lightbox shows both readings stacked, not behind a two-state control.**
The Library card's own reading fold settled the question already: "Tesseract's
reading goes inside the same disclosure, under the vision one: it is the same
question ('what does this say'), answered by the other reader", labelled "Also
read with Tesseract OCR" and left out when it is empty. This applies that
decision to the surface that missed it, in the two elements the panel already
has, so there is no second recipe and no new lint. A toggle answers "which one
is current", which the card's own badge already answers, and it makes the
comparison the lightbox exists for impossible.

**Copy hands over the primary reading only.** The panel's own rule is that
what Copy gives is what is on screen, and both readings are now on screen.
Concatenating two transcriptions of one picture would paste a document that
says everything twice; the second block is a second reader's answer to the
same question, not more of the text.

**pytest's exit 5 stays a failure.** The case that would make it a pass, a
change touching no tested file, never reaches pytest: `--changed` records
`changed-tests (none matched)` as skipped before invoking it. What is left is
pytest being handed test files that yield no tests, which is the selection and
reality disagreeing.

## Still open

- **The two ranks of Files row do not sit on one rhythm.** A described row
  leaves 50.3px of slack under its last block against 24.8px on an undescribed
  one, measured at 1440. The rows are a flex list, so each is sized on its own;
  where the extra 25.5px comes from is not yet traced.
- **The Files fold's filled state has never been measured.** No route can put a
  reading on an uploaded PDF from outside (`/media/{id}/ocr` and `/vision-ocr`
  are the six image suffixes; a document's reading is `PageRead` rows, which
  need a model), so every seeded document's fold says nothing has read it.
- **A low-contrast finding still exits 0.** `contrast.js` prints it and the
  gate's `sweep-contrast` step stays green. Nothing is low at any of the six
  width-and-theme combinations above, so turning that into a failure is a
  separate change with a number behind it rather than a guess.
- **`contrast.js` and `imagecardfoot.js` take minutes each.** Both are in the
  sweep list now; whether the sweep set is still one command's worth of time is
  worth a measurement before more are added.
