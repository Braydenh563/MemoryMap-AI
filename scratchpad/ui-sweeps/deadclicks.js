// Dead buttons: a press that changes nothing at all.
//
//   BASE=http://127.0.0.1:8813 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/deadclicks.js
//
// On every tab and sub-tab, every visible, enabled button that is not a menu
// row and not destructive is pressed once, and the press counts as alive if
// any of these moved within 600ms: the DOM (a MutationObserver on the whole
// document, attributes included, so a dialog or a sheet counts), the focus,
// the URL or a toast. A button that moves none of them is either
// broken or says nothing about what it did, and both read the same to the
// person pressing it. A request on its own does not count (the app polls).
//
// Not pressed, because a scratch notebook is still a notebook: anything whose
// name deletes, clears, quits, locks, forgets, resets, imports, exports,
// downloads, restarts or updates, and anything that makes a new thing (a note,
// a board, a chat) whose side effects would change every later surface.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PW = 'testpassword123';
const BASE = process.env.BASE || 'http://127.0.0.1:8781';
const SKIP = /delete|bin\b|remove|quit|lock|forget|clear|reset|purge|archive|discard|uninstall|restore|revert|import|export|download|update|restart|shut|sign out|log out|new |create|add |save|send|record|dictate|microphone|upload|attach|install|pull|empty|merge|split|duplicate|print|copy|share/i;
const SURFACES = [
  ['dashboard'], ['notes', 'browse'], ['notes', 'capture'], ['notes', 'writing-room'], ['notes', 'ask'],
  ['chat'], ['graph'], ['library', 'docs'], ['library', 'images'], ['library', 'files'], ['library', 'links'],
  ['timeline'], ['reminders'],
];

function candidates(scope) {
  const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && e.getBoundingClientRect().width > 4;
  const root = document.querySelector(scope);
  if (!root) return [];
  const out = [];
  const seen = new Set();
  for (const b of root.querySelectorAll('button')) {
    if (!vis(b) || b.disabled || b.getAttribute('aria-disabled') === 'true') continue;
    if (b.closest('.action-menu, .select-menu, [role="menu"], [role="listbox"], .doc-dock-menu-list, .sheet')) continue;
    const r = b.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;
    const name = (b.getAttribute('aria-label') || b.title || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!name) continue;
    const key = `${b.id}|${name.replace(/\d+/g, '#')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const n = (window.__dcN = (window.__dcN || 0) + 1);
    b.setAttribute('data-dc', String(n));
    out.push({ n, name, id: b.id, cls: String(b.className).slice(0, 40) });
  }
  return out;
}

function arm() {
  window.__dcMut = 0;
  window.__dcFocus = document.activeElement;
  window.__dcHref = location.href;
  if (window.__dcObs) window.__dcObs.disconnect();
  //: The clock and the status bar's live figures move on their own; a change
  //: only there is not the button's doing.
  const quiet = (n) => {
    const el = n.nodeType === 1 ? n : n.parentElement;
    return !!(el && el.closest('#status-bar, .dash-clock, [class*="clock"], #toast-container, .toast-stack'));
  };
  window.__dcObs = new MutationObserver((recs) => { for (const r of recs) if (!quiet(r.target)) window.__dcMut++; });
  window.__dcObs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
}

function readout() {
  window.__dcObs && window.__dcObs.disconnect();
  const toast = [...document.querySelectorAll('.toast, [role="status"], [role="alert"]')].some((t) => t.checkVisibility && t.checkVisibility() && t.textContent.trim());
  return {
    mut: window.__dcMut,
    focus: document.activeElement !== window.__dcFocus,
    href: location.href !== window.__dcHref,
    toast,
  };
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('onboardingDone', '1'); localStorage.setItem('tourDone', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  let requests = 0;
  page.on('request', () => { requests++; });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  await page.fill('#lock-password', PW);
  await page.click('#lock-submit');
  await page.waitForTimeout(2500);
  const go = async (tab, sub) => {
    await page.keyboard.press('Escape').catch(() => {});
    await page.evaluate(() => { try { closeActionMenus(); } catch (e) {} for (const d of document.querySelectorAll('details[open]')) d.open = false; });
    await page.evaluate((n) => { try { switchTab(n); } catch (e) {} }, tab);
    await page.waitForTimeout(700);
    if (sub) {
      await page.evaluate(([t, s]) => document.querySelector(`#tab-${t} [data-section="${s}"], #tab-${t} [data-view="${s}"]`)?.click(), [tab, sub]);
      await page.waitForTimeout(600);
    }
  };
  let pressed = 0;
  const dead = [];
  for (const [tab, sub] of SURFACES) {
    await go(tab, sub);
    const list = await page.evaluate(candidates, `#tab-${tab}`);
    for (const c of list) {
      if (SKIP.test(c.name)) continue;
      const still = await page.evaluate((n) => { const b = document.querySelector(`[data-dc="${n}"]`); return !!b && b.checkVisibility() && !b.disabled; }, c.n);
      if (!still) continue;
      await page.evaluate(arm);
      const before = requests;
      const ok = await page.click(`[data-dc="${c.n}"]`, { timeout: 2000 }).then(() => true).catch(() => false);
      if (!ok) continue;
      pressed++;
      await page.waitForTimeout(600);
      const r = await page.evaluate(readout);
      const net = requests - before;
      //: A request alone does not make a press alive: the app polls, so a
      //: request lands in most 600ms windows whatever was pressed. A press
      //: that only fetched and then showed nothing is reported with its
      //: request count, since "it asked the server and said nothing" is the
      //: same experience as a dead button.
      if (!r.mut && !r.focus && !r.href && !r.toast) dead.push(`${sub ? tab + '/' + sub : tab} ${c.id ? '#' + c.id : ''} "${c.name}" (${c.cls})${net ? ` [${net} request(s), nothing shown]` : ''}`);
      // Put the surface back for the next press.
      await go(tab, sub);
    }
  }
  console.log(`== ${pressed} buttons pressed, ${dead.length} changed nothing, ${errs.length} page errors`);
  for (const d of dead) console.log('  ' + d);
  for (const e of [...new Set(errs)]) console.log('  PAGEERROR ' + e);
  await browser.close();
})();
