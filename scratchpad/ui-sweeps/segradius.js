// The segmented-control radius table (DESIGN.md, "Segmented controls";
// OPEN.md's App wide row). Reads the computed track radius of every
// `.seg`, `.segmented-control` and sub-tab strip on every surface, as a
// multiple of the root `--radius`, and checks it against the table:
//
//   choice control   --radius-choice  1.1x  (anywhere on its own)
//   tab strip        --radius-strip   0.8x  (the sub-tabs, the OCR rail, the tab bar)
//   in a .dock bar   --radius-md      0.6x  (the bar's own corner)
//   in the chat dock --radius-pill          (a row of pills)
//   full-bleed       0                      (#doc-sidebar-tabs only)
//
// Computed style is read whether or not the control is on screen (a hidden
// element still resolves its rules), so a document's toggles are measured
// without driving the editor open. Run against a server of your own:
//   BASE=http://127.0.0.1:8796 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node segradius.js
const { boot } = require('./lib.js');

const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { page, browser } = await boot({ viewport: { width: WIDTH, height: 900 } });
  await page.waitForTimeout(3000);
  await page.evaluate(async () => {
    await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Radius probe', content: '# Radius probe\n\nA paragraph.' }) }).catch(() => null);
  });
  const seen = new Map();
  const collect = async (where) => {
    const rows = await page.evaluate(() => {
      const root = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--radius')) || 0;
      const out = [];
      for (const el of document.querySelectorAll('.seg, .segmented-control, .ocr-rail-switch, [role="tablist"]')) {
        const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
        out.push({
          key: el.id ? `#${el.id}` : `.${[...el.classList].slice(0, 3).join('.')}`,
          r,
          root,
          dock: !!el.closest('.dock'),
          chatDock: !!el.closest('.chat-dock-controls'),
          strip: el.matches('.notes-subtabs, .library-subtabs, .ocr-rail-switch, #tab-bar'),
        });
      }
      return out;
    });
    for (const row of rows) if (!seen.has(row.key)) seen.set(row.key, { ...row, where });
  };
  const tab = async (name) => {
    await page.evaluate((n) => switchTab(n), name).catch(() => {});
    await page.waitForTimeout(700);
  };
  await collect('dashboard');
  for (const name of ['notes', 'timeline', 'reminders', 'graph', 'chat']) {
    await tab(name);
    await collect(name);
  }
  await tab('notes');
  for (const section of ['capture', 'browse', 'ask', 'writing-room']) {
    await page.evaluate((s) => showNotesSection(s), section).catch(() => {});
    await page.waitForTimeout(500);
    await collect(`notes:${section}`);
  }
  await tab('library');
  const subtabs = await page.$$eval('#library-subtabs [role="tab"]', (els) => els.length);
  for (let i = 0; i < subtabs; i += 1) {
    await page.evaluate((k) => document.querySelectorAll('#library-subtabs [role="tab"]')[k].click(), i);
    await page.waitForTimeout(600);
    await collect(`library:${i}`);
  }
  // A document open in the editor: its view toggle, history filter and
  // sidebar tabs only exist there.
  const opened = await page.evaluate(async () => {
    document.querySelectorAll('#library-subtabs [role="tab"]')[1]?.click();
    const docs = await apiJson('/documents').catch(() => []);
    const list = Array.isArray(docs) ? docs : docs.items || docs.documents || [];
    if (!list[0]) return 'no document';
    await openDocument(list[0].id);
    return `opened ${list[0].id}`;
  }).catch((e) => String(e).slice(0, 120));
  console.log('document:', opened);
  await page.waitForTimeout(1500);
  await collect('document');
  await page.click('#settings-btn').catch(() => {});
  await page.waitForTimeout(700);
  await page.click('#settings-modal [data-section="appearance"]').catch(() => {});
  await page.waitForTimeout(500);
  await collect('settings:appearance');

  const family = (row) => {
    if (row.r >= 100) return 'pill';
    if (row.r === 0) return 'square';
    const k = Math.round((row.r / row.root) * 100) / 100;
    return { 1.1: 'choice', 0.8: 'strip', 0.6: 'dock' }[k] || `other(${k})`;
  };
  const findings = [];
  const counts = {};
  for (const row of [...seen.values()].sort((a, b) => a.key.localeCompare(b.key))) {
    const f = family(row);
    counts[f] = (counts[f] || 0) + 1;
    console.log(`${f.padEnd(12)} ${String(row.r).padStart(6)}px  ${row.key}  (${row.where})`);
    const ok =
      (f === 'choice' && !row.dock && !row.chatDock && !row.strip) ||
      (f === 'strip' && row.strip) ||
      (f === 'dock' && row.dock) ||
      (f === 'pill' && row.chatDock) ||
      (f === 'square' && row.key === '#doc-sidebar-tabs');
    if (!ok) findings.push(`${row.key} is ${row.r}px (${f}) where the table says otherwise`);
  }
  console.log('families:', JSON.stringify(counts));
  for (const line of findings) console.log(`    ${line}`);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
