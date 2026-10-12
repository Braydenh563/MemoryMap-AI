# Live captions agent (Brief 82, WORLD_CLASS_PLAN 28.5 row 9)

Branch `agent/caption82-1010`. Parts 1 and 2 (research, the contract) are
written here; part 3 (fake helper, route, dock) and part 4 (docs) follow.
Nothing is vendored or downloaded into the repo; the research downloads
(models, a pip wheel) lived in the scratchpad.

## 1. Research: whisper.cpp as the optional helper

Sources: `R` = raw.githubusercontent.com/ggml-org/whisper.cpp/master (fetched
2026-10-10), `HF` = huggingface.co/api/models/ggerganov/whisper.cpp?blobs=true.
GitHub's API, release pages and issue pages answer 403 from this sandbox, so
anything that lives only there is marked "not read".

**Licence.** MIT, "Copyright (c) 2023-2026 The ggml authors" (R/LICENSE).
Models are ggml conversions of OpenAI Whisper weights (MIT as well).
ANALYSIS.md 3235 already records this; the notice is kept if any code is ported.

**How `stream` takes the microphone** (R/examples/stream/README.md,
stream.cpp). SDL2 on the native side (`audio_async audio(length_ms)`,
`audio.init(capture_id, 16000)`), so `whisper-stream` is built with
`-DWHISPER_SDL2=ON` and reads the OS microphone itself. That cannot be our
shape: the browser owns the microphone permission. Two modes, both worth
copying as algorithm, not as code:
- Fixed step (default `--step 3000 --length 10000 --keep 200` in source; the
  README example is `--step 500 --length 5000`): every `step` ms, take the
  last `length` ms (plus `keep` ms of the previous step) and transcribe;
  `single_segment` on, `no_context` on, `max_tokens` 32; the line is
  rewritten in place and a new line starts every `length/step - 1` steps.
- Sliding window with VAD (`--step 0 --length 30000 -vth 0.6`): transcribe
  only after a pause, as a timestamped block. The VAD is "very basic"
  (stream.cpp `vad_simple`, an energy ratio with a high-pass).
- `-ac/--audio-ctx N` (default 0 = all) shrinks the encoder's context: the
  lever for short windows (measured below).
- Output (step > 0) is ANSI-rewritten text, "wrong for a pipe" (README), so we
  do not run `whisper-stream` as a subprocess either.

**What the helper is, in our shape.** `whisper-server` (R/examples/server): a
separate native executable, HTTP on `127.0.0.1:8080` by default, `POST
/inference` multipart (`file` = WAV, `response_format=json`, `temperature`,
`prompt`, `no_context` etc.), `POST /load` swaps the model, `GET /` serves a
page (our health probe). It needs no SDL and no ffmpeg unless `--convert`. Its
README warns not to run it with administrative privileges and that it accepts
uploads, so the app starts it bound to 127.0.0.1 only, never exposes it, and
the browser never talks to it: the browser posts 16 kHz mono PCM16 chunks to
the app (`POST /voice/captions/{id}/audio`), and the app keeps the rolling
window and posts WAV windows to the helper. A WebSocket was rejected: the app
has no WebSocket route or auth for one, and a chunk POST whose reply carries
the caption is one round trip per step with the same auth and CSP as every
other call. A Python import (`pywhispercpp`) and a build step in the suite
are out by the brief and by CLAUDE.md section 4.

**Model sizes** (HF blobs, exact bytes; R/models/README.md for MiB and the
runtime memory table in R/README.md "Memory usage"):

| Model | Bytes | Disk | Memory (README) |
| --- | ---: | --- | --- |
| tiny.en | 77,704,715 | 75 MiB | ~273 MB (tiny) |
| tiny.en q5_1 | 32,166,155 | | |
| base.en | 147,964,211 | 142 MiB | ~388 MB (base) |
| base.en q5_1 | 59,721,011 | | |
| small.en | 487,614,201 | 466 MiB | ~852 MB (small) |
| small.en q5_1 | 190,098,681 | | |

**Published speed per 30 s window.** The repo publishes one number: R/examples/
bench/README.md, `whisper-bench -m ggml-small.en.bin -t 4` on an ARM (NEON,
BLAS) machine: encode 1062.21 ms for the 30 s window, total 1303 ms. The
table of per-device results lives in whisper.cpp issue 89 (the bench README
links it); not read, 403 from here.

