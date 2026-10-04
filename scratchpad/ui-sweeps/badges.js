// Every small label across the app, grouped by how it is drawn (INBOX 437,
// the owner: "make sure the badges are the same style across the app").
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/badges.js            (THEME=dark for dark)
//
// A badge here is a short, non-interactive label: `.chip` that is not a
// button, anything whose class names a badge, a pill or a label chip. Each is
// reduced to a signature (font size and weight, height, padding, corner,
// border, background); the report lists every signature with the classes and
// views that use it. One recipe means few signatures, each with a reason.
const { boot } = require('./lib.js');

const VIEWS = [
  ['dashboard', "switchTab('dashboard')"],
  ['notes', "switchTab('notes')"],
  ['library/docs', "switchTab('library')", "document.querySelector('#library-subtabs [data-target=\"library-view-docs\"]').click()"],
  ['library/skills', "switchTab('library')", "document.querySelector('#library-subtabs [data-target=\"library-view-skills\"]').click()"],
  ['library/media', "switchTab('library')", "document.querySelector('#library-subtabs [data-target=\"library-view-media\"]').click()"],
  ['reminders', "switchTab('reminders')"],
  ['settings/models', "openSettingsModal('models')", "document.getElementById('sampling-box').open = true"],
  ['settings/templates', "openSettingsModal('templates')"],
  ['settings/skills', "openSettingsModal('skills')"],
  ['settings/personas', "openSettingsModal('personas')"],
];

const SELECTOR = [
  '.chip:not(button):not(a)', '[class*="badge"]', '.item-label', '.sampling-source',
  '.status-pill', '.kbd-chip', '.count-pill', '.entry-meta > span:not(.entry-actions)',
].join(',');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const groups = new Map();
  for (const [name, ...steps] of VIEWS) {
    await page.keyboard.press('Escape').catch(() => {});
    for (const step of steps) {
      await page.evaluate((code) => { try { (0, eval)(code); } catch (e) { /* view absent */ } }, step);
      await page.waitForTimeout(900);
    }
    const found = await page.evaluate((sel) => {
      const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true, opacityProperty: true });
      return [...document.querySelectorAll(sel)].filter(vis).filter((e) => {
        const text = e.textContent.trim();
        return text && text.length <= 32 && !e.closest('button, a, [role="button"]');
      }).map((e) => {
        const s = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        const border = parseFloat(s.borderTopWidth) ? `${s.borderTopWidth} ${s.borderTopStyle}` : 'none';
        const bg = s.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'none' : 'fill';
        return {
          sig: `${s.fontSize}/${s.fontWeight} h${Math.round(r.height)} pad ${s.paddingTop} ${s.paddingLeft} r${s.borderTopLeftRadius} b:${border} bg:${bg}`,
          cls: (e.className && typeof e.className === 'string' ? e.className : e.tagName).split(/\s+/).filter((c) => !/^(hidden|muted)$/.test(c)).slice(0, 3).join('.'),
          text: e.textContent.trim().slice(0, 18),
        };
      });
    }, SELECTOR);
    for (const f of found) {
      const g = groups.get(f.sig) || { n: 0, classes: new Map() };
      g.n += 1;
      const c = g.classes.get(f.cls) || { views: new Set(), text: f.text };
      c.views.add(name);
      g.classes.set(f.cls, c);
      groups.set(f.sig, g);
    }
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].n - a[1].n);
  console.log(`${sorted.length} signatures`);
  for (const [sig, g] of sorted) {
    console.log(`\n${g.n}x  ${sig}`);
    for (const [cls, c] of g.classes) console.log(`    ${cls}  "${c.text}"  [${[...c.views].join(', ')}]`);
  }
  await browser.close();
})();
