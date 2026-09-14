// INBOX 214: the Timeline's Notes / Boards / Documents / Reminders control.
// It was a `.seg.seg-multi` well of four segments, 441px of a dock row that
// also holds a search box, a view switch and Options, and at 150% browser zoom
// (960 CSS px of window) it ran into them. It is one dropdown now. This
// measures the button, the menu, and that no two children of the dock overlap
// at any of the three widths.
const { boot } = require('./lib.js');

// Every pair of controls in the timeline dock, checked for overlap. Two
// elements overlap when their rects intersect on both axes; a row that has
// wrapped is not an overlap, which is why this compares rects rather than
// counting lines.
async function overlaps(page) {
  return await page.evaluate(() => {
    const dock = document.querySelector('#tab-timeline .dock');
    const kids = [...dock.querySelectorAll('.dock-group > *, .dock-identity')].filter(
      (el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0
    );
    const hits = [];
    for (let i = 0; i < kids.length; i += 1) {
      for (let j = i + 1; j < kids.length; j += 1) {
        const a = kids[i].getBoundingClientRect();
        const b = kids[j].getBoundingClientRect();
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) {
          hits.push(`${kids[i].id || kids[i].className} x ${kids[j].id || kids[j].className}`);
        }
      }
    }
    return {
      children: kids.length,
      overlaps: hits,
      dockH: Math.round(dock.getBoundingClientRect().height),
      pageOverflow: Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)),
    };
  });
}

async function button(page) {
  return await page.evaluate(() => {
    const b = document.getElementById('timeline-kinds-btn');
    const search = document.getElementById('timeline-search');
    const r = (el) => {
      const box = el.getBoundingClientRect();
      return { w: Math.round(box.width), h: Math.round(box.height) };
    };
    return {
      caption: b.textContent.replace(/\s+/g, ' ').trim(),
      ...r(b),
      searchH: r(search).h,
      title: b.title,
    };
  });
}

(async () => {
  // 1440 and 1024 are the two desktop widths this app sweeps; 960 is the
  // window at 150% browser zoom on a 1440 screen, which is the state in the
  // owner's screenshot.
  for (const width of [1440, 1024, 960]) {
    const { browser, page } = await boot({ viewport: { width, height: 900 } });
    await page.evaluate(() => switchTab('timeline'));
    await page.waitForTimeout(2000);
    console.log(`214 button @${width}:`, JSON.stringify(await button(page)));
    console.log(`214 dock @${width}:`, JSON.stringify(await overlaps(page)));

    await page.click('#timeline-kinds-btn');
    await page.waitForTimeout(400);
    console.log(`214 menu @${width}:`, JSON.stringify(await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#timeline-kinds label')];
      return {
        open: document.getElementById('timeline-kinds-menu').open,
        rows: rows.length,
        checked: rows.filter((r) => r.querySelector('input').checked).length,
        keys: rows.map((r) => r.querySelector('input').dataset.timelineKind),
        icons: rows.filter((r) => r.querySelector('i.ph')).length,
        heights: [...new Set(rows.map((r) => Math.round(r.getBoundingClientRect().height)))],
        labels: rows.map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
      };
    })));

    // Ticking one off refetches, the caption changes, and the menu stays open:
    // the whole reason this is a dock menu rather than a kebab.
    const requests = [];
    page.on('request', (r) => { if (r.url().includes('/timeline?')) requests.push(r.url()); });
    await page.click('#timeline-kinds input[data-timeline-kind="board"]');
    await page.waitForTimeout(1800);
    console.log(`214 after a toggle @${width}:`, JSON.stringify(await page.evaluate(() => ({
      open: document.getElementById('timeline-kinds-menu').open,
      caption: document.getElementById('timeline-kinds-label').textContent,
      checked: [...document.querySelectorAll('#timeline-kinds input')].filter((i) => i.checked).length,
      rowKinds: [...new Set([...document.querySelectorAll('#timeline-feed .timeline-row')].map((li) => li.dataset.kind))],
    }))), 'refetched:', requests.some((u) => /kind=/.test(u)));
    await browser.close();
  }
})();
