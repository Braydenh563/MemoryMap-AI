# INBOX 595, package bundles and bulk actions (and FEAT-18): what is left

> Companions: [INBOX.md](../../INBOX.md) (595) · [DOCUMENTS_PLAN.md](../../DOCUMENTS_PLAN.md)
> (section 20, D5) · [HISTORY.md](../../HISTORY.md) ("Moved from the plans,
> 2026-10-05 (the feature audit's documents and map fixes)") ·
> `tests/test_extras_bundles.py` · `tests/test_docexport_pictures.py` ·
> `scratchpad/ui-sweeps/extras-bundles.js`

## Done

- Bundles defined once in `core/extras.py` (`BUNDLES`: Documents, Vision, AI,
  Voice, Desktop, Code; every extra in at least one), carried by `GET /extras`
  with each row's version, size on disk and bundles.
- `POST /extras/bulk` (`start_bulk`): install, remove or reinstall a bundle or
  a ticked list, one job on the pool's new one-wide `install` lane, in the
  order asked, each package with its own guards and outcome; one failure never
  stops the rest; Quit stops the rest. Single installs moved onto the pool too
  (`core/extras.py` starts no thread now; `THREAD_SITES` lowered).
- Offline pip failures say so as one sentence (`PIP_OFFLINE_MESSAGE`).
- Settings, Packages is a lazy bundle (`settings-packages.js`): bundle rows,
  ticks (`select-check`), the `selectbar` recipe, Reinstall and Remove in the
  row's `kebabMenu`, per-row bulk outcomes, help popover and Guide topic.
- Phone action sheets close on Escape (they let it close Settings).
- FEAT-18: pictures in the Word export with alt text and `|300|center`.

## Left

1. **The Word writer has never run here.** python-docx is not in the sandbox
   venv and the brief forbids installing it, so the five writer tests in
   `tests/test_docexport_pictures.py` skip. Run them once where the extra is
   installed (`.venv/bin/pip install python-docx` in a scratch venv, never the
   shared one), then open one export in Word or LibreOffice and look at a
   centred, captioned picture. Calls used: `run.add_picture`,
   `InlineShape.width/height`, `wp:docPr` `descr`, the `Caption` style.
2. **No real pip ran.** Every bulk test fakes `subprocess.Popen`, and the
   sweep stubs every POST. A real bulk install (two small pip extras, say
   docx and pdfpages) in a scratch data dir and venv would confirm the
   progress row, the history card's summary and Quit between packages.
3. **The bundle groupings are a recommendation**, taken under standing order
   3: Documents (documents, docx, pdfpages), Vision (ocr, pdfpages), AI
   (semantic, needle, localllm), Voice, Desktop, Code (pyodide). The owner may
   regroup; it is one tuple.
4. **Phone layout.** At 390 a row's ⋯ sits on the line under its name and
   chip (the existing phone stacking in 10-responsive.css), and a bundle with
   nothing missing has only its ⋯ there. Measured clean (no overflow, 44px
   targets) but not designed further.

## Found, not fixed

- `tests/test_list_endpoints_page.py::test_every_growing_list_takes_a_page`
  fails on `routes_board_library.py:380 list_library` (not touched here;
  source-only test, so it fails on the base commit too).
