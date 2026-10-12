# translate83-1010: Brief 83 (the offline translator: evaluation, then the build)

**Verdict: KEEP, as an optional package that is never in the repo.** One reason:
a 94-word paragraph translates in 340 to 550 ms on one CPU thread (under the 1 s
bar), the engine is 5.2 MB, one language pair is a 25.4 MB download, and both
engine and models are MPL-2.0, which AGPL-3.0 may take in with notices.
Nothing was vendored or downloaded into the repo; all downloads sat in the
session scratchpad (`bergamot-eval/`), outside the worktree.

## 1. Bergamot

Licences (both read from the sources, 2026-10-10):

| Part | Licence | Source read |
| --- | --- | --- |
| Engine, `browsermt/bergamot-translator` and the npm package `@browsermt/bergamot-translator` 0.4.9 | MPL-2.0 | the repo `LICENSE`; `package.json` `"license": "MPL-2.0"` |
| Model packs (Firefox Translations, `mozilla/translations`) | MPL-2.0 | `mozilla/translations` README: "The model files are distributed under the MPL 2.0 license" |
| Old `firefox-translations-models` repo | MPL-2.0 code; its README says it is no longer maintained and the models live in a Google Cloud Storage bucket | its `LICENSE` and README |

Why MPL-2.0 can come in: section 3.3 lets Covered Software be combined into a
Larger Work under a Secondary License (the GPL family, which includes AGPL-3.0)
unless the files carry the Exhibit B "Incompatible With Secondary Licenses"
notice. The two source files read (`service.h`, `translation_model.cpp`) carry
no notice; the Exhibit B text in `LICENSE` is the stock template. The easy shape
is to keep the engine and the packs as separate, unmodified files with their
`LICENSE` beside them (`tests/test_vendor_licences.py` wants that), so the MPL
file-level terms stay with those files and nothing of ours is relicensed.

Sizes (measured from the registry headers and a real download):

| Item | Size |
| --- | --- |
| npm tarball 0.4.9 | 1,852,075 B |
| `bergamot-translator-worker.wasm` | 5,174,294 B |
| `bergamot-translator-worker.js` | 80,474 B |
| `translator-worker.js` + `translator.js` | 17,191 B + 30,661 B |
| en-es pack, gzipped (model 22,698,792 + shortlist 2,265,250 + vocab 409,312) | 25,373,354 B (25.4 MB) |
| en-es pack unpacked (31,561,787 + 4,198,436 + 816,054) | 36,576,277 B (36.6 MB) |
| en-de pack gzipped / unpacked | 25,720,702 B / 36,719,532 B |
| en-fr pack gzipped / unpacked | 25,752,472 B / 36,749,127 B |
| the reverse pairs (es-en, de-en, fr-en), gzipped | 26.2, 25.4, 26.2 MB |

The registry (`db/models.json`, generated 2026-10-10) lists 118 directed
pairs; the three pairs above are `base-memory`, `Release`. Flores200-plus
scores it publishes: en-es BLEU 27.5 / COMET22 0.854, en-de 39.7 / 0.867,
en-fr 48.9 / 0.865, es-en 26.9 / 0.857, de-en 40.9 / 0.881, fr-en 43.0 / 0.886.

Time (driven here, Node 22, Intel Xeon 2.8 GHz, 4 cores but the
latency-optimised translator uses one worker thread; the WASM ran unmodified):

| Pair | Load + first call | Ten sentences, each | 94-word paragraph (3 runs) |
| --- | --- | --- | --- |
| en-es | 1,350 ms | 60 to 91 ms | 380, 342, 363 ms |
| en-de | 1,640 ms | 64 to 171 ms | 552, 524, 518 ms |
| en-fr | 2,585 ms | 49 to 166 ms | 535, 409, 362 ms |

(An earlier en-de run gave 702 ms for the first paragraph; the machine was
shared with other agents, so read these as 340 to 700 ms, all under 1 s.)

Quality on ten sentences, en to es, de, fr (my own reading, no reference
scores run; the 10 are in the table, outputs summarised):

1. The meeting is moved to Thursday at ten, and Maria will bring the budget report.
2. Please save your notes before closing the notebook.
3. I could not find the invoice you mentioned in last month's email.
4. If it rains tomorrow, we will postpone the hike until the weekend.
5. The new model runs entirely on your own computer, so nothing leaves the device.
6. She has been learning to play the piano for three years.
7. Can you remind me to call the dentist on Monday morning?
8. The committee approved the proposal after a long and difficult discussion.
9. Add the flour slowly, stirring constantly until the mixture is smooth.
10. He broke the ice with a joke, and everyone relaxed.

Result: fluent and correct on 28 of 30 sentences (2 flawed, fr 1 and de 1); the idiom in 10 came through in all
three ("rompió el hielo", "brach das Eis", "brisé la glace"). Errors found:
fr 1 "à dix ans" (at ten years; should be "à dix heures"), a number-unit
error that changes the meaning; de 1 "Haushaltsbericht vorbringen" (loose verb);
es in the paragraph run rendered "bring" as "presentará". Register is formal
(Spanish "guarde", German "Sie", French "vous"), and es 6 drops the progressive
("Ha aprendido"). Good enough for gist and drafting, not for legal or
medical text; the UI should say it is a small on-device model.

