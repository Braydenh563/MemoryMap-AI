// INBOX 889: "the ocr workspace is poorly designed for phone. on the files
// library subtab, when opening the extracted text dropdown there is text
// overlay causing horizontal scroll".
//
//   BASE=http://127.0.0.1:8951 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/ocrphone.js        (VW=360 for a narrower phone)
//
// Part A, the Library's Images and Files cards: the "Text" disclosure opened
// on a card whose reading holds a long unbroken word (a URL, a serial number,
// a table run together, as OCR makes) and two lines; the page's scrollWidth
// against clientWidth, and every element in the card that pokes past the
// viewport. Part B, the workspace itself at 390: the page, each pane, the
// controls under 44px, and whether the columns are stacked.
const { boot } = require('./lib.js');
const VW = Number(process.env.VW || 390);
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const LONG = 'https://example.com/a/very/long/path/with/no/spaces/at/all/INV-2026-000123456789-ABCDEFGHIJKLMNOP-QRSTUVWXYZ0123456789';
const TEXT = `Invoice ${LONG}\nTotal due 1,234.56 EUR | account 12345678901234567890123456789012345678901234567890\nSecond line of the reading.`;
(async () => {
  const fails = [];
  const check = (label, ok, detail) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`); if (!ok) fails.push(label); };
  const { browser, page } = await boot({ viewport: { width: VW, height: 844 }, hasTouch: true, isMobile: true, scale: 3, userAgent: UA });
  await page.evaluate(() => switchTab('library'));
  await page.waitForFunction(() => typeof openOcrWorkspace === 'function', null, { timeout: 20000 });
  const scan = await page.context().newPage();
  await scan.setViewportSize({ width: 900, height: 400 });
  await scan.setContent('<body style="font:28px serif;padding:30px;background:#fff"><h1>Lecture 4: memory</h1><p>Spaced repetition beats cramming for long term recall.</p></body>');
  const png = (await scan.screenshot({ type: 'png' })).toString('base64');
  const pdf = (await scan.pdf({ format: 'A4' })).toString('base64');
  await scan.close();
  const upload = (b64, name, type) => page.evaluate(async ([b64, text, name, type]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('file', new File([bytes], `${Date.now()}-${name}`, { type }));
    const headers = { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() };
    if (type === 'application/pdf') {
      // A document is a note's attachment (the Files tab lists those).
      const entry = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'A note with a file', category: 'General' }) });
      const res = await fetch(`/entries/${entry.id}/files`, { method: 'POST', body: fd, headers });
      const saved = await res.json();
      const att = (saved.attachments || saved.files || []).slice(-1)[0];
      await apiJson(`/files/${att.id}/analyse`, { method: 'POST', body: JSON.stringify({ kind: 'ocr', text }) });
      return { id: att.id, attachment: true };
    }
    fd.append('direct', 'true');
    const res = await fetch('/media/upload', { method: 'POST', body: fd, headers });
    const m = await res.json();
    await apiJson(`/media/${m.id}/vision-ocr`, { method: 'POST', body: JSON.stringify({ text }) });
    await apiJson(`/media/${m.id}/ocr`, { method: 'POST', body: JSON.stringify({ text }) });
    return m;
  }, [b64, TEXT, name, type]);
  const media = await upload(png, 'ocrphone.png', 'image/png');
  const doc = await upload(pdf, 'ocrphone.pdf', 'application/pdf');
  console.log('uploaded', JSON.stringify(media).slice(0, 80), JSON.stringify(doc));

  // --- Part A: the Library card ----------------------------------------------
  for (const kind of ['images', 'files']) {
    await page.evaluate(() => switchTab('library'));
    await page.waitForTimeout(500);
    await page.click(`[data-target="library-view-media"][data-media-kind="${kind}"]`);
    await page.waitForTimeout(1500);
    await page.evaluate(() => { for (const d of document.querySelectorAll('details.library-image-reading')) d.open = true; });
    await page.waitForTimeout(500);
    const r = await page.evaluate((vw) => {
      const doc = document.documentElement;
      const out = [];
      for (const el of document.querySelectorAll('#library-view-media *')) {
        const b = el.getBoundingClientRect();
        if (b.width && b.right > vw + 1 && getComputedStyle(el).position !== 'fixed') out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 2).join('.')} right=${Math.round(b.right)}`);
      }
      const details = [...document.querySelectorAll('details.library-image-reading[open]')].length;
      const scroller = document.querySelector('#library-view-media');
      return { sw: doc.scrollWidth, cw: doc.clientWidth, bodySw: document.body.scrollWidth, details, offenders: out.slice(0, 8), n: out.length, viewSw: scroller ? scroller.scrollWidth : 0, viewCw: scroller ? scroller.clientWidth : 0 };
    }, VW);
    check(`${kind}: page does not scroll sideways`, r.sw <= r.cw && r.bodySw <= r.cw, `scrollWidth ${r.sw} vs ${r.cw}, view ${r.viewSw} vs ${r.viewCw}, ${r.details} fold(s) open, ${r.n} past the edge ${JSON.stringify(r.offenders)}`);
  }

  // --- Part B: the workspace ---------------------------------------------------
  await page.evaluate(async (url) => {
    const row = await apiJson('/media/meta/' + encodeURIComponent(url.split('/').pop()));
    openOcrWorkspace({ ...row, _isImage: true }, [{ ...row, _isImage: true }]);
  }, media.url);
  await page.waitForFunction(() => { const w = document.getElementById('ocr-workspace'); const img = w && w.querySelector('img'); return w && !w.classList.contains('hidden') && img && img.complete && img.naturalWidth > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const ws = await page.evaluate((vw) => {
    const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight }; };
    const doc = document.documentElement;
    const card = document.querySelector('.ocr-card');
    const panes = document.querySelector('.ocr-panes');
    const page = document.getElementById('ocr-page-pane');
    const regions = document.querySelector('.ocr-regions');
    const small = [...document.querySelectorAll('#ocr-workspace button, #ocr-workspace summary, #ocr-workspace select, #ocr-workspace input:not([type=checkbox]), #ocr-workspace textarea')]
      .filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.height && getComputedStyle(e).visibility !== 'hidden' && (b.height < 43.5 || b.width < 43.5); })
      .map((e) => `${e.id || e.className.toString().split(' ')[0] || e.tagName}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
    const past = [...document.querySelectorAll('#ocr-workspace *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > vw + 1 && getComputedStyle(e).position !== 'fixed'; }).map((e) => `${e.id || String(e.className).split(' ')[0] || e.tagName} right=${Math.round(e.getBoundingClientRect().right)}`);
    const dock = document.getElementById('ocr-dock');
    return { sw: doc.scrollWidth, cw: doc.clientWidth, card: r(card), panes: r(panes), pagePane: r(page), regions: r(regions), rail: r(document.querySelector('.ocr-rail-column')), dock: r(dock),
      stacked: page && regions ? regions.getBoundingClientRect().top >= page.getBoundingClientRect().bottom - 2 : null,
      small: small.slice(0, 14), nSmall: small.length, past: past.slice(0, 8), nPast: past.length,
      columns: getComputedStyle(panes).gridTemplateColumns, dockFold: dock ? [...dock.querySelectorAll('.dock-more')].length : 0 };
  }, VW);
  console.log('workspace', JSON.stringify(ws));
  check('workspace: page does not scroll sideways', ws.sw <= ws.cw, `${ws.sw} vs ${ws.cw}`);
  check('workspace: card fits', ws.card && ws.card.sw <= ws.card.cw + 1, `card ${ws.card && ws.card.sw}/${ws.card && ws.card.cw}`);
  check('workspace: panes fit', ws.panes && ws.panes.sw <= ws.panes.cw + 1 && ws.pagePane.sw <= ws.pagePane.cw + 1 && ws.regions.sw <= ws.regions.cw + 1, `panes ${ws.panes.sw}/${ws.panes.cw}, page ${ws.pagePane.sw}/${ws.pagePane.cw}, text ${ws.regions.sw}/${ws.regions.cw}`);
  check('workspace: columns stacked', ws.stacked === true, `columns ${ws.columns}, text pane at y=${ws.regions && ws.regions.y} under the page pane`);
  check('workspace: nothing past the right edge', ws.nPast === 0, `${ws.nPast} ${JSON.stringify(ws.past)}`);
  check('workspace: every control is 44px', ws.nSmall === 0, `${ws.nSmall} under 44px: ${JSON.stringify(ws.small)}`);
  // the text pane with the long reading
  await page.evaluate(() => document.querySelector('.ocr-regions')?.scrollIntoView());
  const text = await page.evaluate(() => {
    const e = [...document.querySelectorAll('.ocr-regions *, #ocr-edit-box')].filter((n) => !n.closest('.visually-hidden') && !n.classList.contains('visually-hidden')).find((n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).display !== 'none' && n.clientWidth);
    return e ? `${e.id || e.className}: ${e.scrollWidth} > ${e.clientWidth}` : null;
  });
  const chip = await page.evaluate(() => { const c = document.getElementById('ocr-source'); return c && !c.hidden ? { sh: c.scrollHeight, ch: c.clientHeight } : null; });
  check('workspace: the source chip is one line inside its box', !chip || chip.sh <= chip.ch, chip ? `${chip.sh} in ${chip.ch}` : 'not shown');
  check('workspace: the text wraps', text === null, String(text));
  await browser.close();
  console.log(fails.length ? `FAILED ${fails.length}` : 'all passed');
  process.exit(fails.length ? 1 : 0);
})();
