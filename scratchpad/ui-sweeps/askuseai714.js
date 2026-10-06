// INBOX 714 part 2: the Ask header's "Use AI" switch row.
//
//   bash scratchpad/ui-sweeps/serve.sh 8852 /tmp/mm-714
//   BASE=http://127.0.0.1:8852 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers THEME=light SCRATCH=/tmp/x node scratchpad/ui-sweeps/askuseai714.js
//
// At 1440 and 390: the row's height against --control-h and the History
// button, its centre line against the header's other controls, the switch's own
// size (not clipped, not the 28px slab), no model running: off, disabled, with
// its reason as the tooltip; with a model "running" (aiIsOff stubbed): on by
// default, a click stores "notes", another stores "ai", and the request carries
// the choice. No horizontal overflow, no console error.
const { boot } = require('./lib.js');

async function run(width) {
  const { page, browser } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(width < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  const findings = [];
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(600);
  await page.evaluate(() => showNotesSection('ask'));
  await page.waitForTimeout(4000); // ask-compose.js is preloaded 3 s after boot

  const geo = await page.evaluate(() => {
    const row = document.getElementById('ask-use-ai-row');
    const box = document.getElementById('ask-use-ai');
    const cs = getComputedStyle(row);
    const r = row.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const ctl = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--control-h')) || null;
    const probe = document.createElement('div');
    probe.style.height = 'var(--control-h)';
    document.body.appendChild(probe);
    const controlH = probe.getBoundingClientRect().height;
    probe.remove();
    const cy = (el) => { const q = el.getBoundingClientRect(); return +((q.top + q.bottom) / 2).toFixed(1); };
    const hist = document.getElementById('ask-history-toggle');
    const help = document.querySelector('[data-help-for="ask-source-help"]');
    const sel = document.getElementById('ask-feature-model');
    return {
      rowH: +r.height.toFixed(1), rowW: +r.width.toFixed(1), rowCy: cy(row), controlH,
      boxW: +b.width.toFixed(1), boxH: +b.height.toFixed(1), boxCy: cy(box), boxPos: getComputedStyle(box).position, appearance: getComputedStyle(box).appearance,
      histH: +hist.getBoundingClientRect().height.toFixed(1), histCy: cy(hist),
      helpCy: cy(help), helpH: +help.getBoundingClientRect().height.toFixed(1),
      selCy: sel.offsetParent ? cy(sel) : null,
      sameLine: Math.abs(row.getBoundingClientRect().top - hist.getBoundingClientRect().top) < r.height,
      checked: box.checked, disabled: box.disabled, title: row.title, color: cs.color, wired: box.dataset.wired, ctl,
      overflowX: document.scrollingElement.scrollWidth > innerWidth, right: Math.round(r.right), vw: innerWidth,
    };
  });
  console.log(`[${width}] geometry`, JSON.stringify(geo));
  if (geo.wired !== '1') findings.push('switch never wired (ask-compose.js not loaded)');
  if (Math.abs(geo.rowH - geo.histH) > 1) findings.push(`row ${geo.rowH}px, History ${geo.histH}px (--control-h ${geo.controlH}px)`);
  if (geo.sameLine && Math.abs(geo.rowCy - geo.histCy) > 1) findings.push(`row centre ${geo.rowCy} vs History ${geo.histCy}`);
  if (geo.sameLine && Math.abs(geo.rowCy - geo.helpCy) > 1) findings.push(`row centre ${geo.rowCy} vs '?' ${geo.helpCy}`);
  if (Math.abs(geo.boxCy - geo.rowCy) > 1) findings.push(`switch centre ${geo.boxCy} vs row ${geo.rowCy}`);
  if (geo.boxW < 30 || geo.boxW > 34 || geo.boxH < 17 || geo.boxH > 20) findings.push(`switch is ${geo.boxW}x${geo.boxH}`);
  if (geo.appearance !== 'none') findings.push('switch is the native checkbox');
  if (geo.overflowX || geo.right > geo.vw) findings.push('overflows the window');
  if (geo.checked || !geo.disabled || !/No model is running/.test(geo.title)) findings.push('no model: expected off, disabled, with its reason');

  const toggle = await page.evaluate(async () => {
    const real = window.aiIsOff;
    window.aiIsOff = () => false;
    renderAskUseAi();
    const box = document.getElementById('ask-use-ai');
    const out = { enabledOn: !box.disabled && box.checked, defaultStored: localStorage.getItem('ask-answer-from') };
    box.click();
    out.afterOff = [localStorage.getItem('ask-answer-from'), box.checked];
    box.click();
    out.afterOn = [localStorage.getItem('ask-answer-from'), box.checked];
    box.click();
    window.aiIsOff = real;
    out.stored = localStorage.getItem('ask-answer-from');
    renderAskUseAi();
    return out;
  });
  console.log(`[${width}] toggle`, JSON.stringify(toggle));
  if (!toggle.enabledOn) findings.push('with a model: expected on and enabled');
  if (toggle.afterOff.join() !== 'notes,false' || toggle.afterOn.join() !== 'ai,true') findings.push('the switch does not store the choice');

  // The request carries the choice (the stored "notes" with a model "running").
  const sent = [];
  page.on('request', (r) => { if (r.url().endsWith('/chat/stream')) sent.push(JSON.parse(r.postData() || '{}')); });
  await page.fill('#question', 'What is the Harbor launch plan?');
  await page.click('#ask-btn');
  await page.waitForTimeout(2500);
  const body = sent[sent.length - 1] || {};
  console.log(`[${width}] request`, JSON.stringify({ notes_only: body.notes_only, answer_from: body.answer_from }));
  if (body.answer_from !== 'notes') findings.push(`request answer_from ${body.answer_from}`);

  if (process.env.SCRATCH) {
    const head = await page.$('#ask > .row.space-between');
    await head.screenshot({ path: `${process.env.SCRATCH}/askuseai714-${process.env.THEME || 'light'}-${width}.png` });
  }
  console.log(`[${width}] errors: ${errors.length ? errors.filter((e) => !/resetMeetingUI/.test(e)).join(' | ') || 'none (resetMeetingUI aside)' : 'none'}`);
  console.log(`[${width}] findings: ${findings.length ? '\n  ' + findings.join('\n  ') : 'none'}`);
  await browser.close();
  return findings.length;
}
(async () => { let bad = 0; for (const w of [1440, 390]) bad += await run(w); process.exit(bad ? 1 : 0); })();
