// The reading workspace on a real scanned PDF: does scroll mode scroll, does
// the reading panel follow the page, and does a section take you to its page?
//
// INBOX 314, the owner, verbatim: "I could scroll through the pages and the ocr
// extracted text would scroll and if I clicked on a specific text setcion, it
// would go to that page scroll wise on the pdf. but now I can only view the
// extracted text on a single page and even when on scroll mode I cant scroll".
//
//   BASE=http://127.0.0.1:8800 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/ocrscroll.js /tmp/mm-ocr-work/scanned-report.pdf
//
// The PDF argument has to be a *scanned* one: pages rasterised, no text layer,
// so the only way to any words on it is an optical reader. There is one at
// /tmp/mm-ocr-work/scanned-report.pdf if scratchpad/ui-sweeps/make-scan.py has
// been run; any real scan does as well.
//
// Every line this prints is a measurement (a rect, a scrollTop, a count), not
// a screenshot: a picture of a scroll pane cannot say whether it scrolled.
const fs = require('fs');
const { boot } = require('./lib.js');

const PDF = process.argv[2] || '/tmp/mm-ocr-work/scanned-report.pdf';

(async () => {
  const { browser, page } = await boot();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });

  // library.js is a lazy bundle: `window.openOcrWorkspace` does not exist
  // until the Library tab has been opened once. A sweep that skips this gets
  // "openOcrWorkspace is not a function" and learns nothing about the reader.
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(2500);

  const b64 = fs.readFileSync(PDF).toString('base64');
  const up = await page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('file', new File([bytes], 'scanned-report.pdf', { type: 'application/pdf' }));
    fd.append('direct', 'true');
    const r = await fetch('/media/upload', {
      method: 'POST',
      body: fd,
      headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
    });
    return r.json();
  }, b64);
  console.log('UPLOAD', JSON.stringify({ id: up.id, url: up.url }));

  await page.evaluate((u) => window.openOcrWorkspace(
    { id: u.id, url: u.url, original_name: 'scanned-report.pdf' }, [], 0
  ), up);
  await page.waitForTimeout(4000);

  // 1. Is the control even reachable, and what does the workspace think the
  //    document is? `#ocr-view` ships hidden and is revealed only for a PDF
  //    with more than one page, so a page count that never arrived looks
  //    exactly like "scroll mode does not scroll".
  const opened = await page.evaluate(() => ({
    pages: window.ocrDebug ? window.ocrDebug().pages : null,
    viewHidden: document.getElementById('ocr-view').classList.contains('hidden'),
    pagerHidden: document.getElementById('ocr-pager').hidden,
    label: document.getElementById('ocr-page-label').textContent,
    railItems: document.querySelectorAll('#ocr-rail .ocr-rail-item').length,
    regionRows: document.querySelectorAll('#ocr-region-list .ocr-region').length,
    source: document.getElementById('ocr-source').textContent.trim(),
    message: document.getElementById('ocr-message').textContent.trim().slice(0, 80),
  }));
  console.log('OPENED', JSON.stringify(opened));

  // 2. Scroll mode: the segment the owner pressed.
  await page.click('#ocr-view button[data-ocr-view="scroll"]');
  await page.waitForTimeout(2500);
  const scrollState = await page.evaluate(() => {
    const pane = document.getElementById('ocr-page-pane');
    const scroll = document.getElementById('ocr-scroll');
    const stages = [...scroll.querySelectorAll('.ocr-stage')];
    return {
      scrollHidden: scroll.classList.contains('hidden'),
      stageHidden: document.getElementById('ocr-stage').classList.contains('hidden'),
      paneIsScroll: pane.classList.contains('is-scroll'),
      stages: stages.length,
      stageHeights: stages.slice(0, 3).map((s) => Math.round(s.getBoundingClientRect().height)),
      overflowY: getComputedStyle(pane).overflowY,
      // The measurement that decides it: a pane that cannot scroll has a
      // scrollHeight no larger than its clientHeight.
      scrollHeight: pane.scrollHeight,
      clientHeight: pane.clientHeight,
      canScroll: pane.scrollHeight > pane.clientHeight + 4,
      activeMode: [...document.querySelectorAll('#ocr-view button')]
        .filter((b) => b.classList.contains('active')).map((b) => b.dataset.ocrView),
    };
  });
  console.log('SCROLL MODE', JSON.stringify(scrollState));

  // 3. Scroll it the way a person does, and see whether the page on screen,
  //    the page label and the reading panel all follow.
  await page.evaluate(() => {
    const pane = document.getElementById('ocr-page-pane');
    pane.scrollTop = pane.scrollHeight * 0.45;
  });
  await page.waitForTimeout(2500);
  const afterScroll = await page.evaluate(() => {
    const pane = document.getElementById('ocr-page-pane');
    const rows = [...document.querySelectorAll('#ocr-region-list .ocr-region')];
    const list = document.getElementById('ocr-region-list');
    return {
      scrollTop: Math.round(pane.scrollTop),
      label: document.getElementById('ocr-page-label').textContent,
      rows: rows.length,
      rowPages: [...new Set(rows.map((r) => r.dataset.page))],
      current: rows.filter((r) => r.classList.contains('is-current-page')).length,
      listScrollTop: Math.round(list.scrollTop),
    };
  });
  console.log('AFTER SCROLL', JSON.stringify(afterScroll));

  // 4. Panel -> page: click a section that belongs to another page and watch
  //    the page pane move to it.
  const jump = await page.evaluate(async () => {
    const pane = document.getElementById('ocr-page-pane');
    const before = Math.round(pane.scrollTop);
    const label = document.getElementById('ocr-page-label').textContent;
    const rows = [...document.querySelectorAll('#ocr-region-list .ocr-region')];
    const mine = document.getElementById('ocr-page-label').textContent.match(/Page (\d+)/);
    const now = mine ? Number(mine[1]) - 1 : 0;
    const other = rows.find((r) => Number(r.dataset.page) !== now);
    if (!other) return { clicked: null, rows: rows.length, before, label };
    other.querySelector('.ocr-region-text').blur?.();
    other.click();
    await new Promise((r) => setTimeout(r, 2000));
    return {
      clicked: Number(other.dataset.page),
      before,
      after: Math.round(pane.scrollTop),
      labelBefore: label,
      labelAfter: document.getElementById('ocr-page-label').textContent,
    };
  });
  console.log('CLICK A SECTION', JSON.stringify(jump));

  // 5. The whole document, scrolled the way a person reads it: every page the
  //    reader has seen should be in the panel, and the panel should be
  //    following the page on screen rather than being replaced by it.
  const pageCount = await page.evaluate(() =>
    document.querySelectorAll('#ocr-scroll .ocr-stage').length);
  for (let i = 0; i < pageCount; i += 1) {
    await page.evaluate((n) => {
      const pane = document.getElementById('ocr-page-pane');
      const stage = document.querySelector(`#ocr-scroll .ocr-stage[data-page="${n}"]`);
      pane.scrollTop = stage.offsetTop - pane.offsetTop;
    }, i);
    await page.waitForTimeout(1400);
  }
  const wholeDoc = await page.evaluate(() => {
    const list = document.getElementById('ocr-region-list');
    const rows = [...list.querySelectorAll('.ocr-region')];
    return {
      rows: rows.length,
      rowPages: [...new Set(rows.map((r) => Number(r.dataset.page)))].sort((a, b) => a - b),
      current: rows.filter((r) => r.classList.contains('is-current-page')).length,
      label: document.getElementById('ocr-page-label').textContent,
      listScrollHeight: list.scrollHeight,
      listClientHeight: list.clientHeight,
      listScrollTop: Math.round(list.scrollTop),
    };
  });
  console.log('WHOLE DOCUMENT', JSON.stringify(wholeDoc));

  console.log('ERRORS', JSON.stringify(errs.slice(0, 6)));
  await page.screenshot({ path: (process.env.SCRATCH || '/tmp') + '/ocr-scroll.png' });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