**Measured here** (this sandbox: 4 vCPU Xeon 2.8 GHz with AVX-512, but
effectively one core of throughput; not the reference laptop). Engine:
whisper.cpp through the `pywhispercpp` 1.5.1 wheel in a scratch venv outside
the repo, models from HF, the repo's own `samples/jfk.wav` (11 s). Whisper
encodes a fixed 30 s mel however short the audio, so a short window costs
nearly what a long one does.
- Threads matter in a throttled box: tiny.en on the 11 s file took 58 s at 4
  threads and 2.27 s at 1 thread (spin contention), so every figure below is
  1 thread, best and median of 2 to 3 runs.
- tiny.en: 30 s window 4.73 s, 5 s window 1.93 s, 2 s window 1.78 s (load 0.11 s).
- base.en: 30 s 13.3 s, 5 s 4.7 s, 2 s 6.8 s (noisy: the box was shared).
- small.en: 30 s 40.5 s, 5 s 20.5 s, 2 s 18.0 s (load 2.9 s): not usable live on this box.
- The lever is `audio_ctx` (stream's `-ac`; the server takes it as a form
  field), 1 unit = 20 ms of audio, 5 s window, best of 3 (another job ran on
  the box for part of this, so read the order, not the decimals):
  tiny.en 2.25 s (0, full 30 s) -> 0.98 (768) -> 0.72 (512) -> 0.51 (384);
  base.en 6.15 s -> 3.25 -> 2.10 -> 1.85. The app sends `audio_ctx = window
  ms / 20 + 64` (364 for a 6 s window). Same jfk sentence from all of them;
  accuracy under a cut context was read on one 5 s sample only, not measured.
- Reading: on one throttled core only tiny.en comes under the 2 s bar, and
  only with the cut context (0.5 s helper time leaves 1.5 s for the 700 ms
  step plus the page); base.en at best 1.85 s is over it. The bar is a
  statement about the reference laptop, which is not here.

**Packaging, never a build step.** The add-on installer already has the shape:
`core/extras.py` `Extra(kind="download")` with pinned `Download(url, sha256,
size, unpack, members, platform)` entries unpacked into the data dir by
`core/extra_downloads.py` (Pyodide, RapidOCR, the needle3 libraries use it).
A "Live captions" add-on is two downloads: the platform's `whisper-server`
binary and a model (tiny.en q5_1, 32 MB, or base.en). Whisper.cpp releases
carry Windows zips (`whisper-bin-x64.zip` and BLAS and CUDA variants); the
release asset list is not readable from here, so the pins (URL, sha256, size)
cannot be written honestly and Linux and macOS have no official binary that
I could confirm (a package manager's `whisper-cpp`, or a build by hand with
`WHISPER_SERVER` pointing at it). That is the shipping gap, listed below.

## 2. The contract (decision 4's shape, decision 5 kept separate)

