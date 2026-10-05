// BACKLOG section 13: a web result's snippet marks the words the search was
// for. Stubs /websearch (the sandbox has no engine), searches, and measures the
// real <mark> nodes: which words, that a snippet carrying markup stays text,
// that Show more rows are marked the same, the computed colours and contrast,
// and that the snippet's two-line clamp still holds.
//
//   BASE=http://127.0.0.1:8856 node scratchpad/ui-sweeps/bl1005-webhighlight.js
//   add THEME=dark and/or PHONE=1
const { boot } = require('./lib.js');
const phone = !!process.env.PHONE;
const RESULTS = Array.from({ length: 10 }, (_, i) => ({
  title: `Result ${i + 1} about SQLite`,
  url: `https://example${i}.org/a`,
  domain: `example${i}.org`,
  snippet:
    i === 0
      ? 'SQLite uses a write-ahead log (WAL) so readers never block the writer. <b>not markup</b> & <img src=x onerror=alert(1)>'
      : `Result ${i + 1}: the sqlite WAL mode explained for people who keep notes locally.`,
  via: ['example'],
}));
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };

(async () => {
  const { browser, page, OUT } = await boot(phone
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1440, height: 900 } });
  await page.route('**/websearch/searxng/status*', (r) => r.fulfill({ json: { backend: 'docker', installing: false, state: 'running', responding: true } }));
  await page.route(/\/websearch\?q=/, (r) => r.fulfill({ json: { results: RESULTS, provider: 'searxng', answered_by: { label: 'SearXNG', detail: 'your own instance' } } }));
  await page.evaluate(() => { prefsCache.web_search_enabled = true; localStorage.removeItem('webSearchHistory'); switchTab('chat'); toggleWebPanel(true); });
  await page.waitForTimeout(700);
  await page.fill('#web-query', 'what is the SQLite WAL mode');
  await page.press('#web-query', 'Enter');
  await page.waitForTimeout(700);

  const data = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#web-results .web-result-snippet')];
    const first = rows[0];
    const marks = (el) => [...el.querySelectorAll('mark')].map((m) => m.textContent.toLowerCase());
    const m0 = first.querySelector('mark');
    const cs = m0 ? getComputedStyle(m0) : null;
    const parse = (c) => { const n = (c.match(/[\d.]+/g) || []).map(Number); return c.startsWith('color(') ? n.map((v, i) => (i < 3 ? v * 255 : v)) : n; };
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    // The mark's own wash over the row's surface: composite the wash on the ground.
    let ground = null;
    for (let n = first; n && !ground; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length >= 3 && (c.length === 3 || c[3] > 0.9)) ground = c; }
    const wash = m0 ? parse(cs.backgroundColor) : null;
    const a = wash && wash.length === 4 ? wash[3] : 1;
    const bg = wash && ground ? [0, 1, 2].map((i) => wash[i] * a + ground[i] * (1 - a)) : null;
    const fg = m0 ? parse(cs.color) : null;
    const ratio = bg && fg ? (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05) : null;
    return {
      count: rows.length,
      firstMarks: marks(first),
      secondMarks: marks(rows[1]),
      injected: first.querySelectorAll('b, img').length,
      firstText: first.textContent.slice(0, 120),
      ratio, weight: cs && cs.fontWeight, wash: cs && cs.backgroundColor,
      clamp: getComputedStyle(first).webkitLineClamp,
      overflowY: first.scrollHeight > first.clientHeight + 1,
    };
  });
  check(data.count === 8, `8 rows shown (${data.count})`);
  check(['sqlite', 'wal'].every((w) => data.firstMarks.includes(w)), `first snippet marks sqlite and wal (it has no 'mode'): ${JSON.stringify(data.firstMarks)}`);
  check(!data.firstMarks.includes('what') && !data.firstMarks.includes('the') && !data.firstMarks.includes('is'), 'little words are not marked');
  check(data.injected === 0, 'markup in a snippet stays text (no <b> or <img> children)');
  check(/<b>not markup<\/b>/.test(data.firstText), `the markup is shown as text: ${data.firstText.slice(60, 120)}`);
  check(data.secondMarks.length >= 3, `second snippet marked too: ${JSON.stringify(data.secondMarks)}`);
  check(data.ratio === null || data.ratio >= 4.5, `mark text contrast ${data.ratio && data.ratio.toFixed(2)} (wash ${data.wash}, weight ${data.weight})`);
  check(data.clamp === '2', `snippet still clamps to two lines (${data.clamp})`);
  await page.screenshot({ path: `${OUT}/bl1005-webhighlight${phone ? '-390' : '-1440'}-${process.env.THEME || 'light'}.png` });

  // Show more rows carry the same marks.
  await page.click('.web-show-more');
  await page.waitForTimeout(300);
  const late = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#web-results .web-result-snippet')];
    return { n: rows.length, last: [...rows[rows.length - 1].querySelectorAll('mark')].map((m) => m.textContent.toLowerCase()) };
  });
  check(late.n === 10 && late.last.includes('sqlite'), `a Show more row is marked: ${JSON.stringify(late)}`);

  // A newer search with other words replaces the terms.
  await page.fill('#web-query', 'notes');
  await page.press('#web-query', 'Enter');
  await page.waitForTimeout(600);
  const next = await page.evaluate(() => [...document.querySelectorAll('#web-results .web-result-snippet')[1].querySelectorAll('mark')].map((m) => m.textContent.toLowerCase()));
  check(next.length === 1 && next[0] === 'notes', `the next search marks its own words: ${JSON.stringify(next)}`);

  await browser.close();
  console.log(failed ? `FAILED ${failed}` : 'ALL OK');
  process.exit(failed ? 1 : 0);
})();
