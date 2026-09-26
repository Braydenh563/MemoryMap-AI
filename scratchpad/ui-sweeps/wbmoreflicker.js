// INBOX 419, second half: "clicking the meatball button on the popup tools
// menu when selected on a text box or sticky note on the whiteboard doesnt
// show any dropdown menu, or it flickers for a sec somewhere to the right
// then disappears". Reported from the desktop window (WebView2).
//
// The earlier probes read the context bar's More menu once, 350ms after the
// click. A flicker is a thing over time, so this samples the menu every 40ms
// for 1.6s after a real click on the ⋯, for a sticky and for a text box, each
// selected and each being edited, with the pointer resting on the ⋯ and then
// moving toward the menu. Every sample must be: open, on top at its own
// middle, and at the same place as the first (no drift of more than 1px).
//
// SCROLLBARS=1 DSF=1.25 to draw real scrollbars at a Windows laptop's scale;
// SIZES as in wbmenuroom.js.
//
//   BASE=http://127.0.0.1:8797 SCROLLBARS=1 DSF=1.25 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/wbmoreflicker.js
const { boot } = require('./lib.js');

const SIZES = (process.env.SIZES || '1440x900,1184x760,1280x640').split(',').map((s) => s.split('x').map(Number));
const results = [];
const check = (label, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

(async () => {
  for (const [vw, vh] of SIZES) {
    const { browser, page } = await boot({ viewport: { width: vw, height: vh }, deviceScaleFactor: Number(process.env.DSF || 1) });
    await page.click('[data-tab="library"]');
    await page.waitForTimeout(500);
    await page.click('[data-target="library-view-whiteboard"]');
    await page.waitForTimeout(700);
    const ids = await page.evaluate(async () => {
      const b = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'More flicker ' + Date.now() }) });
      await openWhiteboardBoard(b.id);
      const mk = (x, data) => apiJson('/whiteboard/objects', { method: 'POST', body: JSON.stringify({ kind: 'text', board_id: b.id, x, y: 240, width: 220, height: 120, data }) });
      const sticky = await mk(160, { content: 'A sticky', bg: '#fff4a3', border_color: '#e8d56a', color: '#2a2a1f', font_size: 16 });
      const text = await mk(520, { content: 'A text box' });
      await fetchWhiteboardState();
      renderWhiteboardNow();
      return { sticky: sticky.id, text: text.id };
    });
    await page.waitForTimeout(700);
    for (const [kind, id] of Object.entries(ids)) {
      for (const editing of [false, true]) {
        await page.keyboard.press('Escape');
        await page.mouse.click(5, vh - 5);
        await page.waitForTimeout(200);
        const box = await (await page.$(`.wb-object[data-id="${id}"]`)).boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        if (editing) await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(400);
        const t = await page.evaluate(() => {
          const btn = document.querySelector('#wb-context [aria-controls="wb-context-menu"]');
          if (!btn) return null;
          const r = btn.getBoundingClientRect();
          return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
        });
        const tag = `${vw}x${vh} ${kind}${editing ? ' (editing)' : ''}`;
        if (!t) { check(`${tag}: the context bar has a More button`, false); continue; }
        await page.mouse.click(t.x, t.y);
        const samples = [];
        for (let i = 0; i < 40; i++) {
          if (i === 20) await page.mouse.move(t.x, t.y + 60, { steps: 6 });
          samples.push(await page.evaluate(() => {
            const menu = document.getElementById('wb-context-menu');
            const r = menu.getBoundingClientRect();
            const at = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(20, r.height / 2)) : null;
            return { open: !menu.classList.contains('hidden') && r.height > 0, onTop: Boolean(at && menu.contains(at)), x: Math.round(r.left), y: Math.round(r.top), inside: r.right <= window.innerWidth && r.bottom <= window.innerHeight && r.left >= 0 && r.top >= 0 };
          }));
          await page.waitForTimeout(40);
        }
        const first = samples[0];
        const closed = samples.filter((s) => !s.open).length;
        const hidden = samples.filter((s) => s.open && !s.onTop).length;
        const drift = Math.max(...samples.map((s) => Math.abs(s.x - first.x) + Math.abs(s.y - first.y)));
        const outside = samples.filter((s) => s.open && !s.inside).length;
        check(`${tag}: open for all 40 samples`, closed === 0, `${closed} closed`);
        check(`${tag}: on top for every sample`, hidden === 0, `${hidden} covered`);
        check(`${tag}: stays where it opened`, drift <= 1, `drift ${drift}px, at ${first.x},${first.y}`);
        check(`${tag}: inside the window`, outside === 0, `${outside} outside`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
      }
    }
    await browser.close();
  }
  const failed = results.filter((x) => !x).length;
  console.log(`${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
