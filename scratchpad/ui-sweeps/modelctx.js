// The per-model context window box in Settings > Models.
//
// Asked for (INBOX 77): "the window itself should be manageable by the user
// and auto when set ... a `num_ctx` preference per model in Settings > Models
// with Auto (the model file's value) or a number, sent on every request".
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node modelctx.js
//
// Three things have to be true and none of them is visible in a screenshot:
// the box is on the screen and on the same control height as its neighbours,
// a number typed into it reaches preferences, and clearing it puts that model
// back on auto rather than leaving a zero behind.
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  await page.evaluate(() => openSettingsModal("models"));
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#settings-nav button, [data-section]')]
      .find((e) => (e.dataset.section || '') === 'models');
    if (b) b.click();
  });
  await page.waitForTimeout(1200);

  // The group the box lives in is hidden until a model backend answers, and
  // this sandbox has none: the shell's decision, not the control's. Shown here
  // so the control itself can be measured; what is under test is the box.
  await page.evaluate(() => document.getElementById('models-config')?.classList.remove('hidden'));
  await page.waitForTimeout(300);
  const shape = await page.evaluate(() => {
    const box = document.getElementById('model-context-window');
    const row = document.getElementById('model-context-row');
    const note = document.getElementById('model-context-note');
    if (!box || !row) return null;
    const r = box.getBoundingClientRect();
    // The heights of the other controls in the same group, so "on the same
    // scale as its neighbours" is a number rather than an impression.
    const siblings = [...document.querySelectorAll('#models-config select, #models-config button:not(.icon-only)')]
      .filter((e) => e.getBoundingClientRect().height > 0)
      .map((e) => Math.round(e.getBoundingClientRect().height));
    return {
      h: Math.round(r.height),
      w: Math.round(r.width),
      siblingHeights: [...new Set(siblings)],
      disabled: box.disabled,
      value: box.value,
      note: (note && note.textContent) || '',
      placeholder: box.placeholder,
    };
  });
  if (!shape) { console.log('FAIL: no context window box on the Models screen'); await browser.close(); process.exit(1); }
  console.log(`box           ${shape.w}x${shape.h}px, placeholder "${shape.placeholder}", disabled=${shape.disabled}`);
  console.log(`siblings      ${shape.siblingHeights.join(', ')}px`);
  console.log(`note          "${shape.note}"`);

  // The round trip, driven through the control itself rather than the API, so
  // what is proved is the wiring and not the route.
  const trip = await page.evaluate(async () => {
    const box = document.getElementById('model-context-window');
    // The box edits whichever chat model is selected; with no backend running
    // there may be none, so name one the way the app would.
    if (!modelContextModel) modelContextModel = 'sweep-model';
    box.disabled = false;
    box.value = '16384';
    box.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 900));
    const saved = await apiJson('/preferences');
    box.value = '';
    box.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 900));
    const cleared = await apiJson('/preferences');
    return {
      set: saved.model_context_windows && saved.model_context_windows[modelContextModel],
      cleared: cleared.model_context_windows && cleared.model_context_windows[modelContextModel],
      model: modelContextModel,
    };
  });
  console.log(`round trip    ${trip.model}: typed 16384 -> stored ${JSON.stringify(trip.set)}; cleared -> ${JSON.stringify(trip.cleared)}`);
  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);

  const bad = [];
  if (shape.h < 28) bad.push(`the box is ${shape.h}px tall`);
  if (shape.siblingHeights.length && !shape.siblingHeights.includes(shape.h)) {
    bad.push(`the box is ${shape.h}px beside siblings at ${shape.siblingHeights.join('/')}px`);
  }
  if (trip.set !== 16384) bad.push(`typing 16384 stored ${JSON.stringify(trip.set)}`);
  if (trip.cleared !== null) bad.push(`clearing the box stored ${JSON.stringify(trip.cleared)} rather than null`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS: the box is on the scale, a number round-trips, and clearing means auto');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
