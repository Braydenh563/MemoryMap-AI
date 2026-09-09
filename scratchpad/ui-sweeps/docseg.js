// The Documents Edit / Read segment: does the label fit inside its control?
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const made = await page.evaluate(async () => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    const r = await fetch('/documents', { method: 'POST', headers: h,
      body: JSON.stringify({ title: 'Markdown test rendering', content: '# Heading\n\nSome body text.' }) });
    return r.status + ' ' + (await r.text()).slice(0, 120);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const route = await page.evaluate(() => {
    const hit = (sel) => { const e = document.querySelector(sel); if (e) { e.click(); return sel; } return null; };
    const tab = hit('[data-tab="library"]') || hit('[data-tab="documents"]');
    return tab;
  });
  await page.waitForTimeout(1500);
  const sub = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, a')].find((b) => /^documents$/i.test((b.textContent || '').trim()));
    if (el) { el.click(); return el.className; }
    return 'no documents sub-tab';
  });
  await page.waitForTimeout(2500);
  console.log('route:', route, '| sub:', sub);
  const opened = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('#tab-documents button, #tab-documents li, #tab-documents [data-id]')]
      .filter((el) => /Markdown test/.test(el.textContent || ''));
    if (candidates.length) { candidates[0].click(); return 'clicked ' + candidates[0].tagName + '.' + candidates[0].className; }
    return 'no row; tab hidden=' + document.getElementById('tab-documents')?.classList.contains('hidden');
  });
  await page.waitForTimeout(2500);
  console.log('open:', opened);
  console.log('seed:', made);
  const r = await page.evaluate(() => {
    const seg = document.getElementById('doc-view-seg');
    if (!seg) return { missing: true };
    const segBox = seg.getBoundingClientRect();
    const rows = [...seg.querySelectorAll('button')].map((b) => {
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      return {
        text: b.textContent.trim(),
        h: +r.height.toFixed(1),
        top: +(r.top - segBox.top).toFixed(1),
        bottom: +(segBox.bottom - r.bottom).toFixed(1),
        lineHeight: cs.lineHeight,
        paddingBlock: cs.paddingBlock || `${cs.paddingTop} ${cs.paddingBottom}`,
        overflowsBottom: r.bottom > segBox.bottom + 0.5,
      };
    });
    return {
      segH: +segBox.height.toFixed(1),
      segPad: getComputedStyle(seg).padding,
      visible: segBox.height > 0,
      rows,
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
