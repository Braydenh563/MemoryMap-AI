// Brief 94: the Settings search and the palette with the meaning layer, and
// the "Close in meaning" head (an embedding model faked by routing /read/near).
// BASE=... [THEME=dark] node meaning94ui.js 1440|390
const {boot} = require('./lib.js');
(async () => {
  const width = Number(process.argv[2] || 1440);
  const phone = width < 600;
  const {browser, page} = await boot({viewport: {width, height: phone ? 844 : 900}, ...(phone ? {hasTouch: true, isMobile: true} : {})});
  await page.route('**/read/near', (route) => route.fulfill({contentType: 'application/json', body: JSON.stringify({available: true, near: [{i: 3, score: 0.6}, {i: 40, score: 0.5}]})}));
  await page.evaluate(() => openSettingsModal());
  await page.waitForTimeout(1200);
  const box = await page.$('#settings-search');
  const ph = await page.evaluate(() => {
    const el = document.getElementById('settings-search');
    const cs = getComputedStyle(el);
    const c = document.createElement('canvas').getContext('2d');
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return {placeholder: el.placeholder, textW: Math.round(c.measureText(el.placeholder).width), room: Math.round(room), visible: el.getBoundingClientRect().width > 0};
  });
  if (ph.visible) {
    await box.fill('trash');
    await page.waitForTimeout(900);
  }
  const res = await page.evaluate(() => {
    const list = document.getElementById('settings-results');
    const r = list.getBoundingClientRect();
    const head = list.querySelector('.settings-result-head');
    const hs = head && getComputedStyle(head);
    return {
      rows: [...list.querySelectorAll('.settings-result-name')].map((n) => n.textContent).slice(0, 6),
      count: document.getElementById('settings-search-count').textContent,
      head: head ? {text: head.textContent, color: hs.color, size: hs.fontSize, left: Math.round(head.getBoundingClientRect().left - r.left)} : null,
      overflowX: list.scrollWidth > list.clientWidth + 1,
      listW: Math.round(r.width), right: Math.round(r.right), vw: innerWidth,
    };
  });
  const out = {width, theme: process.env.THEME || 'light', ph, res};
  await page.evaluate(() => closeSettingsModal());
  await page.waitForTimeout(300);
  await page.evaluate(() => (typeof openPalette === 'function' ? openPalette() : null));
  await page.waitForTimeout(800);
  await page.fill('#palette-input', 'keybord shortcuts');
  await page.waitForTimeout(900);
  out.palette = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#palette-list [role="option"]')];
    const heads = [...document.querySelectorAll('#palette-list [role="presentation"], #palette-list .rich-picker-group, #palette-list .rp-group')].map((h) => h.textContent.trim());
    return {right: Math.round(Math.max(...rows.map((r) => r.getBoundingClientRect().right))), vw: innerWidth, first: rows.slice(0, 4).map((r) => r.textContent.trim().slice(0, 50)), heads, n: rows.length};
  });
  console.log(JSON.stringify(out));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
