// INBOX 651: the caret's line is washed in the documents editor and the note
// surfaces only while the line numbers show.
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers THEME=dark node activeline.js
const { boot } = require('./lib.js');
let failures = 0;
const check = (label, ok, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`); };

//: Runs in the page: the active line's computed background, and the body ink's contrast over it on the editor's ground.
function measure() {
  const cm = document.querySelector('.doc-editor .cm-editor');
  const act = cm && cm.querySelector('.cm-activeLine');
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (t, b) => t.slice(0, 3).map((v, i) => v * t[3] + b[i] * (1 - t[3])).concat(1);
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const ground = (el) => { const stack = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) stack.push(c); if (c[3] >= 0.999) break; } let acc = stack.length && stack[stack.length - 1][3] >= 0.999 ? stack.pop() : [255, 255, 255, 1]; while (stack.length) acc = over(stack.pop(), acc); return acc; };
  if (!act) return { present: false, numbers: !!(cm && cm.querySelector('.cm-lineNumbers')), count: cm ? cm.querySelectorAll('.cm-activeLine').length : -1 };
  const bg = getComputedStyle(act).backgroundColor;
  const g = ground(cm.querySelector('.cm-scroller') || cm);
  const wash = over(rgba(bg), g);
  return { present: true, numbers: !!cm.querySelector('.cm-lineNumbers'), bg, alpha: rgba(bg)[3], textOnWash: +ratio(rgba(getComputedStyle(act).color), wash).toFixed(2) };
}

(async () => {
  const { browser, page } = await boot({});
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(2500);
  const doc = await page.evaluate(async () => (await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Active line sweep', content: 'alpha\nbravo\ncharlie' }) })).id);
  await page.evaluate((d) => { switchTab('documents'); setTimeout(() => openDocument(d), 200); }, doc);
  await page.waitForTimeout(4000);
  await page.evaluate(() => { if (typeof setDocView === 'function') setDocView('live'); setDocGutter(true); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.doc-editor .cm-content')?.focus());
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);
  const on = await page.evaluate(measure);
  console.log(JSON.stringify(on));
  check('numbers on: .cm-activeLine present with a wash', on.present && on.numbers && on.alpha > 0.03 && on.alpha < 0.2, `bg ${on.bg}`);
  check('numbers on: body ink over the wash >= 4.5:1', on.textOnWash >= 4.5, String(on.textOnWash));
  await page.evaluate(() => setDocGutter(false));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('.doc-editor .cm-content')?.focus());
  const off = await page.evaluate(measure);
  console.log(JSON.stringify(off));
  check('numbers off: no .cm-activeLine at all', !off.present && !off.numbers && off.count === 0, JSON.stringify(off));
  await page.evaluate(async (d) => { await apiJson(`/documents/${d}`, { method: 'DELETE' }).catch(() => {}); setDocGutter(false); }, doc);
  check('no page errors', !errors.length, errors.join(' | '));
  console.log(`${failures ? 'FAILED' : 'PASSED'} activeline ${process.env.THEME || 'light'}`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