Things found that matter for a build:

- The npm package's own `node main.js` test does not run: its worker uses
  `require` inside an ES-module package. It ran from a scratch copy with a
  `worker/package.json` of `{"type":"commonjs"}` beside the worker. A browser
  build is unaffected (a plain Web Worker); in MemoryMap the worker is a
  classic script served from `frontend/`, so this does not bite.
- The 2022 WASM (`v0.4.5+4917c11`) loaded 2026 "next26" models without
  change, so the engine and the packs are not locked to each other yet.
- The registry key is four letters (`enes`) in the npm client; the client
  takes a `registryUrl` and a `workerUrl`, so a local registry served by
  MemoryMap needs no network (tested against `python -m http.server`).
- The engine bundles marian-nmt, sentencepiece, intgemm, ruy and ssplit-cpp
  (submodules in `.gitmodules`); their notices would have to ship with the WASM.

## 2. The alternative with no engine

Nothing. A model-backed "Translate this" already exists: a document's
"Translate this" hands the passage to chat. It needs a configured model, takes
seconds, and can be slow or wrong on a small model, but it covers every
language the model knows with zero bytes added. The Bergamot route earns its
place only for the speed, the no-model case and the offline-rule, and for the
captions use (a short line in well under 100 ms).

## 4. Build (the orchestrator's go, 2026-10-10)

Status: built. The Built block is in HISTORY ("WORLD_CLASS 28.5, Brief 83");
WORLD_CLASS_PLAN 28.5 row 10 carries the pointer.

- Engine placement, measured: **in the browser**, a classic Web Worker
  (`frontend/js/translate-worker.js`). The app CSP already had
  `'wasm-unsafe-eval'` and `worker-src 'self'` (the grammar checker) and the
  engine glue has no `eval` or `new Function`, so the policy did not change;
  the server has no WASM runtime and none may be installed (CLAUDE.md 7).
- Numbers: 94-word paragraph warm in the page's worker, median 591 ms, 27
  of 29 under 1 s (375 to 1,054; load 6 to 9 on four shared cores); through
  the sheet 0.8 to 1.8 s; first ask 2.4 to 9.1 s load then 0.7 to 1.7 s;
  renderer 196 to 479 MB loaded, 186 MB after the idle stop; 27.2 MB
  download, 41.8 MB on disk.

Left, one line each:

- Captions (28.5 row 10, "for ... captions"): Brief 82 landed during this
  build; a selected caption goes through the palette row like any selection
  (not driven), and live translated captions (each line through
  `translateAsk`, `frontend/js/translate.js:51`, into `captions.js`'s dock)
  are not built.
- More pairs (the owner: "What about ai free translations?"): es-en, de, fr
  are a `Download` block each in `src/memorymap/core/extras.py` (entry
  `translate`) and a row in `src/memorymap/ai/translate.py` `PAIRS`; the
  sheet then needs a pair picker (`translate.js`, `status.pairs[0]` today).
- The document's own "Translate this passage..." menu row
  (`frontend/js/documents.js:17622`) still hands the passage to chat; it
  could offer the offline engine first when the package is installed.

## Not verified (build)

- A paragraph under 1 s through the sheet on an unloaded machine: every run
  here shared four cores at load 6 to 9; the worker alone was under 1 s in
  27 of 29 runs, the sheet path 0.8 to 1.8 s.
- The real network install from the pinned URLs inside the app: the app
  installed from a loopback mirror of the same files (same names, hashes
  checked); the files themselves were fetched from the pinned URLs by curl.
- Chromium's WASM code cache across sessions (a fresh profile every run, so
  every first ask paid the full compile); WebView2 and Safari.
- `performance.measureUserAgentSpecificMemory` is not available in the
  headless shell; memory is the renderer's RSS from `ps`.

## 3. If the orchestrator says go (superseded by 4)

- Package: the engine (5.3 MB with its notices) and each pair (25 MB) as
  optional packages through the add-on installer (`grep -n add-on
  src/memorymap/api`), unpacked under the data dir, never in `frontend/vendor/`
  or the repo; each carries an MPL-2.0 `LICENSE` and the upstream notices
  (test_vendor_licences covers only `frontend/vendor/`, so the add-on path
  needs its own licence check).
- `src/memorymap/ai/translate.py` and one route; palette row "Translate this"
  (documents, notes, readings; captions when Brief 82 lands); help moves with it.
- Gate: a paragraph under 1 s measured in Chromium (not done here).

## Not verified

- Chromium: the WASM ran in Node 22 only, not in a browser tab, so threading
  headers (COOP/COEP are not needed for the single worker but were not tested),
  memory, and the CSP (`wasm-unsafe-eval` for WebAssembly under the app's CSP)
  are unchecked. Peak memory was not measured (no `time -v` here).
- Languages beyond en to es, de, fr; the reverse directions and pivoting
  through English were not run, only their sizes and published scores read.
- The licence of the training data behind each model: Mozilla states the model
  files are MPL-2.0; the corpora behind them were not audited here.
- The bundled third-party notices inside the WASM (read from `.gitmodules`
  only, licences not opened).
- Quality was my reading of 30 outputs, not a score; no Spanish, German or
  French speaker checked it.
- The Windows and macOS builds of Chromium/WebView2; the machine was shared,
  so timings carry that noise.
