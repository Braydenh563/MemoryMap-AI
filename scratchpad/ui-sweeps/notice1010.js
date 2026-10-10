// INBOX 767: the no-model notice on Chat, Ask, the writing desk and the palette: height, line count, rows its
// children occupy, X position, muted-text contrast.  BASE=... W=390 THEME=dark node notice1010.js
const {boot, OUT} = require('./lib.js');
(async () => {
  const w = +(process.env.W || 1440);
  const {browser, page} = await boot({viewport: {width: w, height: 900}, ...(w < 600 ? {isMobile: true, hasTouch: true} : {})});
  await page.evaluate(() => { try { sessionStorage.removeItem('aiOfflineDismissed'); } catch (e) {} });
  const go = async (tab, sec) => {
    await page.evaluate(([t, s]) => { switchTab(t); if (s) { const strip = document.getElementById(t + '-subtabs'); const b = strip && [...strip.querySelectorAll('button')].find(x => x.dataset.section === s); if (b) b.click(); } }, [tab, sec]);
    await page.waitForTimeout(900);
  };
  const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const measure = async (id) => page.evaluate(([id]) => {
    const el = document.getElementById(id);
    if (!el) return {id, missing: true};
    const r = el.getBoundingClientRect();
    const kids = [...el.children].map(k => { const q = k.getBoundingClientRect(); return {tag: k.tagName, cls: k.className, top: Math.round(q.top), h: Math.round(q.height), left: Math.round(q.left), w: Math.round(q.width)}; });
    const mids = kids.map(k => k.top + k.h / 2).sort((a, b) => a - b); let rows = mids.length ? 1 : 0; for (let i = 1; i < mids.length; i++) if (mids[i] - mids[i - 1] > 12) rows++;
    const span = el.querySelector('span.muted, span:not(.ph)');
    const lh = span ? parseFloat(getComputedStyle(span).lineHeight) || parseFloat(getComputedStyle(span).fontSize) * 1.4 : 0;
    const sr = span ? span.getBoundingClientRect() : {height: 0};
    // an ancestor background for contrast
    const layers = []; for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor.match(/[\d.]+/g).map(Number); if ((c[3] ?? 1) > 0) { layers.push(c); if ((c[3] ?? 1) >= 1) break; } } let rgb = [255, 255, 255]; for (const c of layers.reverse()) { const a = c[3] ?? 1; rgb = [0, 1, 2].map(i => c[i] * a + rgb[i] * (1 - a)); } const bg = `rgb(${rgb.join(',')})`;
    return {id, visible: el.offsetParent !== null && !el.classList.contains('hidden'), height: Math.round(r.height * 10) / 10, width: Math.round(r.width), textLines: lh ? Math.round(sr.height / lh * 10) / 10 : null, rows, kids: kids.map(k => `${k.tag}.${k.cls.split(' ')[0]}@${k.left},${k.top}`), color: span ? getComputedStyle(span).color : null, bg, text: span && span.textContent};
  }, [id]);
  const out = [];
  await go('chat'); out.push(await measure('chat-offline'));
  await go('notes', 'ask'); out.push(await measure('ask-offline'));
  await go('notes', 'writing-room'); out.push(await measure('draft-offline'));
  await page.evaluate(() => { const o = document.getElementById('command-palette-overlay'); if (o.classList.contains('hidden')) toggleAgentPalette(); }); await page.waitForTimeout(600); out.push(await measure('command-palette-offline'));
  for (const o of out) {
    if (o.color) { const a = lum(o.color), b = lum(o.bg); o.contrast = Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100; }
    console.log(JSON.stringify(o));
  }
  const tag = `${process.env.TAG || 'x'}-${process.env.THEME || 'light'}-${w}`;
  await page.screenshot({path: `${OUT}/notice-${tag}-palette.png`});
  await go('chat'); const e = await page.$('#chat-offline'); if (e) await e.screenshot({path: `${OUT}/notice-${tag}-chat.png`});
  await browser.close();
})();
