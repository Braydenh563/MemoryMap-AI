// INBOX 437 (4): the consistency pass on Timeline, Reminders, Chat (with its
// side panels), Dashboard, Graph's chrome and Settings' Background tasks and
// Data. Screenshots plus the numbers DESIGN.md names: control heights (32px,
// --control-h-body 36px), the 48px top bar, h1 24px, badges that are not
// `.chip.item-label`, spinners that are not `.spinner`, and controls in one
// row at different heights.
//
//   SEED=1 BASE=http://127.0.0.1:8810 node consist437.js     (once per data dir)
//   BASE=... W=1440 THEME=dark SHOTS=before node consist437.js
//   ONLY=chat,graph limits the surfaces.
const { boot } = require('./lib.js');
const fs = require('fs');
const W = +(process.env.W || 1440), H = +(process.env.H || (W < 600 ? 844 : 900));
const OUTDIR = process.env.SHOTDIR || __dirname + '/out';
fs.mkdirSync(OUTDIR, { recursive: true });

function measure(page, label, rootSel) {
  return page.evaluate(([label, rootSel]) => {
    const root = document.querySelector(rootSel);
    if (!root) return { label, missing: rootSel };
    const vw = innerWidth, vh = innerHeight;
    const vis = (e) => { if (!e.checkVisibility || !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw; };
    const name = (e) => e.id ? '#' + e.id : (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : ''));
    const out = { label, issues: [] };
    const hs = {};
    for (const e of root.querySelectorAll('button, select, input[type=text], input[type=search], input[type=number], input:not([type]), summary.ghost, summary.small')) {
      if (!vis(e) || e.closest('#nm-buddy')) continue;
      const h = Math.round(e.getBoundingClientRect().height);
      (hs[h] = hs[h] || []).push(name(e) + (e.textContent.trim() ? '"' + e.textContent.trim().slice(0, 14) + '"' : ''));
    }
    out.controls = Object.fromEntries(Object.entries(hs).map(([h, l]) => [h, l.length + ' ' + l.slice(0, 5).join(' ')]));
    const seen = new Set();
    for (const e of root.querySelectorAll('button, select, input')) {
      if (!vis(e)) continue; const p = e.parentElement; if (!p || seen.has(p)) continue; seen.add(p);
      const cs = getComputedStyle(p); if (!cs.display.includes('flex') || cs.flexDirection.startsWith('column')) continue;
      const kids = [...p.children].filter((k) => vis(k) && k.matches('button, select, input:not([type=checkbox]):not([type=radio]):not([type=range]), .seg, summary'));
      if (kids.length < 2) continue;
      const hh = kids.map((k) => Math.round(k.getBoundingClientRect().height));
      if (Math.max(...hh) - Math.min(...hh) > 2) out.issues.push(`mixed heights in ${name(p)}: ${kids.map((k, i) => name(k) + '=' + hh[i]).join(', ')}`);
    }
    for (const e of root.querySelectorAll('span, small, em, b, div, a, time')) {
      if (!vis(e) || e.children.length > 1) continue; const t = e.textContent.trim(); if (!t || t.length > 22) continue;
      const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
      const pill = parseFloat(cs.borderTopLeftRadius) >= 4 && r.height < 26 && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0) && cs.display !== 'block';
      if (pill && !e.matches('.chip, .chip *, .kbd, kbd, .spinner, [role=tab], .seg *, .ph')) out.issues.push(`pill not .chip: ${name(e)} "${t}" ${cs.fontSize} r${cs.borderTopLeftRadius}`);
    }
    for (const e of root.querySelectorAll('*')) {
      if (!vis(e)) continue; const a = getComputedStyle(e).animationName;
      if (a && a !== 'none' && /spin|rotate/.test(a) && !e.matches('.spinner')) out.issues.push(`spinner not .spinner: ${name(e)} ${a}`);
    }
    out.h = [...root.querySelectorAll('h1, h2, h3, h4')].filter(vis).map((e) => `${e.tagName}:${getComputedStyle(e).fontSize}:${e.textContent.trim().slice(0, 24)}`).slice(0, 12);
    const sw = document.documentElement.scrollWidth; if (sw > vw + 1) out.issues.push(`page scrolls sideways ${sw} > ${vw}`);
    for (const e of root.querySelectorAll('*')) { if (!vis(e)) continue; const r = e.getBoundingClientRect(); if (r.right > vw + 1 && getComputedStyle(e).position !== 'fixed') { out.issues.push(`past the right edge: ${name(e)} right=${Math.round(r.right)}`); break; } }
    return out;
  }, [label, rootSel]);
}

