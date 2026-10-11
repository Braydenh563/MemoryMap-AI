// second-level tab strip sweeps (.tabs-line), consolidated: one async function per case.
// Run one case by name, or every case in order with no argument:
//   node scratchpad/ui-sweeps/subtabsdepth2.js subtabs

// INBOX 522: every second-level tab strip is one recipe (.tabs-line): no box,
// text tabs, a 2px accent underline under the active one, one height, one gap,
// no icons. Measures notes, library and the document sidebar strips.
async function subtabs() {
  const { boot } = require('./lib.js');
    const W = Number(process.env.W || 1440);
    const { browser, page } = await boot({ viewport: { width: W, height: 900 } });
    const probe = () => page.evaluate(() => {
      const out = {};
      for (const id of ['notes-subtabs', 'library-subtabs', 'doc-sidebar-tabs']) {
        const s = document.getElementById(id);
        if (!s || !s.offsetParent) { out[id] = null; continue; }
        const cs = getComputedStyle(s);
        const bs = [...s.querySelectorAll('button')].filter((b) => b.offsetParent);
        const act = bs.find((b) => b.classList.contains('active') || b.getAttribute('aria-selected') === 'true');
        const rects = bs.map((b) => b.getBoundingClientRect());
        const gaps = rects.slice(1).map((r, i) => Math.round((r.left - rects[i].right) * 10) / 10);
        const after = act && getComputedStyle(act, '::after');
        out[id] = {
          h: Math.round(s.getBoundingClientRect().height * 10) / 10,
          bg: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderTopWidth + '/' + cs.borderBottomWidth,
          tabH: [...new Set(rects.map((r) => Math.round(r.height * 10) / 10))],
          gaps: [...new Set(gaps)], icons: s.querySelectorAll('i.ph').length,
          fill: act && getComputedStyle(act).backgroundColor,
          underline: after && [after.height, after.backgroundColor, after.transform],
          sticky: cs.position, cls: s.className,
        };
      }
      return out;
    });
    const dump = async (name) => console.log(name, JSON.stringify(await probe(), null, 0));
    const shot = (n) => page.screenshot({ path: (process.env.SCRATCH || '.') + `/shots/${n}.png` });
    const T = process.env.THEME || 'light';
    await page.click('#tab-btn-notes'); await page.waitForTimeout(500); await dump('notes');
    await shot(`subtabs-notes-${W}-${T}`);
    await page.click('#tab-btn-library'); await page.waitForTimeout(600); await dump('library');
    await shot(`subtabs-lib-${W}-${T}`);
    await page.evaluate(async () => { try { switchTab('documents'); await createDocument(); } catch (e) { console.log(String(e)); } }); await page.waitForTimeout(1200); await dump('documents');
    await shot(`subtabs-docs-${W}-${T}`);
    await browser.close();
}

// INBOX 522: hover, focus and scrolled states of a .tabs-line strip.
async function subtabs2() {
  const { boot } = require('./lib.js');
    const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
    await page.click('#tab-btn-library'); await page.waitForTimeout(600);
    const b = page.locator('#library-subtabs button:not(.active)').first();
    await b.hover(); await page.waitForTimeout(300);
    console.log('hover', await b.evaluate((e) => { const c = getComputedStyle(e); return [c.color, c.backgroundColor]; }));
    await page.mouse.move(700, 500);
    await b.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    console.log('focus', await b.evaluate((e) => { const c = getComputedStyle(e); return [document.activeElement === e, c.outlineStyle, c.outlineWidth, c.outlineColor]; }));
    await page.evaluate(() => document.getElementById('library-subtabs').setAttribute('data-scrolled', '1'));
    console.log('scrolled', await page.evaluate(() => { const c = getComputedStyle(document.getElementById('library-subtabs')); return [c.backgroundColor, c.backdropFilter, c.boxShadow.slice(0, 80)]; }));
    await page.screenshot({ path: '/tmp/mm-t9/shots/subtabs-states.png', clip: { x: 0, y: 60, width: 1440, height: 70 } });
    await browser.close();
}

// The sticky sub-tab strip stays readable over scrolled content (INBOX 529).
async function subtabscroll() {
  const { boot } = require('./lib.js');
    const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
    for (const [tab, id] of [['notes', 'notes-subtabs'], ['library', 'library-subtabs']]) {
      await page.evaluate((t) => switchTab(t), tab); await page.waitForTimeout(1200);
      const out = await page.evaluate(async (id) => {
        const strip = document.getElementById(id);
        let el = strip.parentElement; while (el && !(el.scrollHeight > el.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
        const sc = el || document.scrollingElement; sc.scrollTop = 900; sc.dispatchEvent(new Event('scroll'));
        await new Promise((r) => setTimeout(r, 400));
        const s = getComputedStyle(strip), r = strip.getBoundingClientRect();
        const under = document.elementsFromPoint(r.left + 200, r.top + r.height / 2).slice(0, 4).map((e) => e.id || e.className.toString().slice(0, 30));
        return { scroller: sc.id || sc.className.toString().slice(0, 30), top: Math.round(sc.scrollTop), scrolled: strip.dataset.scrolled, bg: s.backgroundColor, blur: s.backdropFilter, stuckTop: Math.round(r.top), under };
      }, id);
      console.log(tab, JSON.stringify(out));
    }
    await browser.close();
}

const CASES = {
  subtabs,
  subtabs2,
  subtabscroll,
};
const names = process.argv.slice(2);
const unknown = names.filter((n) => !Object.prototype.hasOwnProperty.call(CASES, n));
if (unknown.length) {
  console.error(`unknown case: ${unknown.join(", ")}`);
  console.error(`cases: ${Object.keys(CASES).join(", ")}`);
  process.exit(2);
}
(async () => {
  for (const name of names.length ? names : Object.keys(CASES)) await CASES[name]();
})();
