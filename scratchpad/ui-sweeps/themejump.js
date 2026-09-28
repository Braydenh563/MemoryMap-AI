// INBOX 426 (u): "when I try to look at the theme and colour section in the
// appearance settings page it auto scroll jumps". Opens Appearance with the
// Themes and Theme & colour folds open, brings each control into the middle
// of the pane, presses it, and records where the pressed control is on
// screen before and after, and the pane's scrollTop, frame by frame for a
// second. A control that moves under the pointer when pressed is the jump.
//
//   BASE=http://127.0.0.1:8793 THEME=dark node scratchpad/ui-sweeps/themejump.js
const { boot } = require('./lib.js');

const TARGETS = (process.env.TARGETS || [
  '#theme-presets button', '#palette-grid button', '#theme-seg button', '#accent-swatches button',
  '#bg-art-style', '#settings-appearance summary',
].join(';')).split(';');

(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.evaluate(() => localStorage.setItem('settingsFolds', JSON.stringify({ 'appearance-themes': true, 'appearance-colour': true, 'appearance-background': true })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  if (await page.isVisible('#lock-password').catch(() => false)) {
    await page.fill('#lock-password', 'testpassword123');
    await page.click('#lock-submit');
  }
  await page.waitForTimeout(3000);
  await page.evaluate(() => openSettingsModal('appearance'));
  await page.waitForTimeout(1500);
  let bad = 0;
  for (const sel of TARGETS) {
    const n = await page.evaluate((s) => document.querySelectorAll(s).length, sel);
    for (let i = 0; i < Math.min(n, 3); i++) {
      const before = await page.evaluate(([s, k]) => {
        const el = document.querySelectorAll(s)[k];
        const pane = document.querySelector('#settings-modal .modal-content');
        const r0 = el.getBoundingClientRect(), p = pane.getBoundingClientRect();
        pane.scrollTop += r0.top - (p.top + p.height / 2);
        const r = el.getBoundingClientRect();
        window.__tj = [];
        const tick = () => { window.__tj.push(pane.scrollTop); if (window.__tj.length < 90) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
        return { top: Math.round(r.top), x: r.left + r.width / 2, y: r.top + r.height / 2, scroll: Math.round(pane.scrollTop), vis: el.checkVisibility() };
      }, [sel, i]);
      if (!before.vis) continue;
      await page.mouse.click(before.x, before.y);
      await page.waitForTimeout(1600);
      const after = await page.evaluate(([s, k]) => {
        const el = document.querySelectorAll(s)[k];
        const pane = document.querySelector('#settings-modal .modal-content');
        const tj = window.__tj;
        const moves = tj.slice(1).map((v, j) => Math.round(v - tj[j])).filter((d) => d);
        return { top: el ? Math.round(el.getBoundingClientRect().top) : null, scroll: Math.round(pane.scrollTop), moves, focus: document.activeElement?.id || document.activeElement?.tagName };
      }, [sel, i]);
      const moved = after.top === null ? 'gone' : after.top - before.top;
      const jump = moved === 'gone' || Math.abs(moved) > 2;
      if (jump) bad++;
      console.log(`${jump ? 'JUMP' : 'ok  '} ${sel}[${i}] moved ${moved}px, scroll ${before.scroll} -> ${after.scroll}, frames ${JSON.stringify(after.moves.slice(0, 8))}, focus ${after.focus}`);
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(200);
      if (!(await page.isVisible('#settings-modal'))) {
        await page.evaluate(() => openSettingsModal('appearance'));
        await page.waitForTimeout(800);
      }
    }
  }
  console.log(bad ? `${bad} jumps` : 'no jumps');
  await browser.close();
})();
