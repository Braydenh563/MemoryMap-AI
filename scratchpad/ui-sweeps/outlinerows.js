// The document outline's row height, per density and pointer (the doc-sidebar
// agent's item 1, archived; openitems.md "For the orchestrator"). The rows
// were 24 to 25.2px under DESIGN.md's 28px `--target-min`, left on purpose
// for a dense list you scan; the recommendation was density-aware: compact
// keeps 24, comfortable and spacious take the floor, and a touch screen
// takes it at every density.
//
//   BASE=http://127.0.0.1:8796 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node outlinerows.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const CASES = [
  { density: 'compact', touch: false, min: 23.5, max: 26 },
  { density: 'comfortable', touch: false, min: 27.9, max: 30 },
  { density: 'spacious', touch: false, min: 27.9, max: 40 },
  { density: 'compact', touch: true, min: 43.9, max: 48 },
];

(async () => {
  const findings = [];
  for (const c of CASES) {
    const opts = c.touch
      ? { viewport: { width: 1024, height: 900 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1440, height: 900 } };
    const { page, browser } = await boot(opts);
    await page.waitForTimeout(3000);
    await page.evaluate((d) => { document.documentElement.dataset.density = d; }, c.density);
    const body = Array.from({ length: 12 }, (_, i) => `## Heading ${i + 1}\n\nA paragraph under heading ${i + 1}.`).join('\n\n');
    await openDoc(page, { title: 'Outline probe', content: `# Outline probe\n\n${body}` });
    await page.evaluate(() => document.querySelector('#doc-sidebar-tabs [aria-controls="doc-sidebar-outline"]')?.click());
    await page.waitForTimeout(600);
    const res = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.outline-link')].filter((e) => e.checkVisibility());
      const hs = rows.map((r) => Math.round(r.getBoundingClientRect().height * 10) / 10);
      return { n: rows.length, min: Math.min(...hs), max: Math.max(...hs), density: document.documentElement.dataset.density };
    }).catch((e) => ({ err: String(e).slice(0, 160) }));
    const label = `${c.density}${c.touch ? ' touch' : ''}`;
    console.log(`${label.padEnd(18)} ${JSON.stringify(res)}`);
    if (res.err || !res.n) findings.push(`${label}: no outline rows (${res.err || 'none visible'})`);
    else if (res.min < c.min || res.max > c.max) findings.push(`${label}: rows ${res.min} to ${res.max}px, want ${c.min} to ${c.max}`);
    await browser.close();
  }
  for (const f of findings) console.log('    ' + f);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
