// WORLD_CLASS_PLAN section 17 row 6: Explain this note. A note with a link and
// a reason; its menu holds "Explain this note"; choosing it speaks the note's
// words and then the link and its reason (speech is captured, not played), and
// a Stop toast appears; choosing it again while speaking stops it.
//
//   BASE=http://127.0.0.1:8841 WIDTH=390 THEME=dark \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/explainnote.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Speech is captured, not played: headless Chromium has no voices.
  await page.evaluate(() => {
    window.__spoken = [];
    window.__cancelled = 0;
    let speaking = false;
    const synth = {
      get speaking() { return speaking; },
      speak(u) { window.__spoken.push(u.text); speaking = true; },
      cancel() { window.__cancelled += 1; speaking = false; },
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; this.addEventListener = () => {}; };
  });
  const s = Date.now().toString(36).slice(-5);
  const ids = await page.evaluate(async (s) => {
    const make = async (content) => (await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) })).id;
    const a = await make(`# Sourdough starter ${s}\n\nFeed it twice a day with equal flour and water.`);
    const b = await make(`# Oven temperatures ${s}\n\nHot first, then drop it.`);
    await apiJson(`/entries/${a}/links`, { method: 'POST', body: JSON.stringify({ target_id: b, reason: 'the bread needs a hot oven' }) });
    await loadEntries();
    await switchTab('notes');
    return { a, b };
  }, s);
  await page.waitForTimeout(1500);
  const opener = await page.evaluate((id) => {
    const li = document.querySelector(`#entry-list li[data-id="${id}"]`);
    if (!li) return null;
    const btn = li.querySelector('button[aria-haspopup="menu"].icon-only, .note-menu-btn, .entry-menu-btn');
    if (!btn) return { li: true, btn: false, buttons: [...li.querySelectorAll('button')].map((b) => b.className + '|' + (b.getAttribute('aria-label') || '')).slice(0, 12) };
    btn.setAttribute('data-sweep-opener', '1');
    return { li: true, btn: true };
  }, ids.a);
  console.log(JSON.stringify(opener));
  check('the note card has its menu button', opener && opener.btn);
  await page.click('[data-sweep-opener="1"]');
  await page.waitForTimeout(500);
  const item = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[role="menuitem"], .action-menu button, .kebab-menu button')]
      .find((b) => /Explain this note/.test(b.textContent));
    if (!el) return null;
    el.setAttribute('data-sweep-explain', '1');
    return { title: el.title, text: el.textContent.trim() };
  });
  console.log(JSON.stringify(item));
  check('the menu has Explain this note', !!item && item.text === 'Explain this note');
  await page.evaluate(() => document.querySelector('[data-sweep-explain="1"]').click());
  await page.waitForTimeout(1200);
  const spoken = await page.evaluate(() => window.__spoken);
  console.log(JSON.stringify(spoken));
  const said = spoken[0] || '';
  check('it speaks the note first', said.startsWith('Sourdough starter'), said.slice(0, 40));
  check('then the link with its reason', /Oven temperatures .*, because the bread needs a hot oven/.test(said), said.slice(-120));
  const toastStop = await page.evaluate(() => [...document.querySelectorAll('.toast .toast-action')].some((b) => b.textContent === 'Stop'));
  check('a Stop button shows while it reads', toastStop);
  // Pressing it again stops.
  await page.evaluate((id) => explainNoteAloud({ id }), ids.a);
  await page.waitForTimeout(300);
  const cancelled = await page.evaluate(() => window.__cancelled);
  check('asking again while it speaks stops it', cancelled >= 1, `cancelled ${cancelled}`);
  const sideways = await page.evaluate(() => document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth);
  check('nothing scrolls sideways', !sideways);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
})();
