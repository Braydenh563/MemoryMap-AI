// What moves when a breakpoint moves? (UI_MODERNISATION_PLAN Phase 9, FE-11)
//
// The off-set widths (720, 640, 900) are moving onto Phase 9's four bands
// (599.98/600, 819.98/820, 1099.98/1100). Each move changes the layout only
// between the old width and the new one, so a move is checked by a before and
// after snapshot at widths on both sides of it, and a diff:
//
//   SNAP=before.json WIDTHS=390,620,700,760,800,860,1024,1440 node bands.js
//   ...edit the CSS...
//   SNAP=after.json  ... node bands.js
//   DIFF=before.json,after.json node bands.js
//
// Per width and per surface (the seven tabs, Documents, Settings) it records
// three numbers that say whether a layout is broken, and the box of every
// visible element, keyed by a stable path:
//
//   overflowX   documentElement.scrollWidth - clientWidth (a page that scrolls
//               sideways)
//   offscreen   visible elements past the window's left or right edge with no
//               scrolling or clipping ancestor to hold them
//   header      #top-bar's height (the wrap the 720 group used to force)
//
// The diff prints, per width and surface, any change in those three numbers
// and how many element boxes moved by more than a pixel, with the first few
// paths, so a move that should only touch the 600 to 720 band is seen to
// leave 390 and 1440 identical. Numbers, not screenshots (CLAUDE.md, 5).
const fs = require('fs');

function diff(a, b) {
  const A = JSON.parse(fs.readFileSync(a, 'utf8'));
  const B = JSON.parse(fs.readFileSync(b, 'utf8'));
  let changed = 0;
  for (const key of Object.keys(A)) {
    const x = A[key];
    const y = B[key];
    if (!y) continue; // a sweep of fewer surfaces or widths compares what it has
    const moved = [];
    for (const [p, r] of Object.entries(x.boxes)) {
      const s = y.boxes[p];
      if (!s) { moved.push(p + ' (gone)'); continue; }
      // A taller or shorter header moves everything below it by the same
      // amount; that is one change (the header's), not a thousand.
      const dh = (y.header || 0) - (x.header || 0);
      const same = (d) => r.every((v, i) => Math.abs(v + (i === 1 ? d : 0) - s[i]) <= 1);
      if (!same(0) && !same(dh)) moved.push(`${p} [${r}] -> [${s}]`);
    }
    for (const p of Object.keys(y.boxes)) if (!x.boxes[p]) moved.push(p + ' (new)');
    // IGNORE: a regex of paths whose boxes move on their own between two runs
    // (a relative time that got one character longer, the graph's simulation
    // settling).
    if (process.env.IGNORE) {
      const re = new RegExp(process.env.IGNORE);
      for (let i = moved.length - 1; i >= 0; i -= 1) if (re.test(moved[i])) moved.splice(i, 1);
    }
    const m = ['overflowX', 'offscreen', 'header', 'clipped'].filter((k) => x[k] !== y[k]);
    if (!moved.length && !m.length) continue;
    changed += 1;
    console.log(`${key}: ${m.map((k) => `${k} ${x[k]} -> ${y[k]}`).join(', ') || 'metrics same'}; ${moved.length} boxes moved`);
    if (x.clipped !== y.clipped) {
      for (const p of y.clippedAt || []) if (!(x.clippedAt || []).includes(p)) console.log('    clipped now:', p);
      for (const p of x.clippedAt || []) if (!(y.clippedAt || []).includes(p)) console.log('    clipped no longer:', p);
    }
    for (const line of moved.slice(0, +(process.env.SHOW || 6))) console.log('   ', line.slice(0, 220));
  }
  console.log(changed ? `${changed} width/surface pairs changed` : 'no change at any width');
}

async function snap() {
  const { boot } = require('./lib.js');
  const widths = (process.env.WIDTHS || '390,620,700,760,800,860,1024,1440').split(',').map(Number);
  const surfaces = (process.env.SURFACES || 'dashboard,notes,library,chat,timeline,reminders,graph,documents,settings').split(',');
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const out = {};
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: w < 600 ? 844 : 900 });
    await page.waitForTimeout(400);
    for (const s of surfaces) {
      await page.evaluate(async (s) => {
        try { if (typeof closeSettingsModal === 'function') closeSettingsModal(); } catch (e) {}
        const m = document.getElementById('settings-modal');
        if (m && !m.classList.contains('hidden')) m.classList.add('hidden');
        if (s === 'settings') await openSettingsModal('appearance');
        else await switchTab(s);
      }, s).catch((e) => console.log('switch', s, String(e).slice(0, 80)));
      await page.waitForTimeout(700);
      out[`${w} ${s}`] = await page.evaluate((s) => {
        const vw = document.documentElement.clientWidth;
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return null;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'contents') return null;
          return r;
        };
        const held = (el) => {
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const ox = getComputedStyle(p).overflowX;
            if (ox !== 'visible') return true;
            if (getComputedStyle(p).position === 'fixed') return false;
          }
          return false;
        };
        const keyOf = (el) => {
          const parts = [];
          for (let n = el; n && n !== document.body; n = n.parentElement) {
            if (n.id) { parts.unshift('#' + n.id); break; }
            const sib = [...n.parentElement.children].filter((c) => c.tagName === n.tagName);
            const cls = [...n.classList].slice(0, 2).join('.');
            parts.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : '') + (sib.length > 1 ? ':' + sib.indexOf(n) : ''));
          }
          return parts.join('>');
        };
        const roots = [document.getElementById('top-bar'), document.getElementById('status-bar')];
        if (s === 'settings') roots.push(document.querySelector('#settings-modal .modal-card') || document.getElementById('settings-modal'));
        else roots.push(document.getElementById('tab-' + s));
        const boxes = {};
        let offscreen = 0;
        for (const root of roots.filter(Boolean)) {
          for (const el of [root, ...root.querySelectorAll('*')]) {
            const r = visible(el);
            if (!r) continue;
            if ((r.right > vw + 0.5 || r.left < -0.5) && !held(el)) offscreen += 1;
            boxes[keyOf(el)] = [r.x, r.y, r.width, r.height].map((v) => Math.round(v));
            if (Object.keys(boxes).length > 4000) break;
          }
        }
        // Text cut short: a leaf with words whose content is wider than its
        // box and whose overflow is not visible (an ellipsis or a clip). A
        // band that is too narrow for its layout shows up here first.
        let clipped = 0;
        const clippedAt = [];
        for (const root of roots.filter(Boolean)) {
          for (const el of root.querySelectorAll('*')) {
            if (el.children.length || !el.textContent.trim()) continue;
            if (!visible(el)) continue;
            if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') {
              clipped += 1;
              if (clippedAt.length < 12) clippedAt.push(keyOf(el));
            }
          }
        }
        const bar = document.getElementById('top-bar');
        return {
          clipped,
          clippedAt,
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          offscreen,
          header: bar ? Math.round(bar.getBoundingClientRect().height) : null,
          boxes,
        };
      }, s);
      const o = out[`${w} ${s}`];
      console.log(`${w} ${s}: overflowX ${o.overflowX}, offscreen ${o.offscreen}, clipped ${o.clipped}, header ${o.header}, ${Object.keys(o.boxes).length} boxes`);
    }
  }
  fs.writeFileSync(process.env.SNAP || 'bands.json', JSON.stringify(out));
  await browser.close();
}

if (process.env.DIFF) diff(...process.env.DIFF.split(','));
else snap();
