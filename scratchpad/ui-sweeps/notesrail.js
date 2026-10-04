// The note connections rail (WORLD_CLASS_PLAN D2), measured at four widths.
//
// At 1440 and 1280 (the rail's widths, NOTES_RAIL_MIN_WIDTH in notes-list.js):
//   1. with no note open there is no rail;
//   2. opening a note (here: `flashEntry`, every route to a note) brings the
//      rail, about that note, with its connection groups; a bare focus no
//      longer opens it (INBOX 432), it only moves a rail already open;
//   3. the rail does not overlap the list or the sidebar, and the reading
//      column (`#entry-list`) keeps at least 600px;
//   4. nothing scrolls sideways;
//   5. arrows walk the rail's rows and Escape goes back to the note;
//   6. a rail row opens its note, and the rail follows it;
//   7. hiding it is remembered across a reload, and the More menu brings it
//      back.
// At 1024 and 390: a note open, and no rail drawn; the note's own menu still
// opens the Connections sheet.
//
// SIDEBAR=collapsed or SIDEBAR=wide first collapses the categories sidebar or
// drags it to its widest (applySidebarWidth at SIDEBAR_MAX, which the app then
// caps at 24% of the window), because the rail's third track is sized against
// whatever the sidebar leaves. THEME=dark (lib.js) runs it dark, where the
// text contrast of the rail's head, subject, headings and cues is measured
// (4.5:1 against the colour actually behind each, walked up the tree).
//
// Every browser is closed before the next width, and one browser at a time
// (the sandbox has run out of memory before).
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/notesrail.js
const { boot } = require('./lib.js');

const WIDTHS = (process.env.WIDTHS || '1440,1280,1024,390').split(',').map(Number);
const results = [];
const check = (label, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

async function state(page) {
  return page.evaluate(() => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
    const rail = document.getElementById('notes-rail');
    const shown = Boolean(rail && !rail.hidden && rail.getBoundingClientRect().width > 0);
    return {
      shown,
      rail: rect(rail),
      list: rect(document.getElementById('entry-list')),
      main: rect(document.querySelector('#tab-notes .layout > .tab-main')),
      sidebar: rect(document.getElementById('sidebar')),
      subject: document.getElementById('notes-rail-subject')?.textContent || '',
      groups: [...document.querySelectorAll('#notes-rail .connection-heading')].map((h) => h.textContent.trim()),
      rows: document.querySelectorAll('#notes-rail button.connection-row').length,
      count: document.getElementById('notes-rail-count')?.textContent || '',
      sideways: document.documentElement.scrollWidth > window.innerWidth,
      railId: typeof notesRailId !== 'undefined' ? notesRailId : null,
    };
  });
}

const overlaps = (a, b) => a && b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

async function openNotes(page) {
  await page.evaluate(() => { try { localStorage.removeItem('notes-rail'); } catch (e) {} switchTab('notes'); showNotesSection('browse'); });
  await page.waitForTimeout(2500);
  const mode = process.env.SIDEBAR;
  if (mode) {
    await page.evaluate((m) => {
      const aside = document.getElementById('sidebar');
      if (m === 'collapsed') {
        if (!aside.classList.contains('sidebar-collapsed')) aside.querySelector('.sidebar-collapse-toggle').click();
      } else if (m === 'wide') {
        applySidebarWidth(aside, 520);
      }
    }, mode);
    await page.waitForTimeout(600);
  }
}

// Contrast of the rail's own text against the first opaque background up the
// tree (a rough WCAG check: enough to catch a token that does not flip).
async function railContrast(page) {
  return page.evaluate(() => {
    const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const bgOf = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c.length < 4 || c[3] > 0.9) return c;
      }
      return [255, 255, 255];
    };
    const worst = [];
    for (const el of document.querySelectorAll('#notes-rail .notes-rail-title, #notes-rail .notes-rail-subject, #notes-rail .connection-heading, #notes-rail button.connection-row, #notes-rail .connection-row-cue, #notes-rail .notes-rail-why')) {
      if (!el.getBoundingClientRect().width) continue;
      const fg = lum(parse(getComputedStyle(el).color));
      const bg = lum(bgOf(el));
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      worst.push([Math.round(ratio * 100) / 100, el.className.split(' ')[0] || el.tagName]);
    }
    worst.sort((a, b) => a[0] - b[0]);
    return worst.slice(0, 3);
  });
}