(async () => {
  const mobile = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: H }, ...(mobile ? { hasTouch: true, isMobile: true } : {}) });
  if (process.env.SEED) {
    const r = await page.evaluate(async () => {
      const post = async (p, b) => { try { const r = await api(p, { method: 'POST', body: JSON.stringify(b) }); return r.status; } catch (e) { return String(e).slice(0, 60); } };
      const out = [];
      for (const [q, a] of [['What did I agree with Sam?', 'You agreed to send the **weekly summary** on Friday and to review the sprint board together.'], ['Plan my week', 'Monday: review. Tuesday: dentist. Wednesday: kitchen quotes.'], ['Summarise my reading list', 'Three books, one article.']]) out.push(await post('/conversations', { question: q, answer: a }));
      for (const [t, d] of [['Call the dentist', 1], ['Renew passport', 7], ['Pay the tax bill', -1], ['Book the holiday', 20]]) out.push(await post('/reminders', { text: t, due_at: new Date(Date.now() + 86400e3 * d).toISOString() }));
      return out;
    });
    console.log('seed', JSON.stringify(r)); await browser.close(); return;
  }
  const tab = async (n) => { await page.evaluate((n) => switchTab(n), n); await page.waitForTimeout(1300); };
  const click = async (sel) => { await page.evaluate((s) => document.querySelector(s)?.click(), sel); await page.waitForTimeout(900); };
  const tag = `${process.env.SHOTS || 'now'}-${process.env.THEME || 'light'}-${W}`;
  const shot = async (n) => { if (process.env.SHOTS) await page.screenshot({ path: `${OUTDIR}/c437-${n}-${tag}.png` }); };
  const res = [];
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  const want = (n) => !only.length || only.includes(n);
  if (want('dashboard')) { await tab('dashboard'); res.push(await measure(page, 'dashboard', '#tab-dashboard')); await shot('dashboard'); }
  if (want('timeline')) { await tab('timeline'); res.push(await measure(page, 'timeline', '#tab-timeline')); await shot('timeline'); }
  if (want('reminders')) { await tab('reminders'); res.push(await measure(page, 'reminders', '#tab-reminders')); await shot('reminders'); }
  if (want('chat')) {
    await tab('chat'); res.push(await measure(page, 'chat', '#tab-chat')); await shot('chat');
    await page.evaluate(() => { document.querySelector('#conversation-list .conv-title')?.click(); }); await page.waitForTimeout(1200);
    res.push(await measure(page, 'chat/thread', '#tab-chat')); await shot('chat-thread');
    await click('#chat-dock-more-btn'); res.push(await measure(page, 'chat/more', '#chat-dock-more-panel')); await shot('chat-more');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
  if (want('graph')) {
    await tab('graph'); await page.waitForTimeout(1500); res.push(await measure(page, 'graph', '#tab-graph')); await shot('graph');
    await page.evaluate(() => { const n = graphNodesRef && graphNodesRef[0]; if (n) openGraphPopup({ stopPropagation() {}, clientX: 700, clientY: 300 }, n); }); await page.waitForTimeout(1200);
    res.push(await measure(page, 'graph/popup', '#graph-popup')); await shot('graph-popup');
    await page.evaluate(() => closeGraphPopup()); await page.waitForTimeout(300);
    await click('#graph-options-toggle'); res.push(await measure(page, 'graph/options', '#graph-options')); await shot('graph-options');
  }
  if (want('settings')) {
    await page.evaluate(() => document.getElementById('settings-btn')?.click()); await page.waitForTimeout(900);
    for (const s of ['tasks', 'data']) { await click(`#settings-modal [data-section="${s}"]`); await page.waitForTimeout(600); res.push(await measure(page, 'settings/' + s, '#settings-modal')); await shot('settings-' + s); }
  }
  for (const r of res) {
    console.log(`\n== ${r.label} @${W} ${process.env.THEME || 'light'}${r.missing ? ' MISSING ' + r.missing : ''}`);
    if (r.missing) continue;
    console.log('  h', JSON.stringify(r.h));
    for (const [h, l] of Object.entries(r.controls)) console.log(`  ${h}px: ${l}`);
    for (const i of [...new Set(r.issues)].slice(0, 25)) console.log('  ! ' + i);
  }
  await browser.close();
})().catch((e) => { console.error('SWEEP_ERROR', e.message); process.exit(1); });
