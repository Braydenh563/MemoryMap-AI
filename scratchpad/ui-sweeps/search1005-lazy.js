// Every lazy bundle that search-boot-1005 moved boot code into loads before its
// first use, with no console error and no page error. Per bundle: the moved
// names are NOT real functions at boot (so the move happened), the bundle's own
// entry gesture loads it, and then the names are functions and one of them runs.
//   settingsControls (Settings window), appPalette (Ctrl+K), lightbox
//   (highlightCodeInto), library bundle (showDetailDialog, calloutMenuItems,
//   pickNotesDialog, addBoardToNote), chordGuide (the "m" chord).
//   BASE=http://127.0.0.1:8811 SCRATCH=/tmp/x [W=390] [THEME=dark] node search1005-lazy.js
const { boot } = require('./lib.js');

const W = Number(process.env.W || 1440);
const SETTINGS = ['runEmbeddingFallback', 'resetAllFeatureModels', 'applyChatModel', 'applyOcrModel', 'applyUtilityModel', 'applyVisionModel', 'addTemplate', 'saveRunBudget', 'saveWebSearchSettings', 'restartMemoryMap', 'findDuplicates', 'renderDuplicateGroups', 'mergeDuplicateGroup', 'saveExportSaveDir', 'addMemoryByHand', 'refreshSearxngHost', 'applyBackendChoice', 'saveModelContextWindow', 'addPersona'];
const LIBRARY = ['showDetailDialog', 'calloutMenuItems', 'pickNotesDialog', 'addBoardToNote'];

(async () => {
  const errors = [];
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 800 : 900 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
  const checks = {};
  const types = (names) => page.evaluate((ns) => Object.fromEntries(ns.map((n) => [n, typeof window[n] === 'function' ? (window[n].toString().length < 220 ? 'stand-in' : 'real') : typeof window[n]])), names);
  const allReal = (t) => Object.values(t).every((v) => v === 'real');
  const noneReal = (t) => Object.values(t).every((v) => v !== 'real');

  // --- Settings ------------------------------------------------------------
  const sBefore = await types(SETTINGS.filter((n) => n !== 'refreshSearxngHost'));
  checks['settings: handlers are not loaded at boot'] = noneReal(sBefore);
  await page.evaluate(() => openSettingsModal('websearch'));
  await page.waitForTimeout(2500);
  const sAfter = await types(SETTINGS);
  console.log('settings after', JSON.stringify(sAfter));
  checks['settings: every moved handler is real once the window is open'] = allReal(sAfter);
  await page.evaluate(() => openSettingsModal('data'));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('find-duplicates')?.click());
  await page.waitForTimeout(2500);
  const dup = await page.evaluate(() => (document.getElementById('duplicates-result')?.textContent || document.getElementById('find-duplicates')?.parentElement?.textContent || '').trim().slice(0, 80));
  console.log('find duplicates ->', JSON.stringify(dup));
  checks['settings: Find duplicates ran (some text came back)'] = dup.length > 0;
  await page.evaluate(() => {
    const box = document.getElementById('run-budget-tokens');
    if (box) { box.value = '12000'; box.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => closeSettingsModal?.());
  await page.keyboard.press('Escape');

  // --- Command palette ---------------------------------------------------------
  checks['palette: not loaded at boot'] = noneReal(await types(['notesPaletteCommands']));
  await page.evaluate(() => openPalette());
  await page.waitForSelector('#palette-overlay:not(.hidden)', { timeout: 8000 });
  await page.fill('#palette-input', '');
  await page.type('#palette-input', 'manage cat', { delay: 20 });
  await page.waitForTimeout(800);
  const pal = await page.evaluate(() => [...document.querySelectorAll('#palette-list > *')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8));
  console.log('palette rows', JSON.stringify(pal));
  checks['palette: the notes rows draw (Manage categories)'] = pal.some((t) => /Manage categories/i.test(t));
  await page.keyboard.press('Escape');

  // --- Lightbox: the code highlighter -------------------------------------------------
  checks['lightbox: highlighter not loaded at boot'] = noneReal(await types(['highlightCodeInto', 'codeScanner']));
  await page.evaluate(() => ensureModule('lightbox'));
  const lb = await page.evaluate(() => {
    const out = document.createElement('div');
    highlightCodeInto(out, 'const x = 1; // note\nfunction f() { return "s"; }', 'a.js');
    return { spans: out.querySelectorAll('span').length, keyword: out.querySelectorAll('.tok-keyword').length, text: out.textContent.length };
  });
  console.log('highlighter', JSON.stringify(lb));
  checks['lightbox: highlightCodeInto runs and paints keywords'] = lb.keyword > 0 && lb.text > 20;

  // --- The library bundle (Library, Documents, Whiteboard) ------------------------------------
  checks['library bundle: names not loaded at boot'] = noneReal(await types(LIBRARY));
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(3500);
  const lAfter = await types(LIBRARY);
  console.log('library after', JSON.stringify(lAfter));
  checks['library bundle: every moved name is real once the tab is open'] = allReal(lAfter);
  const detail = await page.evaluate(() => {
    showDetailDialog('Lazy sweep', 'The whole record.');
    const ok = [...document.querySelectorAll('.confirm-card, .dialog, [role=dialog]')].some((d) => /The whole record/.test(d.textContent));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return ok;
  });
  checks['library bundle: showDetailDialog shows the text'] = detail;
  await page.evaluate(async () => { await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'A note for the picker, lazy sweep' }) }); });
  const picker = await page.evaluate(async () => {
    const p = pickNotesDialog('Which notes?', { confirmLabel: 'Go' });
    await new Promise((r) => setTimeout(r, 1200));
    const rows = document.querySelectorAll('.note-picker-list li, .note-picker-list .note-picker-row, .entry-pick-list > *').length;
    const cancel = [...document.querySelectorAll('button')].find((b) => /^\s*(Cancel|Close)/i.test(b.textContent));
    cancel?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await Promise.race([p, new Promise((r) => setTimeout(r, 1000))]);
    return rows;
  });
  console.log('notes picker rows', picker);
  checks['library bundle: pickNotesDialog lists notes'] = picker > 0;
  const callout = await page.evaluate(() => { try { return calloutMenuItems('note', false, () => {}).length; } catch (e) { return 'ERR ' + e.message; } });
  console.log('callout items', callout);
  checks['library bundle: calloutMenuItems returns menu items'] = typeof callout === 'number' && callout > 0;

  // --- The "m" chord --------------------------------------------------------------------------
  await page.waitForTimeout(3500);
  await page.evaluate(() => { document.activeElement?.blur?.(); });
  await page.keyboard.press('m');
  await page.waitForTimeout(400);
  const guide = await page.evaluate(() => {
    const el = document.getElementById('chord-guide');
    return { shown: Boolean(el) && !el.classList.contains('hidden'), rows: el ? el.querySelectorAll('.chord-guide-row').length : 0 };
  });
  console.log('chord guide', JSON.stringify(guide));
  checks['chord: m draws the 12-row guide'] = guide.shown && guide.rows === 12;

  checks['zero console / page errors'] = errors.length === 0;
  if (errors.length) console.log('ERRORS', JSON.stringify(errors.slice(0, 8)));
  let ok = true;
  for (const [name, pass] of Object.entries(checks)) { console.log(pass ? 'ok  ' : 'FAIL', name); ok = ok && pass; }
  console.log(ok ? `PASS at ${W}` : `FAIL at ${W}`);
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
