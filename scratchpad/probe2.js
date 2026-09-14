const { boot } = require('./ui-sweeps/lib.js');
(async () => {
  const { page, browser } = await boot({});
  await page.evaluate(() => switchTab('documents'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'probe-host';
    document.body.appendChild(host);
    renderMarkdown(host, '| A | B |\n| --- | --- |\n| 1 | 2 |');
    const block = host.querySelector('.md-table-block');
    [...block.querySelectorAll('button')].find((b) => /Full view/.test(b.textContent)).click();
  });
  await page.waitForTimeout(500);
  await page.click('.md-table-block.is-full .code-bar .menu-wrap > button');
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const menus = [...document.querySelectorAll('.action-menu')].filter((m) => !m.classList.contains('hidden'));
    const menu = menus[0];
    if (!menu) return { menus: 0 };
    const cs = getComputedStyle(menu);
    const back = [...menu.querySelectorAll('.menu-item')].find((b) => /Back/.test(b.textContent));
    const br = back.getBoundingClientRect();
    const atBack = document.elementFromPoint(Math.round(br.left + br.width / 2), Math.round(br.top + br.height / 2));
    return {
      parent: menu.parentElement.tagName + '.' + (menu.parentElement.className || '').toString().split(' ')[0],
      pos: cs.position, z: cs.zIndex, opacity: cs.opacity,
      rect: { l: Math.round(br.left), t: Math.round(br.top), w: Math.round(br.width), h: Math.round(br.height) },
      atBack: atBack ? atBack.tagName + '.' + (atBack.className || '').toString().split(' ')[0] : 'null',
      backReachable: !!(atBack && back.contains(atBack)),
      x: br.left + br.width / 2, y: br.top + br.height / 2,
    };
  });
  console.log(JSON.stringify(r));
  if (r.x) {
    await page.mouse.click(r.x, r.y);
    await page.waitForTimeout(400);
    console.log('after Back click stillFull ' + await page.evaluate(() => !!document.querySelector('.md-table-block.is-full')));
  }
  await browser.close();
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
