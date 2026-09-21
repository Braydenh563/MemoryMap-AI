# INBOX 314: three faults in the reading workspace, two causes, and what is left

> Companions: [OPEN.md](OPEN.md) (the consolidated ledger) ·
> [../HISTORY.md](../HISTORY.md), where INBOX 314 now lives ·
> [../UI_MODERNISATION_PLAN.md](../UI_MODERNISATION_PLAN.md) Phase 7, the
> workspace this is about
>
> Every number here was measured against a running app on port 8800 with a
> real six page scan (pages rasterised, no text layer), or by a test counting
> a fake reader's own calls. **Tesseract is not installed in this sandbox**
> (`shutil.which("tesseract")` is None, and neither `pytesseract` nor Pillow
> is in the venv), so nothing here is a claim about what Tesseract reads off a
> real page: what was measured is the plumbing either side of the reader.

## Closed, with the number that closed it

| Item | Before | After |
| --- | --- | --- |
| The optical reader re-running on every look at a page | A scroll down and back up over a six page scan: **13 reader calls**. Four looks at one image: **4** | **6** and **1**. `PageRead.regions` stores what the reader saw, `_stored_regions`/`_remember_regions` serve and fill it |
| The page rasterised again for an answer already stored | Three looks at a stored page: **3 renders**, serialised behind pypdfium2's process-wide lock | **1**. The store is consulted before the render, not inside `_regions_for` |
| A look counted as a reading | n/a (nothing was stored at all) | `page-reads` reports `read: 0` for pages that were only looked at; `PageRead.text` still means a transcription somebody asked for |
| The reading panel on a scan | Scrolled to page 4 of 6: **3 rows, all of page 4**, and no row of another page to click | Scrolled through all six: **8 rows over pages 1 to 6**, the page on screen's 3 rows marked current, the list scrolled to them (694 of 1456 in a 540 viewport) |
| A section taking you to its page | Nothing to click: every row was the page already on screen | Clicking page 1's section moved the page pane from scrollTop **1751 to 8** and the label from "Page 4 of 6" to "Page 1 of 6" |
| Scroll mode's silent fallback | Fell back to one page and left its own segment lit | The segment is lit for the mode you are in; the two permanent refusals say why, the one temporary one (page count not back yet) stays lit and is honoured when the count lands |

## Measured and left alone

**Scroll mode itself was not broken.** The entry's second fault asked for this
to be checked first, and the check came back the other way: on the six page
scan the mode engages and scrolls. `#ocr-page-pane` is 654px tall over a
3892px stack of six `.ocr-stage`s, `overflow-y: auto`, and scrolling it to
1751 moved the page on screen from 1 to 4 with the rail, the pager and the
reading panel following. The owner's sentence reads as the *reading panel* not
scrolling, which was fault (1) and is fixed above. The silent fallback was
fixed anyway, because a control that lies about the app's state is worth
fixing whether or not it is what was reported.

## Decisions taken, and why they are not new ones

**The stored regions are not a page reading.** `PageRead.text` feeds the Files
row's "N pages read" badge, `_page_read_text_map`, and the lightbox's page
chips. Filing what an optical reader saw while a page was merely on screen
into that column would have every one of them claim a transcription nobody
asked for, from an act of scrolling. So the regions get their own column and
their own field on the way out (`regions_text`), and the reading panel lists
them as what the app has seen rather than as what it was told to read. This is
the same line `_remember_page_read` and `_remember_page_caption` already draw
between a reading and a description.

**The panel is one list, not a choice between two.** It used to be the stored
reading of every page **or** the regions of the page on screen. Every reader
that returns positions returns them for every page, so that choice always came
down the same way and the document-wide half was unreachable. `ocrDocumentReading`
merges them: every page the app has something for, in page order, and the page
on screen contributes its own sections so the boxes keep their rows.

## Left open

- **A page only joins the panel once it has been looked at or read.** Nothing
  reads ahead, deliberately: reading ahead is the cost this work removed. So
  the list grows as you scroll rather than arriving complete, which is honest
  but is not the same as "the whole document is in the panel from the start".
  If the owner wants the whole document listed on open, the honest way is a
  pages-read-style index rather than a background pass of the reader.
- **Not verified with a real Tesseract**, on any of it. The counts come from a
  fake reader; the workspace behaviour comes from a fake reader standing in for
  it at the route (`scratchpad/ui-sweeps/fake_tesseract_app.py`). What a real
  Tesseract does to a real scan, and how long it takes, is unmeasured here.
- **Not verified with the vision reader either**: the app has no model running
  in this sandbox, so the path where a page carries both a stored reading and
  stored regions was exercised through the store, not through a model.
- The probes need Pillow and pypdfium2, which are this app's "PDF pages"
  optional extra. They were installed to a directory of their own
  (`pip install --target /tmp/mm-ocr-libs`) and put on `PYTHONPATH`, rather
  than into the shared venv, so the suite still sees the extra as absent and
  the `needs_pdfium` tests still skip where they always did.
