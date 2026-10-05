// The overnight quality pass (qa-1005): one check per vibe-coded tell it fixed,
// each a number, so a regression reads as a FAIL line rather than a look.
//   BASE=... PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers [W=1440] [THEME=dark] [ONLY=reminders] node qa1005-polish.js
// Needs a notebook with reminders linked to notes (seed-showcase.py makes one).
const { boot } = require('./lib.js');

const W = Number(process.env.W || 1440);
const CHECKS = {
  //: A hovered reminder's action strip lies over its time, whole: a reminder
  //: linked to a note has a second line, and the strip, centred on the whole
  //: row, left the top half of the time showing above it.
  async reminders(page) {
    await page.evaluate(() => switchTab('reminders'));
    await page.waitForSelector('#reminder-groups li[data-id] .entry-date', { timeout: 15000 });
    await page.waitForTimeout(300);
    const ids = await page.evaluate(() => [...document.querySelectorAll('#reminder-groups li[data-id]')].slice(0, 6).map((li) => li.dataset.id));
    const out = [];
    for (const id of ids) {
      const sel = `#reminder-groups li[data-id="${id}"]`;
      const box = await page.evaluate((s) => { const li = document.querySelector(s); li.scrollIntoView({ block: 'center' }); const b = li.getBoundingClientRect(); return { x: b.left + 200, y: b.top + 12 }; }, sel);
      await page.mouse.move(box.x, box.y);
      await page.waitForTimeout(350);
      const m = await page.evaluate((s) => {
        const li = document.querySelector(s);
        const date = li.querySelector('.entry-meta > .entry-date')?.getBoundingClientRect();
        const acts = li.querySelector('.entry-meta > .entry-actions')?.getBoundingClientRect();
        if (!date || !acts) return null;
        const pos = getComputedStyle(li.querySelector('.entry-meta > .entry-actions')).position;
        return { pos, linked: Boolean(li.querySelector('.entry-links')), showing: Math.max(0, acts.top - date.top) + Math.max(0, date.bottom - acts.bottom) + Math.max(0, date.right - acts.right), date: [date.top, date.bottom, date.right].map(Math.round), acts: [acts.top, acts.bottom, acts.right].map(Math.round) };
      }, sel);
      if (!m || m.pos !== "absolute") { if (process.env.DEBUG) console.log("skip", id, JSON.stringify(m)); continue; }
      out.push(m);
    }
    const bad = out.filter((m) => m.showing > 0.5);
    console.log(`reminders: ${out.length} hovered rows, ${out.filter((m) => m.linked).length} linked, time showing past the strip on ${bad.length}`, bad.length ? JSON.stringify(bad) : '');
    return bad.length;
  },
  //: A note card's task lines draw as boxes, not as the "- [x]" they are
  //: written with (seed-showcase.py's "Harbor launch plan" has four).
  async tasks(page) {
    await page.evaluate(() => switchTab('notes'));
    await page.waitForSelector('#entry-list > li .entry-content', { timeout: 15000 });
    await page.evaluate(() => { const li = [...document.querySelectorAll('#entry-list > li')].find((l) => /Harbor launch plan/.test(l.textContent)); li?.querySelector('.entry-more')?.click(); });
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#entry-list > li .entry-content')];
      return { raw: cards.filter((c) => /(^|\n)\s*[-*+]\s+\[[ xX]\]/.test(c.innerText)).length, boxes: document.querySelectorAll('#entry-list .entry-task > input[type=checkbox]').length, done: document.querySelectorAll('#entry-list .entry-task > input:checked').length };
    });
    console.log(`note cards: ${m.raw} showing "- [ ]" as text, ${m.boxes} task boxes (${m.done} ticked)`);
    return m.raw + (m.boxes ? 0 : 1);
  },
  //: The empty states' "Ask Atlas" chip is set apart by space, not by a
  //: short hairline floating in the middle of a centred welcome.
  async emptyrule(page) {
    await page.evaluate(() => switchTab('chat'));
    await page.waitForSelector('.chat-empty > .help-atlas', { timeout: 15000 });
    const rules = await page.evaluate(() => [...document.querySelectorAll(':is(.chat-empty, #empty-message, #library-empty) > .help-atlas')].map((e) => ({ id: e.parentElement.id || e.parentElement.className, top: parseFloat(getComputedStyle(e).borderTopWidth) })));
    const bad = rules.filter((r) => r.top > 0);
    console.log(`empty states: ${rules.length} Atlas offers, ${bad.length} with a rule over them`, bad.length ? JSON.stringify(bad) : '');
    return bad.length;
  },
};

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...(W < 600 ? { hasTouch: true, isMobile: true } : {}) });
  let findings = 0;
  for (const [name, check] of Object.entries(CHECKS)) {
    if (process.env.ONLY && process.env.ONLY !== name) continue;
    findings += await check(page);
  }
  console.log(findings ? `FAIL: ${findings} findings at ${W}` : `PASS: 0 findings at ${W}`);
  await browser.close();
  process.exit(findings ? 1 : 0);
})();
