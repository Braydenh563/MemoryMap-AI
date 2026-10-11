// INBOX 853: the OCR workspace's find marks every match in the extracted text,
// the current one stronger and in view, and counts occurrences ("1 of 4").
//
//   BASE=http://127.0.0.1:8878 W=1440 THEME=light node scratchpad/ui-sweeps/ocrfind853.js
// Needs an image whose reading holds a word more than once (the sweep seeds one
// by POSTing text to /media/<id>/ocr; Tesseract is not required).
const { boot } = require('./lib.js');

(async () => {
  const w = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: w, height: w < 600 ? 844 : 900 } });
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-media-kind="images"]');
  await page.waitForTimeout(1500);
  const name = process.env.IMG || 'kickoff-notes.png';
  const opened = await page.evaluate((n) => {
    const row = libraryImagesCache.find((i) => i.original_name === n);
    if (!row) return false;
    openOcrWorkspace(row, libraryImagesCache.filter((i) => i._isImage));
    return true;
  }, name);
  console.log('opened', opened);
  await page.waitForSelector('#ocr-region-list .ocr-region', { timeout: 10000 });
  await page.waitForTimeout(600);
  const word = process.env.WORD || 'search';
  await page.fill('#ocr-find', word);
  await page.waitForTimeout(400);
  const read = () => page.evaluate(() => {
    const marks = [...document.querySelectorAll('#ocr-region-list mark.global-find-hit')];
    const cur = marks.filter((m) => m.classList.contains('global-find-current'));
    const list = document.getElementById('ocr-region-list');
    const css = (m) => { const c = getComputedStyle(m); return [c.backgroundColor, c.color]; };
    let inView = null;
    if (cur[0]) {
      const r = cur[0].getBoundingClientRect();
      let box = cur[0].parentElement;
      while (box && !(box.scrollHeight > box.clientHeight && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
      const f = (box || list).getBoundingClientRect();
      inView = r.top >= f.top - 1 && r.bottom <= f.bottom + 1;
    }
    return {
      count: document.getElementById('ocr-find-count').textContent,
      marks: marks.length, current: cur.length,
      plain: marks[0] && css(marks[0]), strong: cur[0] && css(cur[0]),
      inView, rowsShown: [...document.querySelectorAll('#ocr-region-list .ocr-region')].filter((r) => !r.classList.contains('hidden')).length,
      btns: ['ocr-find-prev', 'ocr-find-next'].map((id) => { const b = document.getElementById(id); return !b.classList.contains('hidden') && !b.disabled; }),
    };
  });
  console.log('typed', JSON.stringify(await read()));
  await page.press('#ocr-find', 'Enter');
  await page.waitForTimeout(200);
  console.log('enter', JSON.stringify(await read()));
  await page.press('#ocr-find', 'Shift+Enter');
  await page.press('#ocr-find', 'Shift+Enter');
  await page.waitForTimeout(200);
  console.log('shift-enter x2', JSON.stringify(await read()));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  await page.fill('#ocr-find', '');
  await page.waitForTimeout(300);
  console.log('cleared', JSON.stringify(await read()));
  await browser.close();
})();
