// What search-boot-1005 moved out of the boot scripts still works when asked for:
//   - the note edit form (note-edit-form.js): not loaded at boot, loaded by the
//     first Edit, and the form draws with its toolbar and fields;
//   - the "m" chord's guide (chord-guide.js): preloaded after boot, draws its 12
//     rows, a second "m" closes it, and a guide that loads AFTER the chord was
//     answered draws nothing (the race the lazy file adds);
//   - Settings' SearXNG block (refreshSearxngHost, in settings-controls.js) paints;
//   - the Settings handlers moved to settings-controls.js exist once it is open.
//   BASE=http://127.0.0.1:8871 SCRATCH=/tmp/x [W=390] node search1005-boot.js
const { boot } = require('./lib.js');

const W = Number(process.env.W || 1440);

(async () => {
  const errors = [];
  const { browser, ctx, page } = await boot({ viewport: { width: W, height: W < 600 ? 800 : 900 } });
  page.on('pageerror', (e) => errors.push(e.message));
  const checks = {};

  // --- the edit form --------------------------------------------------------
  const before = await page.evaluate(() => ({
    form: typeof renderEditForm,
    toolbar: typeof noteEditToolbar,
  }));
  checks['edit form code is not loaded at boot'] = before.form === 'undefined' && before.toolbar === 'undefined';
  const id = await page.evaluate(async () => {
    const note = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'A note to edit, boot sweep' }) });
    await loadEntries();
    return note.id;
  });
  await page.waitForTimeout(800);
  await page.evaluate((noteId) => { switchTab('notes'); return openNoteEditor(noteId); }, id);
  await page.waitForTimeout(1200);
  const form = await page.evaluate(() => ({
    loaded: typeof renderEditForm,
    textarea: Boolean(document.getElementById('entry-edit-content')),
    toolbar: document.querySelectorAll('.note-edit-toolbar [data-md]').length,
    save: [...document.querySelectorAll('#entry-list button')].some((b) => /^\s*Save/.test(b.textContent)),
  }));
  console.log('edit form', JSON.stringify(form));
  checks['the first Edit loads the form and it draws'] = form.loaded === 'function' && form.textarea && form.toolbar > 5 && form.save;
  await page.evaluate(() => closeNoteForm());

  // --- the chord guide --------------------------------------------------------
  await page.waitForTimeout(3500); // app.js preloads it three seconds after boot
  await page.evaluate(() => { document.activeElement?.blur?.(); });
  await page.keyboard.press('m');
  await page.waitForTimeout(300);
  const guide = await page.evaluate(() => {
    const el = document.getElementById('chord-guide');
    return { shown: Boolean(el) && !el.classList.contains('hidden'), rows: el ? el.querySelectorAll('.chord-guide-row').length : 0, loaded: typeof showTabJumpHint };
  });
  console.log('guide', JSON.stringify(guide));
  checks['m draws the guide with its 12 rows'] = guide.shown && guide.rows === 12;
  await page.keyboard.press('m');
  await page.waitForTimeout(200);
  checks['a second m closes it'] = await page.evaluate(() => document.getElementById('chord-guide').classList.contains('hidden'));

  // The race: a fresh page where the guide's file is slow, and the second key
  // comes first. The chord resolves; the late guide must not appear.
  const page2 = await ctx.newPage();
  page2.on('pageerror', (e) => errors.push(e.message));
  await page2.route('**/chord-guide.js*', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page2.goto(process.env.BASE || 'http://127.0.0.1:8781', { waitUntil: 'domcontentloaded' });
  await page2.waitForFunction(() => document.getElementById('lock-overlay')?.classList.contains('hidden') && localStorage.getItem('token'), null, { timeout: 20000 }).catch(() => {});
  await page2.waitForTimeout(1500);
  // Before the 3 s preload: the stand-in is what the first m reaches.
  const standIn = await page2.evaluate(() => typeof chordGuideGroup);
  await page2.evaluate(() => { document.activeElement?.blur?.(); });
  await page2.keyboard.press('m');
  await page2.keyboard.press('d');
  await page2.waitForTimeout(4500);
  const late = await page2.evaluate(() => {
    const el = document.getElementById('chord-guide');
    return { shown: Boolean(el) && !el.classList.contains('hidden'), tab: localStorage.getItem('activeTab') };
  });
  console.log('race (chordGuideGroup before:', standIn + ')', JSON.stringify(late));
  checks['a guide that loads after the chord was answered draws nothing'] = !late.shown;
  await page2.close();

  // --- Settings' moved handlers ---------------------------------------------------
  await page.evaluate(() => openSettingsModal('websearch'));
  await page.waitForTimeout(2500);
  const settings = await page.evaluate(() => ({
    searx: document.getElementById('searxng-host-state')?.textContent?.trim() || '',
    apply: typeof applyBackendChoice,
    ctx: typeof saveModelContextWindow,
    persona: typeof addPersona,
    refresh: typeof refreshSearxngHost,
  }));
  console.log('settings', JSON.stringify(settings));
  checks["Settings' SearXNG block paints a state"] = settings.searx.length > 0;
  checks['the moved Settings handlers exist once the window is open'] =
    settings.apply === 'function' && settings.ctx === 'function' && settings.persona === 'function' && settings.refresh === 'function';

  checks['no page errors'] = errors.length === 0;
  if (errors.length) console.log('ERRORS', JSON.stringify(errors.slice(0, 5)));
  let ok = true;
  for (const [name, pass] of Object.entries(checks)) {
    console.log(pass ? 'ok  ' : 'FAIL', name);
    ok = ok && pass;
  }
  console.log(ok ? `PASS at ${W}` : `FAIL at ${W}`);
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
