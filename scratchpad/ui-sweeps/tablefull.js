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
    const host = document.createElement('div'); host.className = 'bubble-answer';
    document.getElementById('chat-messages').appendChild(host);
    renderMarkdown(host, '| A | B |\n| --- | --- |\n| 1 | 2 |');
    const block = host.querySelector('.md-table-block');
    const bar = block.querySelector('.code-bar');
    const group = block.querySelector('.code-actions');
    const buttons = [...group.querySelectorAll('button')];
    const groupCs = getComputedStyle(group);
    const btnCs = getComputedStyle(buttons[0]);
    const seams = buttons.slice(1).map((b) => getComputedStyle(b).boxShadow).filter((s) => s && s !== 'none').length;
    buttons.find((b) => b.textContent.trim() === 'Full view').click();
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
      scrimBg, barSticky,
      clusters: clusters.length, clusterBg: cluster && cluster.backgroundColor, clusterPad: cluster && cluster.padding,
      clusterBtnBorders: [...new Set(clusterBtns)],
    };
  });
  console.log(`table bar    ${r.buttons} buttons in one shell: gap ${r.groupGap}, ground ${r.groupBg}, radius ${r.groupRadius}; per button border ${r.btnBorder}, ground ${r.btnBg}, ${r.seams} hairline seam(s)`);
  console.log(`full view    ${r.position} z ${r.z}, top element at its head ${r.topAtPanel} (inside the panel ${r.inPanel}), scrim ${r.scrimBg}, bar ${r.barSticky}`);
  console.log(`top bar      ${r.clusters} cluster(s), ground ${r.clusterBg}, padding ${r.clusterPad}, button borders ${JSON.stringify(r.clusterBtnBorders)}`);
  if (r.groupGap !== '0px' || r.groupBg === 'rgba(0, 0, 0, 0)' || r.btnBorder !== '0px' || r.seams !== r.buttons - 1) bad.push('table bar is not one control');
  if (Number(r.z) < 2000 || !r.inPanel) bad.push('full view is not above the app chrome');
  if (r.clusters !== 2 || r.clusterBg === 'rgba(0, 0, 0, 0)' || r.clusterBtnBorders.join() !== '0px') bad.push('top bar clusters');
  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
