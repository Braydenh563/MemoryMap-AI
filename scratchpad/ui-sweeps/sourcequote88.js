// BASE=http://127.0.0.1:8836 VW=1440|390 node sourcequote88.js (Brief 88)
// chat88 row 7: a note source card opens its note with the quoted span marked.
const { boot } = require("./lib.js");
const VW = Number(process.env.VW || 1440);
(async () => {
  const phone = VW < 600;
  const { browser, page } = await boot(phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { switchTab("chat"); newChatConversation(); }); await page.waitForTimeout(600);
  await page.fill("#chat-input", process.env.Q || "what did I agree with Sam"); await page.click("#chat-send");
  await page.waitForFunction(() => { const a = document.querySelectorAll("#chat-messages .msg.assistant"); return a.length && !a[a.length - 1].classList.contains("is-generating"); }, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const pre = await page.evaluate(() => { const m = [...document.querySelectorAll("#chat-messages .msg.assistant")].pop(); const c = m.querySelector(".chat-source-card.is-openable[data-note-id]"); const id = c && c.dataset.noteId; return { id, marks: m.querySelectorAll(".answer-citation[data-start]").length, cardMark: !!(id && m.querySelector(`.answer-citation[data-note-id="${id}"][data-start]`)) }; });
  await page.evaluate(() => { const m = [...document.querySelectorAll("#chat-messages .msg.assistant")].pop(); m.querySelector("details.chat-sources").open = true; });
  await page.waitForTimeout(300);
  const t0 = Date.now();
  await page.click(`#chat-messages .msg.assistant:last-child .chat-source-card[data-note-id="${pre.id}"]`).catch(async () => page.evaluate((id) => document.querySelector(`.chat-source-card[data-note-id="${id}"]`).click(), pre.id));
  const landed = await page.waitForFunction(() => CSS.highlights.has("source-quote"), null, { timeout: 5000 }).then(() => Date.now() - t0, () => -1);
  await page.waitForTimeout(600);
  const res = await page.evaluate((id) => {
    const h = CSS.highlights.get("source-quote"); const r = h && [...h][0];
    if (!r) return { marked: false, tab: prefs.get("activeTab", null) };
    const box = r.getBoundingClientRect(); const card = r.startContainer.parentElement.closest("li[data-id]");
    return { marked: true, text: r.toString().slice(0, 80), inCard: card?.dataset.id === String(id), visible: box.width > 0 && box.top >= 0 && box.bottom <= innerHeight, box: [box.left, box.top, box.width, box.height].map(Math.round) };
  }, pre.id);
  if (res.marked) { const [x, y, w, h] = res.box; await page.screenshot({ path: (process.env.SCRATCH || ".") + "/sourcequote88.png", clip: { x, y: y - 30, width: Math.min(w, 300), height: h + 30 } }); }
  console.log(JSON.stringify({ VW, pre, landedMs: landed, ...res }));
  await browser.close();
})();
