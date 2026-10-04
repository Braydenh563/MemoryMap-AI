// INBOX 437 (4): the numbers behind each fix in the consistency pass, before
// and after. One line per check, "name: value", so two runs diff cleanly.
//
//   BASE=http://127.0.0.1:8810 W=1440 THEME=light node consist437probe.js
//   W=390 for the phone (touch and a coarse pointer, as lib.js boots it).
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
(async () => {
  const mobile = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: mobile ? 844 : 900 }, ...(mobile ? { hasTouch: true, isMobile: true } : {}) });
  const tab = async (n) => { await page.evaluate((n) => switchTab(n), n); await page.waitForTimeout(1300); };
  const lines = [];
  const m = async (label, fn, arg) => { const v = await page.evaluate(fn, arg); lines.push(`${label}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };
  const h = (sels) => sels.map((s) => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return s + '=-'; return s.replace(/^.* /, '') + '=' + Math.round(e.getBoundingClientRect().height); }).join(' ');

  await tab('chat');
  await m('chat composer', h, ['#attach-note', '#attach-image', '#mic-chat', '#chat-send']);
  await m('chat strip', h, ['#chat-skills-btn', '.chat-dock-controls .select-shell:has(> .feature-model-select) .select-opener', '.chat-dock-controls .seg', '#chat-dock-more-btn']);
  await m('chat sidebar', h, ['#chat-new', '#chat-sidebar .select-opener', '#chat-sidebar .sidebar-collapse-toggle']);
  await page.evaluate(() => document.getElementById('chat-dock-more-btn')?.click()); await page.waitForTimeout(500);
  await m('chat more panel', h, ['#chat-dock-more-panel .chat-dock-more-row .select-opener', '#persona-peek', '#chat-tune-search']);
  await page.keyboard.press('Escape');

  await tab('dashboard');
  await m('dash name nudge', () => [...document.querySelectorAll('#dash-name-nudge > button')].map((b) => Math.round(b.getBoundingClientRect().height)).join('/'));
  await m('dash clock', () => document.getElementById('dash-clock-time')?.textContent);
  await tab('reminders');
  await m('reminders clock', () => document.querySelector('#tab-reminders .clock-time')?.textContent);
  await m('reminders group count', () => { const e = document.querySelector('.reminder-group-head .group-count'); if (!e) return '-'; const c = getComputedStyle(e); return `bg ${c.backgroundColor} r ${c.borderTopLeftRadius} color ${c.color}`; });
  await m('finder-like count (timeline)', () => { const e = document.querySelector('.timeline-bucket-count'); if (!e) return '-'; const c = getComputedStyle(e); return `bg ${c.backgroundColor} color ${c.color}`; });

  await tab('timeline');
  await m('timeline count', () => { const e = document.getElementById('timeline-count'); if (!e) return '-'; const shown = !!e.getClientRects().length; return `${e.className} shown=${shown} w=${Math.round(e.getBoundingClientRect().width)} sw=${e.scrollWidth} text="${e.textContent}"`; });
  await m('graph-like count', () => { const e = document.getElementById('graph-stats'); return e ? e.className : '-'; });
  await m('timeline heads', () => [...document.querySelectorAll('.timeline-bucket-head')].filter((e) => e.getClientRects().length).slice(0, 8).map((e) => Math.round(e.getBoundingClientRect().height)).join('/'));

  await tab('graph'); await page.waitForTimeout(800);
  await m('graph zoom', h, ['#graph-zoom-in', '#graph-zoom-out', '#graph-zoom-fit', '#graph-fullscreen']);
  await m('graph dock', h, ['#graph-search', '#graph-add-node', '#graph-refresh']);
  await m('graph legend', () => { const l = document.querySelector('.graph-legend, #graph-legend'); if (!l) return '-'; const r = l.getBoundingClientRect(); const items = [...l.querySelectorAll('.legend-item')]; const last = items[items.length - 1]?.getBoundingClientRect(); return `w=${Math.round(r.width)} sw=${l.scrollWidth} ox=${getComputedStyle(l).overflowX} lastRight=${last ? Math.round(last.right) : '-'} vw=${innerWidth} itemH=${items[0] ? Math.round(items[0].getBoundingClientRect().height) : '-'}`; });

  await page.evaluate(() => document.getElementById('settings-btn')?.click()); await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('#settings-modal [data-section="tasks"]')?.click()); await page.waitForTimeout(1200);
  await m('jobs list', () => { const l = document.getElementById('job-runs-list'); if (!l) return '-'; const li = [...l.children]; const c = li[0] && getComputedStyle(li[0]); return `rows=${li.length} rowH=${li[0] ? Math.round(li[0].getBoundingClientRect().height) : '-'} listH=${Math.round(l.getBoundingClientRect().height)} bg=${c && c.backgroundColor}`; });
  await page.evaluate(() => document.querySelector('#settings-modal [data-section="data"]')?.click()); await page.waitForTimeout(900);
  await m('data file pickers', () => [...document.querySelectorAll('#settings-modal input[type=file]')].filter((e) => e.getClientRects().length).map((e) => `${e.id}=${Math.round(e.getBoundingClientRect().height)}`).join(' '));
  await m('data buttons', h, ['#import-md', '#import-md-folder-btn', '#import-document', '#find-duplicates']);
  await m('export row', () => { const b = [...document.querySelectorAll('#settings-modal button')].filter((x) => /^Export/.test(x.textContent.trim()) && x.getClientRects().length); return b.map((x) => `${x.textContent.trim().slice(0, 12)}@${Math.round(x.getBoundingClientRect().top)}`).join(' '); });
  console.log(`== ${W} ${process.env.THEME || 'light'}`);
  console.log(lines.join('\n'));
  await browser.close();
})().catch((e) => { console.error('SWEEP_ERROR', e.message); process.exit(1); });
