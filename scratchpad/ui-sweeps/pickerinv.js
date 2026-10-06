// INBOX 467: the Attach picker (Chat's note button), measured against the
// dialog recipe. Opened with the real `openNotePicker()` on the Chat tab (a
// sheet below 600), three notes seeded into `allEntries` so the rows exist.
//
//   BASE=http://127.0.0.1:8818 W=1440 THEME=light OUT=/tmp/pop18/picker-1440-light-before.json node pickerinv.js
//   SHOT=/tmp/pop18/picker-1440-light-before.png to also save a screenshot.
const { boot } = require('./lib.js');
const fs = require('fs');
const W = +(process.env.W || 1440);
const PHONE = W < 600;
(async () => {
  const { browser, page } = await boot(PHONE
    ? { viewport: { width: W, height: 844 }, hasTouch: true, isMobile: true }
    : { viewport: { width: W, height: 900 } });
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const mk = (id, content, category) => ({ id: 9000 + id, content, category, tags: [], created_at: new Date().toISOString() });
    allEntries.push(
      mk(1, 'Weekly review: what moved, what stalled, what to drop next week', 'Work'),
      mk(2, 'Sourdough starter feeding schedule and the flour ratios that worked', 'Recipes'),
      mk(3, 'Idea for a reading list on local-first software', 'Ideas'),
    );
    attachedNoteIds.push(9002);
    openNotePicker();
  });
  await page.waitForTimeout(900);
  const out = await page.evaluate(() => {
    const panel = document.getElementById('note-picker-panel');
    const card = (document.querySelector('[data-sheet="attach"] .sheet-card') || panel);
    const cs = getComputedStyle(card); const r = card.getBoundingClientRect();
    const o = { shell: card.className || card.id, radius: cs.borderTopLeftRadius, padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' '), border: cs.borderTopWidth + ' ' + cs.borderTopColor, bg: cs.backgroundColor, shadow: cs.boxShadow.slice(0, 40), width: Math.round(r.width), height: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) };
    const vis = (e) => e && e.getBoundingClientRect().width > 0;
    const head = [...panel.querySelectorAll('.dialog-head')].find(vis) || card.querySelector('.sheet-head');
    if (head) { const t = head.querySelector('.dialog-head-title, .sheet-title'); const ts = getComputedStyle(t); o.headH = Math.round(head.getBoundingClientRect().height); o.title = ts.fontSize + '/' + ts.fontWeight; const c = head.querySelector('button'); const cr = c.getBoundingClientRect(); o.close = `${Math.round(cr.width)}x${Math.round(cr.height)} r${Math.round(r.right - cr.right)} t${Math.round(cr.top - r.top)}`; }
    const seg = panel.querySelector('#note-picker-sources'); const sr = seg.getBoundingClientRect(); const ss = getComputedStyle(seg);
    o.seg = { cls: seg.className, w: Math.round(sr.width), h: Math.round(sr.height), radius: ss.borderTopLeftRadius, bg: ss.backgroundColor, btnH: Math.round(seg.querySelector('button').getBoundingClientRect().height), btnFont: getComputedStyle(seg.querySelector('button')).fontSize };
    const sf = panel.querySelector('.search-field'); const sfr = sf.getBoundingClientRect(); o.search = { h: Math.round(sfr.height), radius: getComputedStyle(sf).borderTopLeftRadius };
    const lis = [...panel.querySelectorAll('#note-picker-list > li')].filter((l) => !l.classList.contains('note-picker-empty'));
    o.rows = lis.length;
    if (lis[0]) {
      const li = lis[0]; const lab = li.querySelector('label') || li; const ls = getComputedStyle(lab); const lr = li.getBoundingClientRect();
      const box = li.querySelector('input[type="checkbox"]'); const br = box.getBoundingClientRect();
      const title = li.querySelector('.note-picker-text'); const tr = title.getBoundingClientRect(); const ts = getComputedStyle(title);
      const meta = li.querySelector('.note-picker-meta, .note-picker-caption'); const chip = li.querySelector('.chip');
      o.row = { h: Math.round(lr.height), pad: [ls.paddingTop, ls.paddingRight, ls.paddingBottom, ls.paddingLeft].join(' '), gap: ls.columnGap, radius: getComputedStyle(li).borderTopLeftRadius,
        box: `${Math.round(br.width)}x${Math.round(br.height)} x${Math.round(br.left - lr.left)} cy${Math.round((br.top + br.bottom) / 2 - (lr.top + lr.bottom) / 2)}`,
        title: ts.fontSize + '/' + ts.fontWeight, titleX: Math.round(tr.left - lr.left),
        meta: meta ? getComputedStyle(meta).fontSize + ' ' + getComputedStyle(meta).color : 'none', chip: chip ? `filled chip ${getComputedStyle(chip).backgroundColor}` : 'none', metaText: meta ? meta.textContent : '' };
      const all = lis.map((l) => Math.round(l.getBoundingClientRect().height)); o.rowHeights = [...new Set(all)];
    }
    const foot = panel.querySelector('.note-picker-foot'); const fr = foot.getBoundingClientRect();
    const btns = [...foot.querySelectorAll('button')].map((b) => ({ id: b.id, cls: b.className, h: Math.round(b.getBoundingClientRect().height), w: Math.round(b.getBoundingClientRect().width), right: Math.round(r.right - b.getBoundingClientRect().right) }));
    o.foot = { cls: foot.className, h: Math.round(fr.height), justify: getComputedStyle(foot).justifyContent, count: foot.querySelector('#note-picker-count').textContent, countFont: getComputedStyle(foot.querySelector('#note-picker-count')).fontSize, btns, gapAbove: Math.round(fr.top - panel.querySelector('#note-picker-list').getBoundingClientRect().bottom) };
    return o;
  });
  console.log(JSON.stringify(out, null, 1));
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  await browser.close();
})();
