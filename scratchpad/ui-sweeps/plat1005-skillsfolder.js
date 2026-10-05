// The user skills folder in the running app (WORLD_CLASS_PLAN B8): a file
// dropped into the data dir's skills folder after the page loaded is listed
// in Settings, Skills (marked, with no Edit or Delete) and in the chat's
// Skills menu the next time it opens, without a reload; the folder line says
// where the folder is and which file did not load. Measured, not looked at:
// row and line boxes, overflow, the menu's options.
//
//   BASE=http://127.0.0.1:8852 DATA=/tmp/mm-plat1005 WIDTH=1440 THEME=dark \
//     node scratchpad/ui-sweeps/plat1005-skillsfolder.js
const fs = require('fs');
const path = require('path');
const { boot } = require('./lib.js');

const WIDTH = Number(process.env.WIDTH || 1440);
const DATA = process.env.DATA || '/tmp/mm-plat1005';

(async () => {
  const touch = WIDTH < 500;
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: touch ? 844 : 900 }, hasTouch: touch, isMobile: touch });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const folder = path.join(DATA, 'skills');
  fs.mkdirSync(folder, { recursive: true });
  const name = `Sweep skill ${WIDTH}`;
  fs.writeFileSync(path.join(folder, `${name}.md`), '---\ndescription: Dropped in while the page was open\ntools: search_notes\n---\nFind the notes about gardens.\n\n## Steps\n1. Search for gardens.\n');
  fs.writeFileSync(path.join(folder, 'broken.md'), '---\ntools: run_skill\n---\nRun yourself.\n');

  await page.evaluate(() => openSettingsModal('skills'));
  await page.waitForTimeout(1500);
  const settings = await page.evaluate((wanted) => {
    const rows = [...document.querySelectorAll('#skill-list > li')];
    const row = rows.find((li) => li.textContent.includes(wanted));
    const line = document.getElementById('skill-folder-line');
    const pane = document.getElementById('settings-skills');
    const lr = line?.getBoundingClientRect();
    return {
      found: !!row,
      marked: !!row && row.textContent.includes('From the skills folder'),
      buttons: row ? row.querySelectorAll('button').length : -1,
      line: line?.textContent.slice(0, 160),
      problem: line?.textContent.includes('broken.md'),
      lineBox: lr && { w: Math.round(lr.width), h: Math.round(lr.height) },
      lineOverflow: line ? line.scrollWidth - line.clientWidth : null,
      paneOverflow: pane ? pane.scrollWidth - pane.clientWidth : null,
      colour: line ? getComputedStyle(line).color : null,
    };
  }, name);

  await page.evaluate(() => { document.querySelector('#settings-modal .modal-close, #settings-close')?.click(); });
  await page.evaluate(() => { const b = document.querySelector('[data-tab="chat"]'); b?.click(); });
  await page.waitForTimeout(1200);
  const second = `Second sweep skill ${WIDTH}`;
  fs.writeFileSync(path.join(folder, `${second}.md`), 'Dropped after the menu was built.\n');
  const menu = await page.evaluate(async (wanted) => {
    const trigger = document.getElementById('chat-skills-btn');
    if (!trigger) return { trigger: false };
    trigger.click();
    await new Promise((r) => setTimeout(r, 1500));
    const options = [...document.querySelectorAll('#chat-skill-select option')].map((o) => o.value);
    return { trigger: true, has: options.includes(wanted), options: options.length };
  }, second);

  for (const f of [`${name}.md`, 'broken.md', `${second}.md`]) fs.rmSync(path.join(folder, f), { force: true });
  console.log(JSON.stringify({ width: WIDTH, theme: process.env.THEME || 'light', settings, menu, errors }));
  await browser.close();
})();
