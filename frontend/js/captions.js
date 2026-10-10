// captions.js: live captions over any surface (WORLD_CLASS_PLAN 28.5 row 9,
// Brief 82). Lazy (`LAZY_MODULES.captions`), reached from the palette's
// "Live captions" row, which starts them or, while they run, stops them.
//
// The page owns the microphone: it decimates the stream to 16 kHz mono and
// posts about a quarter second of it at a time to /voice/captions/<id>/audio,
// one request in flight; the reply carries the line still being written and
// the last three committed ones. The window, the helper and the commit rule
// are the server's (ai/captions.py). Stop saves the whole transcript as a
// note, and the dock's Copy takes the same text.
//
// The pipeline is timed on every reply (`captionRun.timing`: when the reply
// arrived, when its text was painted) so scratchpad/ui-sweeps/captions82.js
// can measure the page's own share of the speech-to-caption budget.

const CAPTION_RATE = 16000;
const CAPTION_SEND_EVERY_MS = 250;
//: Under the server's 64 KiB ceiling (32,000 samples) with room to spare.
const CAPTION_MAX_SAMPLES = 24000;

const captionRun = {
  id: "",
  stream: null,
  ctx: null,
  node: null,
  tick: 0,
  pending: [],
  sending: false,
  carry: { acc: 0, n: 0, pos: 0 },
  lines: [],
  running: "",
  model: "",
  elapsed: 0,
  timing: [],
  //: When the first audio block reached the page, for the latency sweep.
  firstAudioAt: 0,
};

function captionsText() {
  return [...captionRun.lines, captionRun.running].filter(Boolean).join("\n");
}

//: Box-average decimation to 16 kHz, carried across blocks so no sample is
//: dropped or doubled at a seam. An AudioContext at 16 kHz would do this
//: natively, but Firefox refuses to connect a stream clocked at another rate
//: to one.
function captionDecimate(input, rate) {
  const ratio = rate / CAPTION_RATE;
  const out = [];
  const c = captionRun.carry;
  for (let i = 0; i < input.length; i++) {
    c.acc += input[i];
    c.n++;
    c.pos++;
    if (c.pos >= ratio) {
      const v = Math.max(-1, Math.min(1, c.acc / c.n));
      out.push(v < 0 ? v * 0x8000 : v * 0x7fff);
      c.acc = 0;
      c.n = 0;
      c.pos -= ratio;
    }
  }
  return Int16Array.from(out);
}

function captionPaint() {
  const past = $("captions-past");
  past.textContent = captionRun.lines.slice(-3).join("\n");
  $("captions-running").textContent = captionRun.running;
  const seconds = Math.floor(captionRun.elapsed / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  $("captions-meta").textContent = `${captionRun.model} · ${clock}`;
  $("captions-copy").disabled = !captionsText();
}

async function captionSendNext() {
  if (captionRun.sending || !captionRun.id) return;
  let samples = 0;
  const take = [];
  while (captionRun.pending.length && samples < CAPTION_MAX_SAMPLES) {
    const block = captionRun.pending.shift();
    take.push(block);
    samples += block.length;
  }
  if (!samples) return;
  const body = new Int16Array(samples);
  let at = 0;
  for (const block of take) {
    body.set(block, at);
    at += block.length;
  }
  captionRun.sending = true;
  try {
    const reply = await apiJson(`/voice/captions/${captionRun.id}/audio`, {
      method: "POST",
      body: body.buffer,
      headers: { "Content-Type": "application/octet-stream" },
      readOnly: true,
      silent: true,
    });
    if (!captionRun.id) return;
    const replyAt = performance.now();
    captionRunMerge(reply);
    captionRun.running = reply.running || "";
    captionRun.elapsed = reply.elapsed_ms || 0;
    requestAnimationFrame(() => {
      captionPaint();
      captionRun.timing.push({ replyAt, paintedAt: performance.now(), text: captionRun.running });
    });
    $("captions-dock").classList.toggle("is-error", !!reply.error);
    if (reply.error) $("captions-running").textContent = captionRun.running || "The captions helper is not answering.";
    if (reply.stopped) stopLiveCaptions();
  } catch (error) {
    if (!captionRun.id) return;
    toast(error.message || "Live captions stopped.", true);
    stopLiveCaptions();
  } finally {
    captionRun.sending = false;
  }
}

//: The server sends the last three committed lines and how many it has
//: committed in all, so the page keeps every line by position (matching the
//: text instead would swallow a line said twice).
function captionRunMerge(reply) {
  const first = reply.count - reply.lines.length;
  reply.lines.forEach((line, i) => {
    if (first + i >= captionRun.lines.length) captionRun.lines.push(line);
  });
}

async function startLiveCaptions() {
  if (captionRun.id) return;
  const status = await apiJson("/voice/status", { silent: true }).catch(() => null);
  const info = status?.captions;
  if (!info?.available) {
    toast(info?.hint || "Live captions aren't available.", "info");
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast("Microphone access was blocked, allow it in your browser.", "info");
    return;
  }
  let started;
  try {
    started = await apiJson("/voice/captions/start", { method: "POST", body: "{}" });
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    toast(error.message, true);
    return;
  }
  Object.assign(captionRun, { id: started.id, stream, lines: [], running: "", model: started.model, elapsed: 0, pending: [], timing: [], firstAudioAt: 0 });
  Object.assign(captionRun.carry, { acc: 0, n: 0, pos: 0 });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  //: ScriptProcessor is deprecated but runs in every engine without a second
  //: file or a blob: worker the CSP would have to allow.
  const node = ctx.createScriptProcessor(4096, 1, 1);
  node.onaudioprocess = (e) => {
    if (!captionRun.firstAudioAt) captionRun.firstAudioAt = performance.now();
    captionRun.pending.push(captionDecimate(e.inputBuffer.getChannelData(0), ctx.sampleRate));
  };
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(node);
  node.connect(mute);
  mute.connect(ctx.destination);
  Object.assign(captionRun, { ctx, node });
  captionRun.tick = setInterval(captionSendNext, CAPTION_SEND_EVERY_MS);
  $("captions-dock").classList.remove("hidden", "is-error");
  captionPaint();
}

function captionRelease() {
  clearInterval(captionRun.tick);
  captionRun.stream?.getTracks().forEach((t) => t.stop());
  if (captionRun.node) captionRun.node.onaudioprocess = null;
  captionRun.ctx?.close().catch(() => {});
  Object.assign(captionRun, { stream: null, ctx: null, node: null, tick: 0, pending: [] });
}

async function stopLiveCaptions() {
  const id = captionRun.id;
  if (!id) return;
  captionRelease();
  captionRun.id = "";
  $("captions-dock").classList.add("hidden");
  try {
    const done = await apiJson(`/voice/captions/${id}/stop`, { method: "POST", body: "{}" });
    if (!done.entry_id) {
      toast("Nothing was said, so nothing was saved.");
      return;
    }
    await loadEntries();
    flashEntry(done.entry_id);
    toastAction("Saved the captions as a note.", "Open", () => flashEntry(done.entry_id));
  } catch (error) {
    toast(error.message || "Couldn't save the captions.", true);
  }
}

function toggleLiveCaptions() {
  return captionRun.id ? stopLiveCaptions() : startLiveCaptions();
}

$("captions-stop").addEventListener("click", stopLiveCaptions);
$("captions-copy").addEventListener("click", () => copyToClipboard(captionsText(), $("captions-copy")));
