// INBOX 589: Quick access highlights. The first tile is highlighted by
// position, any tile can take a colour from the tile menu's Highlight sheet,
// and the label and hint keep 4.5:1 on every tint.
//
//   BASE=http://127.0.0.1:8793 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     WIDTH=1440 THEME=dark node quicktint.js
//
// Colours are measured, not looked at: each computed colour is drawn into a
// one-pixel canvas (which resolves oklab and color-mix to sRGB), translucent
// layers are composited over their ancestors, and WCAG contrast is computed.
const { boot } = require('./lib.js');

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`);
};

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const phone = width < 600;
  const { browser, page } = await boot({
    viewport: { width, height: phone ? 844 : 900 },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const put = (body) => page.evaluate(async (b) => { prefsCache = await apiJson('/preferences', { method: 'PUT', body: JSON.stringify(b) }); }, body);
  const go = async () => {
    await page.evaluate(async () => { quickEditing = false; await switchTab('dashboard'); await renderDashboard(); });
    await page.waitForTimeout(700);
  };
  // Per tile: index, tint, background (sRGB), label and hint contrast.
  const measure = () => page.evaluate(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; const a = parseFloat((c.match(/\/\s*([\d.]+)\)|,\s*([\d.]+)\)$/) || [])[1] || (c.match(/,\s*([\d.]+)\)$/) || [])[1] || '1'); return [d[0], d[1], d[2], c.startsWith('rgba') || c.includes('/') ? a : 1]; };
    const over = (top, bottom) => top.slice(0, 3).map((v, i) => v * top[3] + bottom[i] * (1 - top[3])).concat(1);
    const ground = (el) => {
      const stack = [];
      for (let n = el; n; n = n.parentElement) {
        const c = rgba(getComputedStyle(n).backgroundColor);
        if (c[3] > 0) stack.push(c);
        if (c[3] >= 1) break;
      }
      let acc = stack.length && stack[stack.length - 1][3] >= 1 ? stack.pop() : [255, 255, 255, 1];
      if (document.documentElement.dataset.theme === 'dark' && !stack.length && acc[0] === 255) acc = [20, 20, 24, 1];
      while (stack.length) acc = over(stack.pop(), acc);
      return acc;
    };
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    return [...document.querySelectorAll('#dash-quicklinks .quick-link:not(.quick-edit-add)')].map((tile, i) => {
      const bg = ground(tile);
      const ink = (sel) => over(rgba(getComputedStyle(tile.querySelector(sel)).color), bg);
      return {
        i,
        tint: tile.dataset.tint || '',
        tinted: tile.classList.contains('quick-link-tinted'),
        bg: bg.slice(0, 3).map(Math.round).join(','),
        label: +ratio(ink('.quick-link-label'), bg).toFixed(2),
        hint: +ratio(ink('.quick-link-hint'), bg).toFixed(2),
        icon: +ratio(ink('.quick-link-icon'), bg).toFixed(2),
      };
    });
  });

  // 1. Default: exactly one highlight, at position 0, whatever is first.
  await put({ dashboard_quick_access: [], dashboard_quick_tints: {} });
  await go();
  let tiles = await measure();
  const plainBg = tiles[1].bg;
  check('default: one highlighted tile, position 0', tiles.filter((t) => t.tinted).length === 1 && tiles[0].tinted && tiles[0].tint === 'accent', JSON.stringify(tiles.map((t) => t.tint)));
  check('default: first tile fill differs from a plain tile', tiles[0].bg !== plainBg, `${tiles[0].bg} vs ${plainBg}`);
  check('default: label and hint >= 4.5 on the highlight', tiles[0].label >= 4.5 && tiles[0].hint >= 4.5, `label ${tiles[0].label} hint ${tiles[0].hint} icon ${tiles[0].icon}`);
  check('plain tile: label and hint >= 4.5', tiles[1].label >= 4.5 && tiles[1].hint >= 4.5, `label ${tiles[1].label} hint ${tiles[1].hint}`);

  await put({ dashboard_quick_access: ['sketch', 'new-note', 'ask-ai'] });
  await go();
  tiles = await measure();
  check('reordered: the new first tile carries it, New note does not', tiles[0].tinted && !tiles[1].tinted, JSON.stringify(tiles.map((t) => t.tint)));
  await put({ dashboard_quick_access: [] });

  // 2. Every tint on the second tile: fill moves, text holds 4.5, icon holds 3.
  const keys = ['accent', 'red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'magenta', 'pink'];
  let worstHint = 99, worstLabel = 99, worstIcon = 99, sameFill = [];
  for (const key of keys) {
    await put({ dashboard_quick_tints: { 'ask-ai': key } });
    await go();
    const t = (await measure())[1];
    if (t.bg === plainBg || t.tint !== key) sameFill.push(key);
    worstHint = Math.min(worstHint, t.hint);
    worstLabel = Math.min(worstLabel, t.label);
    worstIcon = Math.min(worstIcon, t.icon);
  }
  check('each tint changes the computed fill', !sameFill.length, sameFill.join(','));
  check('worst label across 13 tints >= 4.5', worstLabel >= 4.5, String(worstLabel));
  check('worst hint across 13 tints >= 4.5', worstHint >= 4.5, String(worstHint));
  check('worst icon across 13 tints >= 3', worstIcon >= 3, String(worstIcon));

  // 3. "none" turns the first tile's default off; nothing is highlighted.
  await put({ dashboard_quick_tints: { 'new-note': 'none' } });
  await go();
  tiles = await measure();
  check('first tile set to none: no highlight anywhere', tiles.every((t) => !t.tinted), JSON.stringify(tiles.map((t) => t.tint)));

  // 4. The real path: arrange, the tile menu's Highlight, a swatch.
  await put({ dashboard_quick_tints: {} });
  await go();
  await page.evaluate(async () => { quickEditing = true; await renderQuickLinks(); });
  await page.waitForTimeout(800);
  const opener = page.locator('.quick-edit-tile[data-id="remind-me"] .menu-wrap > button').first();
  await opener.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await opener.click();
  await page.waitForTimeout(300);
  await page.locator('.menu-item:visible', { hasText: 'Highlight' }).first().click({ timeout: 4000 });
  await page.waitForTimeout(800);
  const sheet = await page.evaluate(() => {
    const picker = document.querySelector('.quick-tint-card .swatch-picker');
    if (!picker) return null;
    const r = picker.getBoundingClientRect();
    const card = picker.closest('.quick-tint-card').getBoundingClientRect();
    const rows = new Set([...picker.querySelectorAll('.swatch-option:not(.swatch-auto)')].map((b) => Math.round(b.getBoundingClientRect().top)));
    return {
      swatches: picker.querySelectorAll('[role="radio"]').length,
      checked: picker.querySelector('[aria-checked="true"]')?.getAttribute('aria-label'),
      names: [...picker.querySelectorAll('[role="radio"]')].map((b) => b.getAttribute('aria-label')),
      overflow: picker.scrollWidth - picker.clientWidth,
      inside: r.right <= card.right + 0.5 && r.left >= card.left - 0.5,
      rows: [...rows].length,
      preview: !!document.querySelector('.quick-tint-preview .quick-link'),
    };
  });
  check('sheet opens with 14 choices (accent, 12 hues, none)', sheet && sheet.swatches === 14, JSON.stringify(sheet && sheet.names));
  check('sheet: current choice checked (No highlight for a plain tile)', sheet && sheet.checked === 'No highlight', sheet && sheet.checked);
  check('sheet: picker fits its card', sheet && sheet.overflow <= 0 && sheet.inside, JSON.stringify(sheet && { o: sheet.overflow, inside: sheet.inside, rows: sheet.rows }));
  check('sheet: preview is the tile', sheet && sheet.preview);
  await page.locator('.quick-tint-card [role="radio"][aria-label="Teal"]').click();
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    stored: prefsCache.dashboard_quick_tints,
    tile: document.querySelector('.quick-edit-tile[data-id="remind-me"] .quick-link')?.dataset.tint,
  }));
  check('picking Teal stores it and repaints the tile', after.stored['remind-me'] === 'teal' && after.tile === 'teal', JSON.stringify(after));

  await put({ dashboard_quick_access: [], dashboard_quick_tints: {} });
  check('no page errors', !errors.length, errors.join(' | '));
  console.log(`${failures ? 'FAILED' : 'PASSED'} quicktint ${width} ${process.env.THEME || 'light'}`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
