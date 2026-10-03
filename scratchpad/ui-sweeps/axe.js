// WCAG 2.2 AA scan with axe-core (INBOX 433): every tab, the Notes and
// Library sub-tabs, every Settings section, in light and dark.
//
//   npm pack axe-core@4 && tar xzf axe-core-*.tgz -C /tmp/axe-core
//   BASE=http://127.0.0.1:8781 AXE_JS=/tmp/axe-core/package/axe.min.js \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/axe.js
//
// THEMES=light,dark (default both), WIDTH=1440, ONLY=notes,settings to narrow.
// Prints one line per rule and surface with the first few targets, then a
// total. Exit 1 when anything is found. axe is not vendored: it is MPL-2.0
// and a dev tool, so the sweep reads it from AXE_JS.
//
// axe's own limits, said here so a clean run is not read as more than it is:
// it checks what the DOM states (names, roles, contrast of plain text over a
// solid background, landmarks, ARIA validity). It does not see focus order,
// text over gradients or images (it reports those as "incomplete", counted
// below), zoom reflow, or what a screen reader says aloud. zoom.js and
// srtree.js cover the middle two.
const fs = require('fs');
const { boot } = require('./lib.js');

const AXE_JS = process.env.AXE_JS || '/tmp/axe-core/package/axe.min.js';
if (!fs.existsSync(AXE_JS)) {
  console.error(`axe-core not found at ${AXE_JS}; see the header for how to fetch it`);
  process.exit(2);
}
const AXE = fs.readFileSync(AXE_JS, 'utf8');
const TABS = ['dashboard', 'notes', 'library', 'chat', 'graph', 'timeline', 'reminders', 'documents', 'whiteboard'];
const SUBTABS = { notes: ['browse', 'capture', 'writing-room', 'ask'], library: ['docs', 'boards', 'images', 'files', 'skills', 'links', 'contents'] };
const SECTIONS = ['account', 'privacy', 'learned', 'appearance', 'preferences', 'models', 'tools', 'skills', 'personas', 'templates', 'websearch', 'memory', 'tasks', 'data', 'logs', 'shortcuts', 'extras', 'help', 'about'];
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const want = (name) => !ONLY.length || ONLY.some((o) => name.startsWith(o));
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page, where, context, seen, out) {
  await page.evaluate(AXE);
  const result = await page.evaluate(async ([ctx, tags]) => {
    const r = await window.axe.run(ctx ? document.querySelector(ctx) || document : document, {
      runOnly: { type: 'tag', values: tags },
      resultTypes: ['violations', 'incomplete'],
    });
    const pick = (list) => list.map((v) => ({
      id: v.id, impact: v.impact, help: v.help,
      targets: v.nodes.map((n) => n.target.join(' ')),
      summary: v.nodes[0] ? (v.nodes[0].failureSummary || '').split('\n').slice(1, 3).join(' ').trim() : '',
    }));
    return { violations: pick(r.violations), incomplete: r.incomplete.reduce((n, v) => n + v.nodes.length, 0) };
  }, [context, TAGS]);
  for (const v of result.violations) {
    //: The same node failing the same rule on every tab (the header, the
    //: status bar) is one finding, not nine: report it where it is first seen.
    const fresh = v.targets.filter((t) => !seen.has(v.id + '|' + t));
    fresh.forEach((t) => seen.add(v.id + '|' + t));
    if (!fresh.length) continue;
    out.push(`[${where}] ${v.impact} ${v.id} (${fresh.length}): ${v.help}\n      ${fresh.slice(0, 4).join('\n      ')}${v.summary ? `\n      why: ${v.summary.slice(0, 220)}` : ''}`);
  }
  return result.incomplete;
}

(async () => {
  let total = 0;
  for (const theme of (process.env.THEMES || 'light,dark').split(',')) {
    process.env.THEME = theme;
    const width = Number(process.env.WIDTH || 1440);
    const { browser, page } = await boot({ viewport: { width, height: 900 } });
    const seen = new Set(); const out = []; let incomplete = 0;
    for (const t of TABS) {
      if (!want(t)) continue;
      await page.evaluate((name) => switchTab(name), t); await page.waitForTimeout(900);
      incomplete += await scan(page, t, null, seen, out);
      for (const s of SUBTABS[t] || []) {
        const ok = await page.click(`#tab-${t} [data-section="${s}"], #tab-${t} [data-view="${s}"]`, { timeout: 1500 }).then(() => true).catch(() => false);
        if (!ok) continue;
        await page.waitForTimeout(600);
        incomplete += await scan(page, `${t}/${s}`, null, seen, out);
      }
    }
    if (want('settings')) {
      await page.click('#settings-btn').catch(() => {}); await page.waitForTimeout(600);
      for (const s of SECTIONS) {
        const ok = await page.click(`#settings-modal [data-section="${s}"]`, { timeout: 1500 }).then(() => true).catch(() => false);
        if (!ok) continue;
        await page.waitForTimeout(350);
        incomplete += await scan(page, `settings/${s}`, '#settings-modal', seen, out);
      }
      await page.keyboard.press('Escape');
    }
    console.log(`== ${theme} ${width}px: ${out.length} findings, ${incomplete} nodes axe could not decide (incomplete)`);
    out.forEach((line) => console.log('  ' + line));
    total += out.length;
    await browser.close();
  }
  process.exit(total ? 1 : 0);
})();
