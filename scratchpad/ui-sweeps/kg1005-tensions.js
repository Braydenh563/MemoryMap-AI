// WORLD_CLASS_PLAN B4: the Tensions widget lists what the derived tensions
// table knows. Seeds two notes whose claims differ in a number, runs the
// night pass (no model: the local rule finds it), shows only the Tensions
// widget, and checks the row (both names, the reason, "Found without a
// model", four square icon buttons inside the card), then links the pair:
// the row goes, the widget says "All decided.", and the table has it accepted.
//
//   BASE=http://127.0.0.1:8853 WIDTH=1440 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg1005-tensions.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const s = Date.now().toString(36).slice(-5);
  const seeded = await page.evaluate(async (s) => {
    const make = (content) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
    const a = await make(`# Flat ${s}\n\nThe rent for the flat ${s} is 900 pounds a month.`);
    const b = await make(`# Flat later ${s}\n\nThe rent for the flat ${s} is 950 pounds a month.`);
    const run = await apiJson('/night/run', { method: 'POST', body: JSON.stringify({ budget: 20000, force: true }) });
    const known = await apiJson('/entries/tensions/known?limit=20');
    return { a: a.id, b: b.id, run, keys: known.tensions.map((t) => t.key) };
  }, s);
  await page.evaluate((s) => { window.__kgS = s; }, s);
  const key = [seeded.a, seeded.b].sort((x, y) => x - y).join(':');
  check('the night pass put the pair in the table', seeded.keys.includes(key), JSON.stringify(seeded.keys));
  await page.evaluate(async () => {
    prefsCache.dashboard_layout = { order: ['tensions'], hidden: Object.keys(DASH_WIDGETS).filter((n) => n !== 'tensions') };
    await switchTab('dashboard');
    await renderDashboard();
  });
  await page.waitForTimeout(2500);
  const row = await page.evaluate((key) => {
    const card = document.querySelector('[data-widget="tensions"]');
    if (!card) return null;
    const li = [...card.querySelectorAll('li.night-fact')].find((x) => x.textContent.includes(`Flat later ${window.__kgS}`));
    const cr = card.getBoundingClientRect();
    const buttons = li ? [...li.querySelectorAll('button')].map((b) => {
      const r = b.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), inside: r.right <= cr.right + 1 && r.left >= cr.left - 1, label: b.getAttribute('aria-label') };
    }) : [];
    return {
      text: li ? li.textContent : '',
      blurb: card.querySelector('p.muted')?.textContent || '',
      buttons,
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  }, key);
  console.log(JSON.stringify(row));
  check('the row names both notes', row && /Flat \w+ and Flat later/.test(row.text), row && row.text.slice(0, 80));
  check('the row says who found it', row && row.text.includes('Found without a model'));
  check('the blurb counts what is open', row && /disagreements? to look at/.test(row.blurb), row && row.blurb);
  check('four square buttons inside the card', row && row.buttons.length === 4 && row.buttons.every((b) => b.w === b.h && b.inside), row && JSON.stringify(row.buttons));
  check('no sideways scroll', row && !row.sideways);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/kg1005-tensions-${WIDTH}-${process.env.THEME || 'light'}.png` });
  await page.evaluate(() => {
    const card = document.querySelector('[data-widget="tensions"]');
    [...card.querySelectorAll('li.night-fact')].find((x) => x.textContent.includes(`Flat later ${window.__kgS}`))
      .querySelector('button[aria-label="Link the two notes as contradicting"]').click();
  });
  await page.waitForTimeout(1200);
  const after = await page.evaluate(async (key) => {
    const card = document.querySelector('[data-widget="tensions"]');
    const accepted = await apiJson('/entries/tensions/known?status=accepted&limit=50');
    return { rows: card.querySelectorAll('li.night-fact').length, text: card.textContent, accepted: accepted.tensions.map((t) => t.key).includes(key) };
  }, key);
  check('linking takes the row away', !after.text.includes(`Flat later ${s}`), JSON.stringify(after.rows));
  check('the table has it accepted', after.accepted);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
})();
