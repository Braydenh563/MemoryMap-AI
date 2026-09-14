// INBOX 239: "I opened up the table full view but there was no way to close it
// so I had to hard refresh the app." The panel has a visible X, the ⋯ menu's
// Back row is actually clickable inside it (it drew under the panel before),
// Escape closes it, and the focus goes back where it came from.
//
//   BASE=http://127.0.0.1:8802 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tablefullclose.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  const bad = [];
  await page.evaluate(() => switchTab('documents'));
  await page.waitForTimeout(1200);

  const enter = () => page.evaluate(() => {
    document.getElementById('probe-host')?.remove();
    const host = document.createElement('div');
    host.id = 'probe-host';
    document.body.appendChild(host);
    renderMarkdown(host, '| A | B |\n| --- | --- |\n| 1 | 2 |');
    const block = host.querySelector('.md-table-block');
    const kebab = block.querySelector('.code-bar .menu-wrap > button');
    kebab.id = 'probe-kebab';
    kebab.focus();
    [...block.querySelectorAll('button')].find((b) => /Full view/.test(b.textContent)).click();
  });

  // --- the X in the head
  await enter();
  await page.waitForTimeout(400);
  const x = await page.evaluate(() => {
    const full = document.querySelector('.md-table-block.is-full');
    const close = full.querySelector('.md-table-close');
    if (!close) return { present: false };
    const r = close.getBoundingClientRect();
    const cs = getComputedStyle(close);
    const at = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    const bar = full.querySelector('.code-bar').getBoundingClientRect();
    return {
      present: true, focused: document.activeElement === close,
      rect: { w: +r.width.toFixed(1), h: +r.height.toFixed(1), l: Math.round(r.left), t: Math.round(r.top) },
      border: cs.borderTopWidth, bg: cs.backgroundColor, seam: cs.boxShadow !== 'none',
      inBar: r.right <= bar.right + 1 && r.top >= bar.top - 1,
      reachable: !!(at && close.contains(at)),
      label: close.getAttribute('aria-label'),
    };
  });
  console.log(`full X       ${JSON.stringify(x)}`);
  if (!x.present) bad.push('full view has no close button');
  else {
    if (!x.reachable) bad.push('the close X is painted over');
    if (!x.inBar) bad.push('the close X is not in the panel head');
    if (!x.focused) bad.push('the panel does not take the focus on open');
    if (x.border !== '0px' || x.bg !== 'rgba(0, 0, 0, 0)') bad.push(`the close X is a chip, not part of the shell: border ${x.border}, ground ${x.bg}`);
  }
  await page.click('.md-table-block.is-full .md-table-close');
  await page.waitForTimeout(300);
  const afterX = await page.evaluate(() => ({
    stillFull: !!document.querySelector('.md-table-block.is-full'),
    focus: document.activeElement ? document.activeElement.id || document.activeElement.tagName : null,
  }));
  console.log(`after X      ${JSON.stringify(afterX)}`);
  if (afterX.stillFull) bad.push('the close X does not close the panel');
  if (afterX.focus !== 'probe-kebab') bad.push(`focus landed on ${afterX.focus}, not the opener`);

  // --- the menu's Back row, clicked with a real mouse
  await enter();
  await page.waitForTimeout(400);
  await page.click('.md-table-block.is-full .code-bar .menu-wrap > button');
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const menu = [...document.querySelectorAll('.action-menu')].find((el) => !el.classList.contains('hidden'));
    if (!menu) return { open: false };
    const back = [...menu.querySelectorAll('.menu-item')].find((b) => /Back/.test(b.textContent));
    const r = back.getBoundingClientRect();
    const at = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    return {
      open: true, z: getComputedStyle(menu).zIndex,
      panelZ: getComputedStyle(document.querySelector('.md-table-block.is-full')).zIndex,
      rect: { l: Math.round(r.left), t: Math.round(r.top) },
      at: at ? at.tagName + '.' + (at.className || '').toString().split(' ')[0] : null,
      reachable: !!(at && back.contains(at)),
      x: r.left + r.width / 2, y: r.top + r.height / 2,
    };
  });
  console.log(`menu Back    ${JSON.stringify(m)}`);
  if (!m.open) bad.push('the menu did not open in full view');
  else if (!m.reachable) bad.push(`the Back row is painted over by ${m.at} (menu z ${m.z}, panel z ${m.panelZ})`);
  if (m.x) {
    await page.mouse.click(m.x, m.y);
    await page.waitForTimeout(400);
    const still = await page.evaluate(() => !!document.querySelector('.md-table-block.is-full'));
    console.log(`after Back   stillFull ${still}`);
    if (still) bad.push('clicking Back does not close the panel');
  }

  // --- Escape
  await enter();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const esc = await page.evaluate(() => ({
    stillFull: !!document.querySelector('.md-table-block.is-full'),
    focus: document.activeElement ? document.activeElement.id || document.activeElement.tagName : null,
  }));
  console.log(`after Escape ${JSON.stringify(esc)}`);
  if (esc.stillFull) bad.push('Escape does not close the panel');
  if (esc.focus !== 'probe-kebab') bad.push(`Escape left the focus on ${esc.focus}`);

  // --- the bubble is unchanged: two visible controls, no X
  const bubble = await page.evaluate(() => {
    const block = document.querySelector('#probe-host .md-table-block');
    const group = block.querySelector('.code-actions');
    const controls = [...group.children]
      .map((kid) => (kid.tagName === 'BUTTON' ? kid : kid.querySelector(':scope > button')))
      .filter((b) => b && !b.hidden);
    return { controls: controls.length, labels: controls.map((b) => b.textContent.trim() || b.getAttribute('aria-label')) };
  });
  console.log(`bubble bar   ${JSON.stringify(bubble)}`);
  if (bubble.controls !== 2) bad.push(`the bubble bar has ${bubble.controls} controls, not Copy plus a kebab`);

  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
