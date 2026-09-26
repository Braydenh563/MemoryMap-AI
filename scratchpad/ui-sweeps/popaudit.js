// uipolish-0924 item C, the rest of the popups sweep: the graph node panel
// (`#graph-popup`) and the whiteboard context bar (`#wb-context`). For each,
// at a desktop width and at a phone width with a coarse pointer:
//
//   inside   the surface lies inside the viewport
//   dead     visible controls whose centre is covered by something else
//            (`elementFromPoint` lands outside the control)
//   small    controls under the hit floor: 24px with a mouse (WCAG 2.5.8),
//            44px under a coarse pointer (the app's own touch floor)
//   out      controls drawn outside the surface's own box
//   sideways the surface scrolls sideways
//   cut      text cut by an ellipsis with no title to read it from
//
//   BASE=http://127.0.0.1:8793 WIDTHS=1440,390 SHOTS=/tmp/x node scratchpad/ui-sweeps/popaudit.js
const { boot } = require('./lib.js');

const WIDTHS = (process.env.WIDTHS || '1440,390').split(',').map(Number);
const ONLY = process.env.ONLY || '';
const SHOTS = process.env.SHOTS || '';
let failures = 0;

function audit([sel, coarse]) {
  const el = document.querySelector(sel);
  if (!el || !el.checkVisibility()) return { hidden: true };
  const r = el.getBoundingClientRect();
  const vw = innerWidth, vh = innerHeight;
  const name = (c) => (c.getAttribute('aria-label') || c.title || c.textContent || c.id || c.className).trim().replace(/\s+/g, ' ').slice(0, 28);
  const ctrls = [...el.querySelectorAll('button, summary, select, input:not([type=hidden]), [role=button], a[href]')]
    .filter((c) => c.checkVisibility() && c.getBoundingClientRect().width > 0);
  const floor = coarse ? 44 : 28;
  const dead = [], small = [], out = [];
  for (const c of ctrls) {
    const q = c.getBoundingClientRect();
    // A native select drawn by the select-menu recipe is a 1px shell behind
    // its `.select-opener`, which is the control and is measured itself.
    if (c.tagName === 'SELECT' && q.width < 4) continue;
    const x = q.left + q.width / 2, y = q.top + q.height / 2;
    if (x >= 0 && y >= 0 && x < vw && y < vh) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(c === hit || c.contains(hit) || hit.closest('label')?.contains(c))) {
        dead.push(`${name(c)} <- ${hit ? (hit.id || hit.className || hit.tagName).toString().slice(0, 30) : 'null'}`);
      }
    }
    const inline = c.matches('input[type=checkbox], input[type=radio], input[type=range], input[type=color]') ||
      (c.tagName === 'SELECT' && q.width < 4);
    if (!inline && Math.min(q.width, q.height) < floor - 0.5) small.push(`${name(c)} ${Math.round(q.width)}x${Math.round(q.height)}`);
    if (q.left < r.left - 0.5 || q.right > r.right + 0.5 || q.top < r.top - 0.5 || q.bottom > r.bottom + 0.5) {
      // A control inside a scrolling part of the surface is allowed to be
      // scrolled out of view; one drawn past the surface's own edge is not.
      const scroller = c.parentElement.closest('*');
      let clipped = false;
      for (let p = c.parentElement; p && p !== el.parentElement; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (/(auto|scroll|hidden)/.test(o.overflowY + o.overflowX) && p !== document.body) { clipped = true; break; }
      }
      if (!clipped || scroller === null) out.push(name(c));
    }
  }
  const cut = [...el.querySelectorAll('*')].filter((t) => t.checkVisibility() && t.children.length === 0 &&
    getComputedStyle(t).textOverflow === 'ellipsis' && t.scrollWidth > t.clientWidth + 1 &&
    !t.title && !t.closest('[title]')).map(name);
  return {
    box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    inside: r.left >= -0.5 && r.top >= -0.5 && r.right <= vw + 0.5 && r.bottom <= vh + 0.5,
    controls: ctrls.length, dead, small, out, cut,
    sideways: el.scrollWidth - el.clientWidth,
  };
}

function report(label, m) {
  const bad = m.hidden || !m.inside || m.dead.length || m.small.length || m.out.length || m.sideways > 0 || m.cut.length;
  if (bad) failures++;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${label}`, JSON.stringify(m));
}

async function graphNode(page, width, coarse) {
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500);
  const opened = await page.evaluate(async () => {
    const list = (typeof allEntries !== 'undefined' ? allEntries : []).filter((e) => !e.binned);
    const e = list[0];
    if (!e) return 'no notes';
    await openGraphPopup({ clientX: 300, clientY: 200, stopPropagation() {} }, { id: e.id, category: e.category });
    return e.id;
  });
  await page.waitForTimeout(1200);
  report(`graph node ${width}${coarse ? ' touch' : ''} (${opened})`, await page.evaluate(audit, ['#graph-popup', coarse]));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/graphnode-${width}.png` });
}

async function wbContext(page, width, coarse) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click('#wb-boards-new');
  await page.waitForTimeout(700);
  await page.fill('.confirm-overlay input[type=text]', `Popup audit ${width}`);
  await page.click('.confirm-overlay .confirm-actions button:last-child');
  await page.waitForTimeout(2500);
  await page.keyboard.press('Escape');
  // One of each kind the bar edits (wbcontextphone.js's set), each selected
  // in turn.
  const made = await page.evaluate(async () => {
    const board = window.currentBoardId;
    const post = async (path, body) => (await api(path, { method: 'POST', body: JSON.stringify(body) })).json();
    const sketch = async (data) => post('/whiteboard/sketches', { board_id: board, data: JSON.stringify(data), x: 0, y: 0 });
    const all = {
      text: ['object', (await post('/whiteboard/objects', { kind: 'text', board_id: board, x: 40, y: 120, width: 200, height: 90, data: { content: 'hello' } })).id],
      image: ['object', (await post('/whiteboard/objects', { kind: 'image', board_id: board, x: 280, y: 120, width: 160, height: 120, data: { url: '/media/none.png' } })).id],
      shape: ['sketch', (await sketch({ d: 'M 40 260 L 240 260 L 240 360 L 40 360 Z', color: '#112233', width: 4, shape: 'rect' })).id],
      arrow: ['sketch', (await sketch({ d: 'M 280 300 L 440 340', color: '#112233', width: 3, shape: 'arrow' })).id],
    };
    await fetchWhiteboardState();
    renderWhiteboard();
    return all;
  });
  await page.waitForTimeout(800);
  for (const [label, [kind, id]] of Object.entries(made)) {
    await page.evaluate(([k, i]) => { wbMultiSelection.clear(); selectWbItem(k, i); }, [kind, id]);
    await page.waitForTimeout(400);
    report(`wb context ${width}${coarse ? ' touch' : ''} ${label}`, await page.evaluate(audit, ['#wb-context', coarse]));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/wbcontext-${width}-${label}.png` });
  }
}

(async () => {
  for (const width of WIDTHS) {
    const coarse = width < 600;
    for (const [label, fn] of [['graph', graphNode], ['wb', wbContext]]) {
      if (ONLY && ONLY !== label) continue;
      const { browser, page } = await boot({ viewport: { width, height: coarse ? 844 : 900 }, hasTouch: coarse, isMobile: coarse });
      try { await fn(page, width, coarse); } catch (e) { failures++; console.log(`FAIL ${label} ${width}: ${e.message.split('\n')[0]}`); }
      await browser.close();
    }
  }
  console.log(failures ? `${failures} failing` : 'all clean');
  process.exitCode = failures ? 1 : 0;
})();