// A note with links, so the rail has rows to measure: the fixture's notes
// carry about three each.
async function focusLinkedNote(page) {
  return page.evaluate(async () => {
    for (const li of document.querySelectorAll('#entry-list > li[data-id]')) {
      const id = Number(li.dataset.id);
      const c = await apiJson(`/entries/${id}/connections`, { silent: true }).catch(() => null);
      if (c && (c.outgoing.length + c.incoming.length) >= 2) {
        flashEntry(id);
        li.focus();
        return id;
      }
    }
    return null;
  });
}

(async () => {
  for (const width of WIDTHS) {
    const phone = width < 600;
    const { browser, page } = await boot({ viewport: { width, height: phone ? 844 : 900 }, hasTouch: phone || undefined, isMobile: phone || undefined });
    try {
      await openNotes(page);
      const s0 = await state(page);
      const wide = width >= 1280;
      if (wide) check(`${width}: no rail before a note is open`, !s0.shown, `shown ${s0.shown}`);
      const id = await focusLinkedNote(page);
      await page.waitForTimeout(1500);
      const s1 = await state(page);
      if (!wide) {
        check(`${width}: no rail below 1280, with a note selected`, id != null && !s1.shown, `note ${id}, shown ${s1.shown}`);
        const sheet = await page.evaluate(async (nid) => {
          const entry = allEntries.find((e) => e.id === nid);
          await openConnections('entries', nid, entry.title || '');
          const o = document.getElementById('connections-overlay');
          const r = { open: !o.classList.contains('hidden'), rows: o.querySelectorAll('button.connection-row').length };
          o.classList.add('hidden');
          return r;
        }, id);
        check(`${width}: the Connections sheet still opens there`, sheet.open && sheet.rows > 0, JSON.stringify(sheet));
        check(`${width}: nothing scrolls sideways`, !s1.sideways);
        if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/notesrail-${width}.png` });
        continue;
      }
      //: A sidebar dragged wide can leave too little room: then the rail must
      //: give way (to the sheet) rather than squeeze the list under 600px.
      const cramped = await page.evaluate(() => document.getElementById('notes-rail').dataset.cramped === '1');
      if (cramped) {
        check(`${width}: with too little room the rail gives way, and the list keeps its width`, !s1.shown && s1.list && s1.list.w >= 600, `list ${s1.list && s1.list.w}px, rail shown ${s1.shown}`);
        check(`${width}: nothing scrolls sideways`, !s1.sideways);
        await page.evaluate(() => applySidebarWidth(document.getElementById('sidebar'), 260));
        await page.waitForTimeout(1200);
        const s1b = await state(page);
        check(`${width}: narrowing the sidebar again brings the rail back`, s1b.shown && s1b.list.w >= 600, `list ${s1b.list && s1b.list.w}px, rail shown ${s1b.shown}`);
        continue;
      }
      check(`${width}: selecting a linked note brings the rail`, s1.shown && s1.railId === id && s1.rows >= 2,
        `note ${id}, rail ${s1.shown}, ${s1.rows} rows, groups ${s1.groups.join(' | ')}, chip "${s1.count}"`);
      check(`${width}: the rail sits beside the list, overlapping neither it nor the sidebar`,
        s1.rail && !overlaps(s1.rail, s1.list) && !overlaps(s1.rail, s1.main) && !overlaps(s1.rail, s1.sidebar),
        `rail ${JSON.stringify(s1.rail)} list ${JSON.stringify(s1.list)}`);
      check(`${width}: the reading column keeps at least 600px`, s1.list && s1.list.w >= 600, `${s1.list && s1.list.w}px`);
      check(`${width}: nothing scrolls sideways`, !s1.sideways);
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/notesrail-${width}${process.env.SIDEBAR ? '-' + process.env.SIDEBAR : ''}${process.env.THEME === 'dark' ? '-dark' : ''}.png` });

      // Two rows with the same title carry different cues (connectionRowCues).
      const dupes = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('#notes-rail .connection-group:not(.notes-rail-near) button.connection-row')];
        const byTitle = new Map();
        for (const r of rows) {
          const cue = r.querySelector('.connection-row-cue')?.textContent || '';
          const title = r.textContent.replace(cue, '').trim();
          if (!byTitle.has(title)) byTitle.set(title, []);
          byTitle.get(title).push({ id: r.title, cue });
        }
        const clashes = [...byTitle.entries()].filter(([, v]) => v.length > 1);
        const bad = clashes.filter(([, v]) => new Set(v.map((x) => x.cue)).size < v.length || v.some((x) => !x.cue));
        return { clashes: clashes.map(([t, v]) => `${t}: ${v.map((x) => x.cue).join(' / ')}`), bad: bad.length };
      });
      check(`${width}: rows with the same title can be told apart`, dupes.bad === 0, dupes.clashes.join('; ') || 'no same-title rows here');

      const fit = await page.evaluate(() => {
        const head = document.querySelector('#notes-rail .notes-rail-head');
        const title = head.querySelector('.notes-rail-title').getBoundingClientRect();
        const close = document.getElementById('notes-rail-close').getBoundingClientRect();
        const spill = [...document.querySelectorAll('#notes-rail .connection-row-cue')].filter((c) => {
          const row = c.closest('button').getBoundingClientRect();
          return c.getBoundingClientRect().right > row.right + 0.5;
        }).length;
        return { oneRow: Math.abs(title.top + title.height / 2 - (close.top + close.height / 2)) < 4, spill };
      });
      check(`${width}: the rail's head is one row and no cue runs past its row`, fit.oneRow && fit.spill === 0, JSON.stringify(fit));

      const contrast = await railContrast(page);
      check(`${width}: the rail's text is at least 4.5:1 against what is behind it`, contrast.length && contrast[0][0] >= 4.5, JSON.stringify(contrast));

      // Keys: into the rail, down one row, Escape back to the note.
      const keys = await page.evaluate(async () => {
        const rows = [...document.querySelectorAll('#notes-rail button.connection-row')];
        rows[0].focus();
        rows[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        const second = document.activeElement === rows[1];
        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        const back = document.activeElement?.closest?.('#entry-list li[data-id]')?.dataset.id;
        return { second, back };
      });
      check(`${width}: ArrowDown walks the rail's rows and Escape goes back to the note`, keys.second && Number(keys.back) === id, JSON.stringify(keys));

      // A row opens its note and the rail follows.
      const target = await page.evaluate(() => {
        const row = document.querySelector('#notes-rail .connection-group button.connection-row');
        const label = row.textContent.trim();
        row.click();
        return label;
      });
      await page.waitForTimeout(2500);
      const s2 = await state(page);
      check(`${width}: a rail row opens its note, and the rail follows it`, s2.shown && s2.railId !== id && s2.railId === (await page.evaluate(() => lastOpenedEntryId)),
        `from ${id} to ${s2.railId} ("${target.slice(0, 40)}")`);

      // Hide, reload, still hidden; More menu brings it back.
      await page.click('#notes-rail-close');
      await page.waitForTimeout(400);
      const hid = await state(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 }).catch(() => {});
      if (await page.isVisible('#lock-password').catch(() => false)) {
        await page.fill('#lock-password', 'testpassword123');
        await page.click('#lock-submit');
        await page.waitForTimeout(3000);
      }
      await page.evaluate(() => { switchTab('notes'); showNotesSection('browse'); });
      await page.waitForTimeout(2500);
      await focusLinkedNote(page);
      await page.waitForTimeout(1200);
      const afterReload = await state(page);
      check(`${width}: hiding it is remembered across a reload`, !hid.shown && !afterReload.shown, `after hide ${hid.shown}, after reload ${afterReload.shown}`);
      await page.evaluate(() => { document.getElementById('notes-more-menu').open = true; });
      const label = await page.evaluate(() => document.getElementById('notes-rail-toggle').textContent.trim());
      await page.click('#notes-rail-toggle');
      await page.waitForTimeout(1200);
      const back = await state(page);
      check(`${width}: the More menu brings it back`, /Connections beside an open note/.test(label) && back.shown, `menu said "${label}", shown ${back.shown}`);
    } finally {
      await browser.close();
    }
  }
  const failed = results.filter((x) => !x).length;
  console.log(`${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
