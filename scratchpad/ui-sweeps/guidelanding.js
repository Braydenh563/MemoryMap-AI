// CHAT_PLAN 9 row 2 (Brief 88): every Guide topic's open button lands on a
// visible control, lit. Reads every topic's badge from ai/help_chat.py
// (HELP_TOPICS, which takes in help_topics_more.py), presses each distinct
// badge from the Guide, and measures the ringed element (`.feature-reveal`):
// on the page, inside the window, and the top hit at its centre.
//   BASE=http://127.0.0.1:8836 VW=1440|390 node guidelanding.js
const { execFileSync } = require("child_process");
const path = require("path");
const { boot } = require("./lib.js");
const ROOT = path.resolve(__dirname, "../..");
const py = path.join(ROOT, ".venv/bin/python");
const topics = JSON.parse(execFileSync(py, ["-c", "import json; from memorymap.ai import help_chat as h; print(json.dumps([{'id': t['id'], **t['badge']} for t in h.HELP_TOPICS if t.get('badge')]))"], { env: { ...process.env, PYTHONPATH: path.join(ROOT, "src") } }).toString());
const VW = Number(process.env.VW || 1440);
(async () => {
  const phone = VW < 600;
  const { browser, page } = await boot(phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1440, height: 900 } });
  const keyOf = (b) => b.section ? `${b.section}/${b.target || ""}` : b.tab;
  const distinct = [...new Map(topics.map((b) => [keyOf(b), b])).values()];
  const res = {};
  for (const badge of distinct) {
    // A ring lasts 2.7 s, longer than one probe: the last one's is taken off.
    await page.evaluate(() => { closeOverlaysForChord(); switchTab("dashboard"); document.querySelectorAll(".feature-reveal").forEach((e) => e.classList.remove("feature-reveal")); });
    await page.waitForTimeout(300);
    await page.evaluate(() => openHelpChat()); await page.waitForTimeout(500);
    await page.evaluate((b) => { document.getElementById("guide88-probe")?.remove(); const btn = helpChatOpenButton(b); btn.id = "guide88-probe"; $("help-chat-messages").appendChild(btn); }, badge);
    await page.click("#guide88-probe").catch(() => page.evaluate(() => $("guide88-probe").click()));
    // A lazy tab or a section built on open can take seconds under load.
    await page.waitForFunction(() => document.querySelector(".feature-reveal"), null, { timeout: 8000 }).catch(() => {});
    // The ring may scroll its control in, smoothly: measured once it stops.
    await page.waitForTimeout(900);
    res[keyOf(badge)] = await page.evaluate(() => {
      const el = document.querySelector(".feature-reveal");
      if (!el) return { lit: false };
      const r = el.getBoundingClientRect();
      // Seen: its top edge inside the window (a box taller than the window
      // cannot be wholly inside it), and not past either side.
      const inWin = r.width > 0 && r.height > 0 && r.top >= -1 && r.top < innerHeight - 8 && r.left >= -1 && r.right <= innerWidth + 1;
      const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + r.height / 2, innerHeight - 2));
      // Painted is the hit test below: checkVisibility() read false for a
      // segment the pointer lands on (the Reminders list toggle at 390).
      return { lit: true, visible: inWin, onTop: !!hit && (el.contains(hit) || hit.contains(el)), what: el.id || el.className.toString().slice(0, 30), box: [r.left, r.top, r.right, r.bottom].map(Math.round), shown: el.checkVisibility() };
    });
  }
  const per = topics.map((b) => ({ id: b.id, key: keyOf(b), ...res[keyOf(b)] }));
  const ok = per.filter((p) => p.lit && p.visible && p.onTop);
  console.log(`VW ${VW}: topics ${per.length}, distinct badges ${distinct.length}, landed lit and visible ${ok.length}`);
  for (const [k, v] of Object.entries(res)) if (!(v.lit && v.visible && v.onTop)) console.log("  MISS", k, JSON.stringify(v));
  await browser.close();
})();
