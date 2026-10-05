// A note-meta fact turned to its icon (`.chip.is-icon`, fitNoteMetas): the
// glyph's centre against the chip's, and the chip's width against its
// height. Owner, 2026-10-05, Ask's matching notes: the links chip's icon
// "isnt centred and has excess space around it".
const {boot} = require('./lib');
(async () => {
  const {browser, page} = await boot({viewport: {width: 1440, height: 900}});
  await page.waitForTimeout(1500);
  const rows = await page.evaluate(() => {
    const host = document.createElement('div');
    host.className = 'entry-meta note-meta';
    document.querySelector('#tab-notes, main, body').append(host);
    const out = [];
    for (const [label, cls] of [["ph:graph Linked by 2 notes", "refs"], ["ph:bell 1 reminder", "reminders"], ["ph:calendar-blank Mentions 3 May", "when"], ["ph:hash idea", "tag"]]) {
      const c = chip(label, cls, () => {});
      c.classList.add('is-icon');
      host.append(c);
      const br = c.getBoundingClientRect(), i = c.querySelector('i').getBoundingClientRect();
      out.push({cls, w: +br.width.toFixed(1), h: +br.height.toFixed(1),
        dx: +((i.left + i.width/2) - (br.left + br.width/2)).toFixed(1),
        dy: +((i.top + i.height/2) - (br.top + br.height/2)).toFixed(1), pad: getComputedStyle(c).padding});
    }
    host.remove();
    return out;
  });
  console.log(JSON.stringify(rows));
  await browser.close();
})();
