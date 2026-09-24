// INBOX 407, the owner: "there is no reset the graph settings to default
// option either". Drives the options panel's "Reset to defaults" the way a
// person would: change a spread of settings (layout, colour, physics, three
// Show switches, the similarity cutoff, a hidden category, the minimap),
// press Reset, read every control and its stored value back, then press the
// toast's Undo and read them again. Also measures the panel itself with
// Similarity on (the Strength row is visible only then), since the
// panel has a height cap it has been pushed past before.
//
//   BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphreset.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser, OUT } = await boot({ viewport: { width: 1440, height: 900 } });
  const theme = process.env.THEME || 'light';
  const findings = [];
  const check = (ok, what) => { if (!ok) findings.push(what); };
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => setGraphOptionsOpen(true));
  await page.waitForTimeout(300);

  const read = () =>
    page.evaluate(() => ({
      controls: graphCaptureSettings(),
      stored: {
        layout: localStorage.getItem('graph-layout'),
        colour: localStorage.getItem('graph-colour'),
        gravity: localStorage.getItem('graph-gravity'),
        curved: localStorage.getItem('graph-curved'),
        nebula: localStorage.getItem('graph-nebula'),
        simMin: localStorage.getItem('graph-similarity-min'),
        corner: localStorage.getItem('graph-minimap-corner'),
      },
      simRowShown: !document.getElementById('graph-similarity-min-row').classList.contains('hidden'),
    }));

  // A spread of changes, each through its own control and event.
  await page.evaluate(async () => {
    const fire = (id, value, type = 'change') => {
      const el = document.getElementById(id);
      if (el.type === 'checkbox') el.checked = value;
      else el.value = value;
      el.dispatchEvent(new Event(type, { bubbles: true }));
    };
    const radio = document.querySelector('input[name="graph-layout"][value="radial"]');
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    fire('graph-colour', 'age');
    fire('graph-gravity', '90');
    fire('graph-similarity', true);
    fire('graph-similarity-min', '70');
    fire('graph-curved', true);
    fire('graph-nebula', false);
    fire('graph-labels', false);
    fire('graph-minimap-corner', 'br');
    graphHiddenCategories.add('Travel');
    renderGraph();
    await new Promise((r) => setTimeout(r, 2500));
  });
  const changed = await read();
  check(changed.controls.layout === 'radial', `layout did not change: ${changed.controls.layout}`);
  check(changed.simRowShown, 'Strength row hidden with Similarity on');

  // The panel with Similarity on: its own box against its content.
  const panel = await page.evaluate(() => {
    const el = document.getElementById('graph-options');
    const r = el.getBoundingClientRect();
    const reset = document.getElementById('graph-options-reset').getBoundingClientRect();
    const row = document.getElementById('graph-similarity-min-row').getBoundingClientRect();
    // Nothing in the Show grid past the panel's edge, and no row's words cut.
    const inner = el.getBoundingClientRect().right;
    const controls = [...el.querySelectorAll('#graph-toggle-group input')];
    const pastEdge = controls.filter((c) => c.getBoundingClientRect().right > inner + 0.5).map((c) => c.id);
    const clipped = [...el.querySelectorAll('.graph-option-row > span, .graph-option-row > label')]
      .filter((w) => w.offsetParent && w.scrollWidth > w.clientWidth + 0.5)
      .map((w) => w.textContent.trim());
    return {
      pastEdge, clipped,
      height: Math.round(r.height), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
      resetH: Math.round(reset.height), resetW: Math.round(reset.width), rowH: Math.round(row.height),
      resetInPanel: reset.bottom <= r.bottom + 0.5 || el.scrollHeight > el.clientHeight,
    };
  });
  console.log('panel', JSON.stringify(panel));
  check(!panel.pastEdge.length, `Show controls past the panel's edge: ${panel.pastEdge}`);
  check(!panel.clipped.length, `row words cut: ${panel.clipped}`);
  check(panel.scrollHeight <= panel.clientHeight, `panel scrolls: ${panel.scrollHeight} in ${panel.clientHeight}`);
  await page.evaluate(() => {
    const el = document.getElementById('graph-options');
    el.scrollTop = el.scrollHeight;
  });
  await page.screenshot({ path: `${OUT}/graphreset-panel-${theme}.png` });

  await page.click('#graph-options-reset');
  await page.waitForTimeout(2500);
  const reset = await read();
  const toastText = await page.evaluate(() => [...document.querySelectorAll('#toast-box .toast')].map((t) => t.textContent.trim()).pop() || '');
  const equal = await page.evaluate(() => graphSettingsEqual(graphCaptureSettings(), GRAPH_DEFAULTS));
  check(equal, `controls not on defaults after reset: ${JSON.stringify(reset.controls)}`);
  check(reset.stored.layout === 'force', `layout stored ${reset.stored.layout}`);
  check(reset.stored.colour === 'category', `colour stored ${reset.stored.colour}`);
  check(reset.stored.gravity === '50', `gravity stored ${reset.stored.gravity}`);
  check(reset.stored.curved === '0' && reset.stored.nebula === '1', 'curved/nebula not stored');
  check(reset.stored.simMin === '55', `similarity cutoff stored ${reset.stored.simMin}`);
  check(reset.stored.corner === 'tl', `minimap corner stored ${reset.stored.corner}`);
  check(!reset.simRowShown, 'Strength row still shown with Similarity off');
  check(/reset to defaults/i.test(toastText) && /undo/i.test(toastText), `toast: ${toastText}`);
  const drawnAfterReset = await page.evaluate(() => ({ layout: gcTab.layoutKind, similar: gcTab.edges.filter((e) => e.kind === 'similar').length }));
  check(drawnAfterReset.layout === 'force' && drawnAfterReset.similar === 0, `map after reset: ${JSON.stringify(drawnAfterReset)}`);
  await page.screenshot({ path: `${OUT}/graphreset-after-${theme}.png` });

  // Undo, from the toast's own button.
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('#toast-box .toast button')].find((b) => /undo/i.test(b.textContent));
    button.click();
  });
  await page.waitForTimeout(2500);
  const undone = await read();
  check(JSON.stringify(undone.controls) === JSON.stringify(changed.controls),
    `undo did not restore: ${JSON.stringify(undone.controls)} vs ${JSON.stringify(changed.controls)}`);
  check(undone.stored.layout === 'radial' && undone.stored.simMin === '70', `undo storage: ${JSON.stringify(undone.stored)}`);

  // A second press of Reset on defaults says so rather than offering an Undo.
  // (The Undo press was outside the panel, which closes it: open it again.)
  await page.evaluate(() => setGraphOptionsOpen(true));
  await page.click('#graph-options-reset');
  await page.waitForTimeout(1500);
  await page.evaluate(() => setGraphOptionsOpen(true));
  await page.click('#graph-options-reset');
  await page.waitForTimeout(600);
  const second = await page.evaluate(() => [...document.querySelectorAll('#toast-box .toast')].map((t) => t.textContent.trim()).pop() || '');
  check(/already/i.test(second), `second reset toast: ${second}`);

  console.log('findings', findings.length ? findings : 'none');
  await browser.close();
})();
