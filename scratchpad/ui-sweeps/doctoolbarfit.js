// INBOX 426 a and b: every formatting tool reachable, and the suggestions
// panel fitting its own width, measured rather than looked at.
//
// For each width, each toolbar mode (wrap, row) and each layout (the normal
// page, and focus mode with its Tools on): every visible control in
// `#doc-toolbar` lies inside the strip's rect, no two controls' rects
// overlap, and the strip does not scroll sideways. Then the suggestions
// panel docked on the right: its head's buttons inside the panel, no
// sideways scroll; and in focus mode, opened from the floating dock.
//
//   BASE=http://127.0.0.1:8793 node scratchpad/ui-sweeps/doctoolbarfit.js
//   WIDTHS=1024,1280 MODES=row SHOTS=/tmp/x node scratchpad/ui-sweeps/doctoolbarfit.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const WIDTHS = (process.env.WIDTHS || '360,768,1024,1280,1600').split(',').map(Number);
const MODES = (process.env.MODES || 'wrap,row').split(',');
const SHOTS = process.env.SHOTS || '';
let failures = 0;

// Every control in the strip that is drawn, its rect, and the strip's own.
function measure(sel) {
  const bar = document.querySelector(sel);
  if (!bar || !bar.checkVisibility()) return { hidden: true };
  const br = bar.getBoundingClientRect();
  const ctrls = [...bar.querySelectorAll('button, summary, select')]
    .filter((e) => e.checkVisibility() && !e.closest('.doc-dock-menu-list, .select-menu')
      && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none');
  const rects = ctrls.map((e) => ({ name: (e.getAttribute('aria-label') || e.title || e.textContent).trim().slice(0, 24), r: e.getBoundingClientRect() }));
  const outside = rects.filter(({ r }) => r.left < br.left - 0.5 || r.right > br.right + 0.5 || r.top < br.top - 0.5 || r.bottom > br.bottom + 0.5)
    .map((x) => x.name);
  const overlaps = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].r, b = rects[j].r;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 0.5 && h > 0.5) overlaps.push(rects[i].name + ' / ' + rects[j].name);
    }
  }
  const over = bar.querySelectorAll('.doc-toolbar-over').length;
  const more = bar.querySelector('.doc-toolbar-more');
  return {
    controls: rects.length, outside, overlaps,
    sideways: bar.scrollWidth - bar.clientWidth,
    h: Math.round(br.height), w: Math.round(br.width),
    folded: over, more: more ? !more.hidden : null,
  };
}

function prose() {
  const panel = document.getElementById('doc-prose-panel');
  if (!panel || !panel.checkVisibility()) return { hidden: true };
  const pr = panel.getBoundingClientRect();
  const head = panel.querySelector('.doc-prose-head');
  const btns = head ? [...head.querySelectorAll('button')].filter((b) => b.checkVisibility()) : [];
  const cut = btns.filter((b) => {
    const r = b.getBoundingClientRect();
    return r.left < pr.left - 0.5 || r.right > pr.right + 0.5 || b.scrollWidth > b.clientWidth + 1;
  }).map((b) => (b.getAttribute('aria-label') || b.textContent).trim());
  const rows = [...panel.querySelectorAll('.doc-finding-words, .doc-finding-why')];
  const untitled = rows.filter((r) => r.scrollWidth > r.clientWidth + 1 && !r.title).length;
  return {
    w: Math.round(pr.width), sideways: panel.scrollWidth - panel.clientWidth,
    headButtons: btns.length, cut, untitledEllipsised: untitled,
    fixed: getComputedStyle(panel).position === 'fixed',
  };
}

function check(label, m) {
  const bad = !m.hidden && (m.outside.length || m.overlaps.length || m.sideways > 0);
  if (bad) failures++;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${label}`, JSON.stringify(m));
}

(async () => {
  for (const mode of MODES) {
    for (const width of WIDTHS) {
      const { browser, page, ctx } = await boot({ viewport: { width, height: 800 } });
      await page.evaluate((m) => {
        localStorage.setItem('doc-toolbar-mode', m);
        localStorage.setItem('doc-toolbar-mode-migrated-2026-09-09', '1');
        localStorage.setItem('doc-toolbar-collapsed', '0');
        localStorage.setItem('docProseDock', 'right');
        sessionStorage.removeItem('doc-focus');
      }, mode);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 }).catch(() => {});
      if (await page.isVisible('#lock-password').catch(() => false)) {
        await page.fill('#lock-password', 'testpassword123');
        await page.click('#lock-submit');
        await page.waitForTimeout(3000);
      }
      await openDoc(page, {
        title: 'Lecture notes',
        content: '# Lecture notes\n\nxz is teh word  here.\n\n## Key questions\n\n## Summary (three sentences at most, please)\n\n## To follow up\n',
      });
      await page.evaluate(() => setDocView('live'));
      await page.waitForTimeout(600);
      check(`${mode} ${width} normal`, await page.evaluate(measure, '#doc-toolbar'));
      if (width < 600) check(`${mode} ${width} phone bar`, await page.evaluate(measure, '#doc-phone-bar'));
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/tb-${mode}-${width}-normal.png`, clip: { x: 0, y: 0, width, height: 320 } });

      // The suggestions panel, docked right.
      await page.evaluate(() => { const c = document.getElementById('doc-prose'); if (c) c.click(); });
      await page.waitForTimeout(500);
      const p1 = await page.evaluate(prose);
      const p1bad = !p1.hidden && (p1.sideways > 0 || p1.cut.length || p1.untitledEllipsised);
      if (p1bad) failures++;
      console.log(`${p1bad ? 'FAIL' : 'ok  '} ${mode} ${width} suggestions`, JSON.stringify(p1));
      if (SHOTS && mode === MODES[0]) await page.screenshot({ path: `${SHOTS}/prose-${width}-normal.png` });
      await page.evaluate(() => { const c = document.getElementById('doc-prose'); if (c && c.getAttribute('aria-expanded') === 'true') c.click(); });

      // Focus mode, Tools on.
      await page.evaluate(() => toggleDocFocus(true));
      await page.waitForTimeout(400);
      const tools = await page.$('#doc-focus-tools');
      if (tools) {
        if ((await tools.getAttribute('aria-pressed')) !== 'true') await tools.click();
        await page.waitForTimeout(500);
        check(`${mode} ${width} focus+tools`, await page.evaluate(measure, '#doc-toolbar'));
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/tb-${mode}-${width}-focus.png`, clip: { x: 0, y: 0, width, height: 320 } });
      } else {
        failures++;
        console.log(`FAIL ${mode} ${width} focus: no Tools on the floating dock`, JSON.stringify(await page.evaluate(measure, '#doc-toolbar')));
      }
      const fp = await page.$('#doc-focus-prose');
      if (fp) {
        await fp.click();
        await page.waitForTimeout(500);
        const p2 = await page.evaluate(prose);
        const bad = p2.hidden || p2.sideways > 0 || p2.cut.length;
        if (bad) failures++;
        console.log(`${bad ? 'FAIL' : 'ok  '} ${mode} ${width} focus suggestions`, JSON.stringify(p2));
        if (SHOTS && mode === MODES[0]) await page.screenshot({ path: `${SHOTS}/prose-${width}-focus.png` });
      } else {
        failures++;
        console.log(`FAIL ${mode} ${width} focus: no Suggestions on the floating dock`);
      }
      await browser.close();
    }
  }
  console.log(failures ? `${failures} failing` : 'all reachable');
  process.exitCode = failures ? 1 : 0;
})();
