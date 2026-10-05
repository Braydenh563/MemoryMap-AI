// CHAT_PLAN placed row "The Chat tab's Ask mode ignores grounding_live": the
// citation numbers in a Chat-tab answer arrived with the finished answer, where
// the Ask sub-tab numbers them as each sentence completes (INBOX 320). Drives a
// Chat-tab question (tools off, so it is a plain grounded answer) against the
// pacing stand-in model and reads, per animation frame from the click:
//   - when the first citation marker appears in `.bubble-answer`,
//   - when the answer stops streaming (`is-streaming` leaves),
//   - the markers at the end (the final pass must not lose or double them).
// Pass: first marker lands 300 ms or more before the last token, and the final
// marker count equals the one grounded-note count (no duplicates).
//
//   .venv/bin/python scratchpad/fake_answer_server.py 8809   # FAKE_DELAY_MS=140
//   BASE=http://127.0.0.1:8791 FAKE=http://127.0.0.1:8809/v1 \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/chatlivecite.js
const { boot } = require("./lib.js");

const FAKE = process.env.FAKE || "http://127.0.0.1:8809/v1";
const NOTES = [
  "The sourdough starter is fed with rye flour every morning at seven.",
  "My hiking boots need resoling before the Snowdon trip in October.",
  "The garage door opener responds to the blue remote but not the grey one.",
];

async function run(viewport, phone, seed) {
  const { page, browser } = await boot({ viewport, hasTouch: phone, isMobile: phone });
  await page.evaluate(async ({ base, notes, seed }) => {
    for (const content of seed ? notes : []) {
      await apiJson("/entries", { method: "POST", body: JSON.stringify({ content, category: "General" }) });
    }
    await api("/models/provider", { method: "POST", body: JSON.stringify({ provider: "openai", base_url: base }) });
    await api("/models/chat-model", { method: "POST", body: JSON.stringify({ name: "fake-answerer" }) }).catch(() => null);
  }, { base: FAKE, notes: NOTES, seed });
  // The chat box is gated on the model status, which refreshes on a timer:
  // ask for it now and wait until the box is enabled.
  await page.evaluate(async () => { await refreshModelStatus(); switchTab("chat"); });
  await page.waitForFunction(() => { const i = document.getElementById("chat-input"); return i && !i.disabled; }, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const t = document.getElementById("tools-toggle");
    if (t && t.checked) { t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  // Record the stream's own events, so a late marker can be told apart: the
  // backend sending `grounding_live` late, or the page placing it late.
  await page.evaluate(() => {
    window.__ev = { live: [], firstAnswer: null, lastAnswer: null, t0: performance.now() };
    const real = window.streamChat;
    window.streamChat = (opts) => {
      const onLive = opts.onGroundingLive;
      const onAnswer = opts.onAnswer;
      opts.onGroundingLive = (e) => { window.__ev.live.push([Math.round(performance.now() - window.__ev.t0), (e.sentences || []).length]); return onLive?.(e); };
      opts.onAnswer = (e) => { const t = Math.round(performance.now() - window.__ev.t0); window.__ev.firstAnswer ??= t; window.__ev.lastAnswer = t; return onAnswer?.(e); };
      return real(opts);
    };
  });
  await page.fill("#chat-input", "What do my notes say about the starter, the boots and the garage door?");
  await page.evaluate(() => {
    window.__t = { firstText: null, firstMarker: null, firstMarkerWhileStreaming: null, done: null, t0: performance.now(), maxLive: 0 };
    const tick = () => {
      const t = performance.now() - window.__t.t0;
      const answers = [...document.querySelectorAll("#chat-messages .bubble-answer")];
      const markers = answers.reduce((n, a) => n + a.querySelectorAll(".answer-citation").length, 0);
      const streaming = answers.some((a) => a.classList.contains("is-streaming"));
      if (answers.some((a) => a.textContent.trim().length > 20) && window.__t.firstText == null) window.__t.firstText = t;
      if (markers && window.__t.firstMarker == null) window.__t.firstMarker = t;
      if (markers && streaming && window.__t.firstMarkerWhileStreaming == null) window.__t.firstMarkerWhileStreaming = t;
      if (streaming) window.__t.maxLive = Math.max(window.__t.maxLive, markers);
      if (answers.length && !streaming && t > 600) { window.__t.done = t; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.click("#chat-send");
  await page.waitForFunction(() => window.__t && window.__t.done != null, null, { timeout: 90000, polling: 250 }).catch(() => {});
  await page.waitForTimeout(1500);
  const read = await page.evaluate(() => {
    const answers = [...document.querySelectorAll("#chat-messages .bubble-answer")];
    const marks = answers.flatMap((a) => [...a.querySelectorAll(".answer-citation")]);
    return {
      timing: window.__t,
      ev: window.__ev,
      markers: marks.length,
      distinctNotes: new Set(marks.map((m) => m.dataset.noteId)).size,
      text: answers.map((a) => a.textContent).join(" ").replace(/\s+/g, " ").slice(0, 160),
      sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  const t = read.timing;
  const fmt = (v) => (v == null ? "never" : `${Math.round(v)} ms`);
  console.log(
    (phone ? "390" : "1440"),
    `first text ${fmt(t.firstText)}, first marker ${fmt(t.firstMarker)}, while streaming ${fmt(t.firstMarkerWhileStreaming)}, done ${fmt(t.done)},`,
    `markers streaming-max ${t.maxLive}, final ${read.markers} (${read.distinctNotes} notes)`,
  );
  console.log('  stream events', JSON.stringify(read.ev));
  await browser.close();
  return {
    // Earlier than the last token by 300 ms, not merely "while the streaming
    // class is on": that class lingers a frame or two after the last token,
    // which let the base pass at 390 on a marker placed by the final pass.
    live: t.firstMarker != null && read.ev.lastAnswer != null &&
      (t.t0 + t.firstMarker) < (read.ev.t0 + read.ev.lastAnswer - 300),
    final: read.markers >= 1 && read.markers <= read.distinctNotes + 1 + 2,
    noSideways: !read.sideways,
  };
}

(async () => {
  const a = await run({ width: 1440, height: 900 }, false, true);
  const b = await run({ width: 390, height: 844 }, true, false);
  console.log(JSON.stringify({ a, b }));
  const ok = [a, b].every((r) => Object.values(r).every(Boolean));
  console.log(ok ? "PASS" : "FAIL");
  process.exit(ok ? 0 : 1);
})();
