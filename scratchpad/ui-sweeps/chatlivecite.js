// CHAT_PLAN placed row "The Chat tab's Ask mode ignores grounding_live": the
// citation numbers in a Chat-tab answer arrived with the finished answer, where
// the Ask sub-tab numbers them as each sentence completes (INBOX 320). Drives a
// Chat-tab question (tools off, so it is a plain grounded answer) against the
// pacing stand-in model and reads, per animation frame from the click:
//   - when the first citation marker appears in `.bubble-answer`,
//   - when the answer stops streaming (`is-streaming` leaves),
//   - the markers at the end (the final pass must not lose or double them).
// Pass: first marker lands while the answer is still streaming, and the final
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

async function run(viewport, phone) {
  const { page, browser } = await boot({ viewport, hasTouch: phone, isMobile: phone });
  await page.evaluate(async ({ base, notes }) => {
    for (const content of notes) {
      await apiJson("/entries", { method: "POST", body: JSON.stringify({ content, category: "General" }) });
    }
    await api("/models/provider", { method: "POST", body: JSON.stringify({ provider: "openai", base_url: base }) });
    await api("/models/chat-model", { method: "POST", body: JSON.stringify({ name: "fake-answerer" }) }).catch(() => null);
  }, { base: FAKE, notes: NOTES });
  await page.evaluate(() => switchTab("chat"));
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const t = document.getElementById("tools-toggle");
    if (t && t.checked) { t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.fill("#chat-input", "What do my notes say about the starter, the boots and the garage door?");
  await page.evaluate(() => {
    window.__t = { firstMarker: null, firstMarkerWhileStreaming: null, done: null, t0: performance.now(), maxLive: 0 };
    const tick = () => {
      const t = performance.now() - window.__t.t0;
      const answers = [...document.querySelectorAll("#chat-messages .bubble-answer")];
      const markers = answers.reduce((n, a) => n + a.querySelectorAll(".answer-citation").length, 0);
      const streaming = answers.some((a) => a.classList.contains("is-streaming"));
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
    `first marker ${fmt(t.firstMarker)}, while streaming ${fmt(t.firstMarkerWhileStreaming)}, done ${fmt(t.done)},`,
    `markers streaming-max ${t.maxLive}, final ${read.markers} (${read.distinctNotes} notes)`,
  );
  await browser.close();
  return {
    live: t.firstMarkerWhileStreaming != null,
    final: read.markers >= 1 && read.markers <= read.distinctNotes + 1 + 2,
    noSideways: !read.sideways,
  };
}

(async () => {
  const a = await run({ width: 1440, height: 900 }, false);
  const b = await run({ width: 390, height: 844 }, true);
  console.log(JSON.stringify({ a, b }));
  const ok = [a, b].every((r) => Object.values(r).every(Boolean));
  console.log(ok ? "PASS" : "FAIL");
  process.exit(ok ? 0 : 1);
})();
