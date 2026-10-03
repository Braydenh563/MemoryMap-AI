// INBOX 437 (4), second round: the Settings shell and its sections, Reminders
// on a phone, the Library lists, the Notes chrome and the Documents dock. One
// line per check, "name: value", so two runs diff cleanly (the first round is
// consist437probe.js).
//
//   BASE=http://127.0.0.1:8814 W=1440 THEME=light node consist437b.js
//   PART=settings|reminders|library|notes|docs to run one part; W=390 for the
//   phone (touch and a coarse pointer, as lib.js boots it).
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
const PART = process.env.PART || 'settings,reminders,library,notes,docs';
(async () => {
  const mobile = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: mobile ? 844 : 900 }, ...(mobile ? { hasTouch: true, isMobile: true } : {}) });
  const lines = [];
  const m = async (label, fn, arg) => { const v = await page.evaluate(fn, arg); lines.push(`${label}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };
  const tab = async (n) => { await page.evaluate((n) => switchTab(n), n); await page.waitForTimeout(1300); };
  // Every visible control under a root: the heights, the filled buttons, and
  // the fields, as histograms, so a drift reads as a second bucket.
  const audit = (sel) => {
    const root = document.querySelector(sel); if (!root) return '-';
    const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.hidden,[hidden]');
    const btn = [...root.querySelectorAll('button, .button, label.button')].filter(vis);
    const probe = document.createElement('i'); probe.style.color = 'var(--on-accent)'; document.body.append(probe); const on = getComputedStyle(probe).color; probe.remove();
    const filled = btn.filter((b) => { const c = getComputedStyle(b); return !b.classList.contains('ghost') && !b.closest('.seg, .select-shell') && c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.color === on; });
    const hist = {}; for (const b of btn.filter((b) => !b.closest('.seg'))) { const h = Math.round(b.getBoundingClientRect().height); hist[h] = (hist[h] || 0) + 1; }
    const fields = [...root.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]), .select-opener, textarea')].filter(vis);
    const fh = {}; for (const f of fields) { const h = Math.round(f.getBoundingClientRect().height); fh[h] = (fh[h] || 0) + 1; }
    return `filled=${filled.length}[${filled.map((b) => (b.id || b.textContent.trim().slice(0, 16))).join('|')}] btnH=${JSON.stringify(hist)} fieldH=${JSON.stringify(fh)} H=${Math.round(root.scrollHeight)}`;
  };
  const rect = (sels) => sels.map((s) => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return s + '=-'; const r = e.getBoundingClientRect(); return `${s.replace(/^.* /, '')}=${Math.round(r.height)}@${Math.round(r.top)}`; }).join(' ');

  if (PART.includes('settings')) {
    await page.evaluate(() => openSettingsModal('models')); await page.waitForTimeout(1200);
    await m('settings search', () => { const e = document.getElementById('settings-search'); const c = getComputedStyle(e); return `h=${Math.round(e.getBoundingClientRect().height)} pad=${c.paddingTop} font=${c.fontSize} r=${c.borderTopLeftRadius}`; });
    await m('settings nav rows', () => { const b = [...document.querySelectorAll('#settings-nav [data-section]')].filter((e) => e.getClientRects().length); const hs = b.map((e) => Math.round(e.getBoundingClientRect().height)); const c = b[0] && getComputedStyle(b[0]); return `n=${b.length} h=${[...new Set(hs)].join('/')} pad=${c && c.paddingTop} font=${c && c.fontSize} r=${c && c.borderTopLeftRadius} gap=${b[1] ? Math.round(b[1].getBoundingClientRect().top - b[0].getBoundingClientRect().bottom) : '-'}`; });
    await m('settings nav label', () => { const e = document.querySelector('#settings-nav .nav-group-label'); if (!e.getClientRects().length) return 'hidden'; const c = getComputedStyle(e); return `h=${Math.round(e.getBoundingClientRect().height)} mt=${c.marginTop} mb=${c.marginBottom}`; });
    await m('settings nav total', () => { const n = document.getElementById('settings-nav'); return `scrollH=${Math.round(n.scrollHeight)} clientH=${n.clientHeight} w=${Math.round(n.getBoundingClientRect().width)}`; });
    await m('settings head', () => [...document.querySelectorAll('#settings-modal .modal-header button, #settings-modal .modal-header .select-opener')].filter((e) => e.getClientRects().length).map((e) => `${e.id || e.className.split(' ')[0]}=${Math.round(e.getBoundingClientRect().height)}`).join(' '));
    const secs = (process.env.SECS || 'models,appearance,templates,skills,personas,privacy,shortcuts,data,general,preferences,account,searchindex,tools,memory,learned,websearch,extras,tasks,logs').split(',');
    for (const s of secs) {
      await page.evaluate((s) => openSettingsModal(s), s); await page.waitForTimeout(1100);
      await m('settings ' + s, audit, '#settings-' + s);
    }
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  }

  if (PART.includes('reminders')) {
    await page.evaluate(async () => { for (const [t, d] of [['Call the plumber', 1], ['Renew passport before the trip', 2], ['Water plants', 0]]) { await api('/reminders', { method: 'POST', body: JSON.stringify({ text: t, remind_at: new Date(Date.now() + d * 864e5 + 36e5).toISOString() }) }).catch(() => {}); } });
    await tab('reminders'); await page.waitForTimeout(600);
    await m('reminder rows', () => { const r = [...document.querySelectorAll('#reminders-list .reminder-item, #reminders-list li')].filter((e) => e.getClientRects().length); return `n=${r.length} h=${r.slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().height)).join('/')}`; });
    await m('reminder row parts', () => { const e = [...document.querySelectorAll('#reminders-list .reminder-item, #reminders-list li')].find((e) => e.getClientRects().length); if (!e) return '-'; return [...e.querySelectorAll('input[type=checkbox], .reminder-check, button, .reminder-text, .reminder-meta, .reminder-when, time')].filter((x) => x.getClientRects().length).map((x) => { const r = x.getBoundingClientRect(); return `${(x.className || x.tagName).toString().split(' ')[0]}:${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.left)},${Math.round(r.top - e.getBoundingClientRect().top)}`; }).join(' '); });
    await m('reminders dock', audit, '#tab-reminders');
  }

  if (PART.includes('library')) {
    await tab('library');
    for (const sub of ['bookmarks', 'contents', 'skills', 'media', 'boards', 'maps']) {
      const ok = await page.evaluate((s) => { const b = document.querySelector(`#library-subtabs [data-sub="${s}"], #library-subtabs [data-subtab="${s}"], #library-subtabs [data-view="${s}"]`); if (b) { b.click(); return true; } return false; }, sub);
      await page.waitForTimeout(1200);
      await m('library ' + sub + (ok ? '' : ' (no tab)'), audit, '#tab-library');
      await m('library ' + sub + ' rows', () => { const host = document.querySelector('#tab-library'); const rows = [...host.querySelectorAll('[role=row], li, article, .library-row, .timeline-row')].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height > 20 && !e.closest('nav, .dock, .kebab-menu, [role=menu]')); const hs = rows.slice(0, 12).map((e) => Math.round(e.getBoundingClientRect().height)); return `n=${rows.length} h=${hs.join('/')} cls=${rows[0] ? rows[0].className.split(' ').slice(0, 2).join('.') : '-'}`; });
    }
  }

  if (PART.includes('notes')) {
    await tab('notes'); await page.waitForTimeout(600);
    await m('notes capture', audit, '#capture, #tab-notes .capture-card, #tab-notes');
    await m('notes browse head', audit, '#browse');
  }

  if (PART.includes('docs')) {
    await tab('documents'); await page.waitForTimeout(800);
    await m('documents dock', audit, '#tab-documents .dock');
  }
  console.log(`== ${W} ${process.env.THEME || 'light'}`);
  console.log(lines.join('\n'));
  await browser.close();
})().catch((e) => { console.error('SWEEP_ERROR', e.message); process.exit(1); });