1. **The seam.** `MEMORYMAP_CAPTIONS_URL` (the helper's base URL, no path) and
   optional `MEMORYMAP_CAPTIONS_MODEL` (a label; default `tiny.en`). Read by
   `ai/captions.py` at call time, not at import. A shell without the URL has
   no captions and no test reaches for the helper; every real-helper test is
   marked `captions` and skipped without the URL, the same shape as
   `MEMORYMAP_EVALS_URL` (pytest.ini marker, `tests/test_captions_live.py`).
   `scratchpad/fake_captions_server.py` is what the ordinary suite and the UI
   measurement run against, started by the test itself on an ephemeral port
   (a thread inside pytest, never a subprocess of a script that downloads).
2. **`GET /voice/status`** gains `captions: {available, model}` (`available`
   false with a `hint` when no helper answers; the existing keys stay).
   `available` is "the URL is set and `GET /` answered within 1 s", cached 10 s.
3. **Routes** (`api/routes_captions.py`, all under `/voice/captions`):
   `POST /start` returns `{id, model, step_ms}` or 503 with a sentence;
   `POST /{id}/audio` takes the body as raw PCM16 little-endian 16 kHz mono
   (<= 64 KiB, ~2 s) and returns `{running, lines, elapsed_ms, busy}` where
   `running` is the line still being rewritten and `lines` the last three
   committed; `POST /{id}/stop` ends the session, saves the transcript as a
   note (title "Live captions, <date time>", tag `captions`, filed later, via
   `routes_entries.create_entry`; Brief 80's recording object is not on this
   branch, so the note is the fallback the brief names, and when it lands the
   same call attaches the audio) and returns `{entry_id, text}`; an empty
   session saves nothing. Sessions live in memory with an idle sweep (60 s
   without audio ends and saves), one at a time, listed in Activity as a
   stoppable "Live captions" job.
4. **The window** (stream's fixed-step mode, our values): the app keeps up to
   `length` 6 s of PCM, every `step` 700 ms of new audio it posts the last
   window as WAV to `{URL}/inference` (`response_format=json`, `no_context`
   true), at most one request in flight (a chunk that arrives meanwhile only
   extends the buffer and replies `busy: true` with the last text, so latency
   never queues). A pause of >= 800 ms (energy gate, own code, stream's
   idea) commits the running line and starts the next; text never moves back
   out of `lines`.
5. **The dock** (DESIGN.md `.dock`, one `data-dock-name="captions"`, joined to
   `ON_THE_GRAMMAR`): `#captions-dock`, fixed above the status bar over any
   surface, a `.dock-identity` (the page-head title "Live captions" and a
   quiet `.dock-chip` with the model and elapsed time), the caption block (the
   running line large, the last three committed lines muted, `aria-live`
   polite), and `.dock-actions`: Copy (worded ghost), the help '?'
   (`data-help-for`), Stop (the one filled button, last). Opens from the
   palette ("Live captions"), a status-bar tool is Brief 80's Audio section
   (row 3). Unavailable: the command opens a toast with the hint, no dead
   control. Below 600 it is a bottom sheet width, one line of captions plus
   the actions; Stop stays 44 px.
6. **Capture in the page.** `getUserMedia` mic to a `ScriptProcessorNode`,
   decimated to 16 kHz in the page (Firefox refuses a 16 kHz context fed from
   a differently-clocked stream), 250 ms chunks, a chunk in flight at a time.
   Closing the dock or leaving the app releases the microphone.
7. **Bar and not-verified.** Under 2 s from speech to caption. Measured here:
   the dock's pipeline against the fake helper (chunk reply to text painted,
   and microphone-to-text with Chromium's fake audio file). Not verifiable
   here and stated every time: real inference latency on the reference laptop,
   any real microphone, any real whisper-server build, the add-on download.

## 3. Built (commit a42b5dd09 and after)

`ai/captions.py`, `api/routes_captions.py` (`/voice/captions/start`,
`/{id}/audio`, `/{id}/stop`), `captions` in `GET /voice/status`,
`scratchpad/fake_captions_server.py` (+ `captions_audio.py`),
`frontend/js/captions.js` + `css/captions-lazy.css`, `#captions-dock` in
index.html, the palette row, Settings, Packages row (unavailable, bundle
"Live captions"), the Guide topic `live-captions`, `tests/test_captions.py`
(15) and `tests/test_captions_live.py` (skipped without the URL),
`scratchpad/ui-sweeps/captions82.js`. Numbers are in HISTORY ("Moved from the
plans, 2026-10-10 (WORLD_CLASS 28.5 row 9, live captions, Brief 82)").

## 4. Left, one line each (file:line)

- The packaged helper: a `Download` pin per platform (URL, sha256, size) for
  `whisper-server` and a model, `core/extras.py` `id="captions"` (needs the
  release asset list, unreadable from the sandbox), then the supervisor that
  starts it on 127.0.0.1 and sets the URL (`ai/captions.helper_url` reads only
  the environment today). Linux and macOS have no official binary I could
  confirm.
- Real latency: run `scratchpad/captions_audio.py` through a real
  whisper-server on the reference laptop (`MEMORYMAP_CAPTIONS_URL`, then
  `pytest -m captions tests/test_captions_live.py` and the sweep with
  `HELPER` pointing at it; the sweep's `/config` call is fake-only) and tune
  `STEP_MS`, `LENGTH_MS`, the `audio_ctx` margin (`ai/captions.py:29,31`). The
  worst word at a 0.5 s stand-in helper was 1.2 s from its start on a quiet
  box and 2.2 s in a run taken under load: the bar holds at the median, and
  the tail depends on the helper's speed, which is what the real run decides.
- Accuracy under a cut `audio_ctx` was read on one sentence only.
- Brief 80's recording object is not on this branch, so Stop saves a note;
  when it lands, `routes_captions._save` attaches the audio and makes the
  transcript its text. The Audio section (28.5 row 3) is where a status-bar
  tool for captions goes (`PHONE_STATUS_ROWS` entry with it).
- `ScriptProcessorNode` is deprecated; an AudioWorklet needs a blob: worker
  the CSP does not allow today (`frontend/js/captions.js`, `startLiveCaptions`).
- Speaker labels and a timestamped transcript (rows 7 and 11) are Brief 81's.
- Translator captions are row 10 (Brief 83).
