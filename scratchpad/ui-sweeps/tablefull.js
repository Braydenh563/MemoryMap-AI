// The table block's full view sits above every other surface, its bar reads
// as one segmented control, and the header's icon buttons are two clusters.
// The owner: "the table full view is behind a lot of stuff", "I want the
// buttons in the table to look like they are properly integrated", "a better
// way to modernise ... these buttons in the top bar". As numbers.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tablefull.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  const bad = [];
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    // Inside a real message bubble, which is what makes this a test: the chat
    // card is a blurred surface and a backdrop-filter ancestor traps
    // position: fixed, which is what put the panel under the card's header.
    const host = document.createElement('div'); host.className = 'bubble-answer';
    const bubble = document.createElement('div'); bubble.className = 'msg assistant';
    bubble.appendChild(host);
    document.getElementById('chat-messages').appendChild(bubble);
    renderMarkdown(host, '| A | B |\n| --- | --- |\n| 1 | 2 |');
    const block = host.querySelector('.md-table-block');
    const bar = block.querySelector('.code-bar');
    const group = block.querySelector('.code-actions');
    // INBOX 188: the bar is Copy plus a kebab now, so "the buttons in the bar"
    // means the visible controls, not every button the menu holds.
    const controls = [...group.children]
      .map((kid) => (kid.tagName === 'BUTTON' ? kid : kid.querySelector(':scope > button')))
      .filter((b) => b && !b.hidden);
    const buttons = controls;
    const menuItems = [...group.querySelectorAll('.action-menu .menu-item')].map((b) => b.textContent.trim());
    const groupCs = getComputedStyle(group);
    const btnCs = getComputedStyle(buttons[0]);
    const seams = controls.slice(1)
      .map((b) => getComputedStyle(b.closest('.menu-wrap') || b).boxShadow)
      .filter((s) => s && s !== 'none').length;
    [...group.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Full view').click();
    // INBOX 179: fit is the default in full view, and the toggle hands the
    // table back its natural width with the panel scrolling sideways.
    const wrap = block.querySelector('.md-table-wrap');
    const table = block.querySelector('.md-table');
    const fitState = { overflowX: getComputedStyle(wrap).overflowX, layout: getComputedStyle(table).tableLayout, scrolls: table.scrollWidth > wrap.clientWidth + 1 };
    const fitBtn = [...block.querySelectorAll('button')].find((b) => /Actual size|Fit to panel/.test(b.textContent));
    fitBtn.click();
    const actualState = { label: fitBtn.textContent.trim(), overflowX: getComputedStyle(wrap).overflowX, layout: getComputedStyle(table).tableLayout };
    fitBtn.click();
    // getComputedStyle returns a LIVE object: read the values into plain
    // strings before the class comes off again, or every one of them reads
    // the folded state (the first run of this probe reported "static").
    const cs = getComputedStyle(block);
    const full = { z: cs.zIndex, position: cs.position };
    const scrimBg = getComputedStyle(block, '::before').backgroundColor;
    const barSticky = getComputedStyle(bar).position;
    const rect = block.getBoundingClientRect();
    // what is drawn over the panel's own area: the highest z-index of the app's
    // chrome, and whether anything paints above it at the panel's centre.
    const top = document.elementFromPoint(Math.round(rect.left + rect.width / 2), Math.round(rect.top + 4));
    const inPanel = block.contains(top);
    // Laid out against the viewport, not against the card it came from.
    // Against the viewport, not against the bubble: a trapped panel is the
    // width of the message it came from (a few hundred px), a freed one is
    // most of the window. The margin is loose on purpose, the failure this
    // guards against is an order of magnitude, not a pixel.
    const viewportSized = rect.width > innerWidth * 0.8 && rect.height > innerHeight * 0.8;
    const parentIsBody = block.parentElement === document.body;
    const filtered = (() => { let el = bubble; while (el && el !== document.body) { const cs = getComputedStyle(el); if (cs.backdropFilter !== 'none' || cs.filter !== 'none' || cs.transform !== 'none') return `${el.id || el.className}`.slice(0, 30); el = el.parentElement; } return null; })();
    block.classList.remove('is-full');
    const clusters = [...document.querySelectorAll('#top-bar .header-cluster, header .header-cluster')];
    const cluster = clusters[0] ? getComputedStyle(clusters[0]) : null;
    // The cluster's own items only: the notifications panel lives inside the
    // wrap and its buttons are not part of this control.
    const clusterBtns = clusters.flatMap((c) => [...c.children].flatMap((kid) => (kid.tagName === 'BUTTON' ? [kid] : [...kid.children].filter((g) => g.tagName === 'BUTTON'))))
      .map((b) => getComputedStyle(b).borderTopWidth);
    return {
      groupGap: groupCs.gap, groupBg: groupCs.backgroundColor, groupRadius: groupCs.borderRadius,
      btnBorder: btnCs.borderTopWidth, btnBg: btnCs.backgroundColor, seams, buttons: buttons.length,
      z: full.z, position: full.position, topAtPanel: top ? `${top.tagName}.${(top.className || '').toString().split(' ')[0]}` : null, inPanel,
      menuItems,
      scrimBg, barSticky, viewportSized, parentIsBody, filtered, fitState, actualState,
      rect: { w: Math.round(rect.width), h: Math.round(rect.height), l: Math.round(rect.left), t: Math.round(rect.top) }, vw: innerWidth, vh: innerHeight,
      clusters: clusters.length, clusterBg: cluster && cluster.backgroundColor, clusterPad: cluster && cluster.padding,
      clusterBtnBorders: [...new Set(clusterBtns)],
    };
  });
  console.log(`table bar    ${r.buttons} controls in one shell: gap ${r.groupGap}, ground ${r.groupBg}, radius ${r.groupRadius}; per button border ${r.btnBorder}, ground ${r.btnBg}, ${r.seams} hairline seam(s)`);
  console.log(`table menu   ${r.menuItems.length} items: ${r.menuItems.join(' | ')}`);
  console.log(`full view    ${r.position} z ${r.z}, parent is body ${r.parentIsBody}, viewport-sized ${r.viewportSized}, top element at its head ${r.topAtPanel} (inside the panel ${r.inPanel}), scrim ${r.scrimBg}, bar ${r.barSticky}`);
  console.log(`             the bubble's nearest filtered/transformed ancestor: ${r.filtered}; rect ${JSON.stringify(r.rect)} in ${r.vw}x${r.vh}`);
  console.log(`fit          default ${JSON.stringify(r.fitState)}; after the toggle ${JSON.stringify(r.actualState)}`);
  console.log(`top bar      ${r.clusters} cluster(s), ground ${r.clusterBg}, padding ${r.clusterPad}, button borders ${JSON.stringify(r.clusterBtnBorders)}`);
  if (r.groupGap !== '0px' || r.groupBg === 'rgba(0, 0, 0, 0)' || r.btnBorder !== '0px' || r.seams !== r.buttons - 1) bad.push('table bar is not one control');
  // INBOX 188: two controls in the bar, everything else one click in.
  if (r.buttons !== 2) bad.push(`table bar has ${r.buttons} controls, not Copy plus a kebab`);
  if (r.menuItems.length !== 5) bad.push(`table menu has ${r.menuItems.length} items, not 5`);
  if (Number(r.z) < 2000 || !r.inPanel || !r.parentIsBody || !r.viewportSized) bad.push('full view is not above the app chrome');
  if (r.clusters !== 2 || r.clusterBg === 'rgba(0, 0, 0, 0)' || r.clusterBtnBorders.join() !== '0px') bad.push('top bar clusters');
  if (r.fitState.overflowX !== 'hidden' || r.fitState.layout !== 'fixed' || r.fitState.scrolls) bad.push('full view does not fit the panel');
  if (r.actualState.overflowX !== 'auto' || r.actualState.layout !== 'auto' || r.actualState.label !== 'Fit to panel') bad.push('the actual-size toggle does not work');
  // --- INBOX 181, first half: the toggle has to do something in a bubble too.
  const inlineToggle = await page.evaluate(() => {
    const host = document.createElement('div');
    host.className = 'bubble-answer';
    const bubble = document.createElement('div');
    bubble.className = 'msg assistant';
    bubble.appendChild(host);
    document.getElementById('chat-messages').appendChild(bubble);
    renderMarkdown(host, '| A long heading here | B | C |\n| --- | --- | --- |\n| one | two | three |');
    const block = host.querySelector('.md-table-block');
    const wrap = block.querySelector('.md-table-wrap');
    const table = block.querySelector('.md-table');
    const read = () => ({
      view: block.dataset.tableView,
      layout: getComputedStyle(table).tableLayout,
      overflowX: getComputedStyle(wrap).overflowX,
      minWidth: getComputedStyle(table).minWidth,
      label: [...block.querySelectorAll('button')].find((b) => /Actual size|Fit to panel/.test(b.textContent)).textContent.trim(),
    });
    const before = read();
    [...block.querySelectorAll('button')].find((b) => /Actual size|Fit to panel/.test(b.textContent)).click();
    const after = read();
    return { before, after };
  });
  console.log(`inline fit   before ${JSON.stringify(inlineToggle.before)}`);
  console.log(`             after  ${JSON.stringify(inlineToggle.after)}`);
  if (inlineToggle.before.layout !== 'auto' || inlineToggle.before.overflowX !== 'auto') bad.push('the inline default is not actual size');
  if (inlineToggle.after.layout !== 'fixed' || inlineToggle.after.overflowX !== 'hidden') bad.push('the inline toggle still does nothing');

  // --- INBOX 181, second half: a drag in full view moves the edge it grips.
  await page.evaluate(() => {
    const block = [...document.querySelectorAll('.md-table-block')].pop();
    [...block.querySelectorAll('button')].find((b) => /Full view|Back/.test(b.textContent)).click();
  });
  await page.waitForTimeout(300);
  const gripBoxes = await page.evaluate(() => {
    const block = document.querySelector('.md-table-block.is-full');
    const th = block.querySelector('thead th');
    const tr = block.querySelector('tbody tr');
    const colGrip = th.querySelector('.md-grip-col').getBoundingClientRect();
    const rowGrip = tr.querySelector('.md-grip-row').getBoundingClientRect();
    return {
      grips: block.querySelectorAll('.md-grip').length,
      thW: +th.getBoundingClientRect().width.toFixed(1),
      trH: +tr.getBoundingClientRect().height.toFixed(1),
      col: { x: colGrip.left + colGrip.width / 2, y: colGrip.top + colGrip.height / 2 },
      row: { x: rowGrip.left + 20, y: rowGrip.top + rowGrip.height / 2 },
    };
  });
  await page.mouse.move(gripBoxes.col.x, gripBoxes.col.y);
  await page.mouse.down();
  await page.mouse.move(gripBoxes.col.x + 60, gripBoxes.col.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  await page.mouse.move(gripBoxes.row.x, gripBoxes.row.y);
  await page.mouse.down();
  await page.mouse.move(gripBoxes.row.x, gripBoxes.row.y + 40, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const dragged = await page.evaluate(() => {
    const block = document.querySelector('.md-table-block.is-full');
    const th = block.querySelector('thead th');
    const tr = block.querySelector('tbody tr');
    const out = {
      view: block.dataset.tableView,
      thW: +th.getBoundingClientRect().width.toFixed(1),
      trH: +tr.getBoundingClientRect().height.toFixed(1),
    };
    // Back out, then in again: the sizes are meant to last the session.
    [...block.querySelectorAll('button')].find((b) => /Full view|Back/.test(b.textContent)).click();
    const inline = { view: block.dataset.tableView, grips: block.querySelectorAll('.md-grip').length, thWidthStyle: th.style.width };
    [...block.querySelectorAll('button')].find((b) => /Full view|Back/.test(b.textContent)).click();
    const back = document.querySelector('.md-table-block.is-full');
    out.afterReturn = {
      view: back.dataset.tableView,
      thW: +back.querySelector('thead th').getBoundingClientRect().width.toFixed(1),
      trH: +back.querySelector('tbody tr').getBoundingClientRect().height.toFixed(1),
    };
    out.inline = inline;
    [...back.querySelectorAll('button')].find((b) => /Full view|Back/.test(b.textContent)).click();
    return out;
  });
  const dW = +(dragged.thW - gripBoxes.thW).toFixed(1);
  const dH = +(dragged.trH - gripBoxes.trH).toFixed(1);
  console.log(`drag         ${gripBoxes.grips} grips; column ${gripBoxes.thW} -> ${dragged.thW}px (${dW} for a 60px drag), row ${gripBoxes.trH} -> ${dragged.trH}px (${dH} for a 40px drag), view ${dragged.view}`);
  console.log(`             back in the bubble ${JSON.stringify(dragged.inline)}; on return ${JSON.stringify(dragged.afterReturn)}`);
  if (Math.abs(dW - 60) > 2) bad.push(`a 60px column drag moved the edge ${dW}px`);
  if (Math.abs(dH - 40) > 2) bad.push(`a 40px row drag moved the edge ${dH}px`);
  if (dragged.inline.grips !== 0 || dragged.inline.thWidthStyle !== '') bad.push('the grips and the dragged widths outlive full view');
  if (Math.abs(dragged.afterReturn.thW - dragged.thW) > 2 || Math.abs(dragged.afterReturn.trH - dragged.trH) > 2) bad.push('the dragged sizes are not restored on return');

  // --- INBOX 188, the half the report is actually about: the same bar inside
  // the popup agent, which is a 293px card, and at 390 where the bar's two
  // controls have to be reachable with a thumb.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.evaluate(() => toggleAgentPalette());
  await page.waitForSelector('#command-palette-overlay:not(.hidden)');
  const p = await page.evaluate(() => {
    const host = document.createElement('div');
    host.className = 'bubble-answer';
    document.getElementById('command-palette-results').appendChild(host);
    renderMarkdown(host, '| A | B | C |\n| --- | --- | --- |\n| 1 | 2 | 3 |');
    const group = host.querySelector('.code-actions');
    const controls = [...group.children]
      .map((kid) => (kid.tagName === 'BUTTON' ? kid : kid.querySelector(':scope > button')))
      .filter((b) => b && !b.hidden);
    const bar = host.querySelector('.code-bar');
    const barRect = bar.getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();
    const sizes = controls.map((b) => {
      const r = b.getBoundingClientRect();
      return { label: b.textContent.trim() || b.getAttribute('aria-label'), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    });
    // One row, not two: the old five-button bar wrapped inside this card.
    const rows = new Set(controls.map((b) => Math.round(b.getBoundingClientRect().top)));
    return {
      controls: controls.length,
      sizes,
      rows: rows.size,
      barW: +barRect.width.toFixed(1),
      groupW: +groupRect.width.toFixed(1),
      overflows: groupRect.right > barRect.right + 0.5,
    };
  });
  console.log(`popup agent  ${p.controls} controls on ${p.rows} row(s) at 390: ${p.sizes.map((s) => `${s.label} ${s.w}x${s.h}`).join(', ')}; actions ${p.groupW}px in a ${p.barW}px bar, overflowing ${p.overflows}`);
  if (p.controls !== 2) bad.push('the popup agent table bar is not Copy plus a kebab');
  if (p.rows !== 1) bad.push('the popup agent table bar wraps onto two rows');
  if (p.overflows) bad.push('the popup agent table bar overflows its block');
  if (p.sizes.some((s) => s.h < 44 || s.w < 44)) bad.push(`a table bar control is under 44px at 390: ${p.sizes.map((s) => `${s.w}x${s.h}`).join(', ')}`);

  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
