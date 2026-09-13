// INBOX 177: the mind map's radial slots are visible, its branches are
// thick and point somewhere, the Aa grip clears the node's actions, and a
// topic is something the link tools can see. As numbers.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node mapstyle.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  const bad = [];
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1200);
  const r = await page.evaluate(async () => {
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `map style ${Date.now()}`, type: 'map' }) });
    await initWhiteboard(); wbShowCanvasView();
    window.currentBoardId = board.id;
    await fetchWhiteboardState(board.id);
    await new Promise((res) => setTimeout(res, 600));
    let root = (wbState.objects || []).find((o) => o.kind === 'topic');
    if (!root) root = await wbMapCreateNode({ text: 'Root' });
    if (root) { await wbMapAddChild(root.id); await wbRefreshMapState(); renderWhiteboardNow(); await new Promise((res) => setTimeout(res, 800)); }
    const edge = document.querySelector('.wb-map-edge');
    const edgeVisible = edge ? edge.getBoundingClientRect().width + edge.getBoundingClientRect().height : 0;
    //: An SVG path inside a subtree the browser is not laying out reports
    //: empty strings for every property, so the shipped rule is read from
    //: the stylesheet itself: this is what every branch on every map draws.
    const ruleOf = (selector) => {
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        for (const rule of rules || []) {
          if (rule.selectorText === selector) return rule.style;
        }
      }
      return null;
    };
    const edgeRule = ruleOf('.wb-map-edge');
    const slotRule = ruleOf('.wb-map-radial .wb-map-radial-slot');
    const marker = document.getElementById('wb-map-arrow');
    const markerFill = marker ? getComputedStyle(marker.querySelector('path')).fill : null;
    // the selected topic's ring and its grip
    const topics = (wbState.objects || []).filter((o) => WB_MAP_KINDS.has(o.kind));
    if (topics[0]) {
      const el = document.querySelector(`.wb-object[data-id="${topics[0].id}"], .wb-map-node[data-id="${topics[0].id}"]`);
      if (el) el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      wbSelectedItem = { kind: 'object', id: topics[0].id };
      wbUpdateSelectionBar();
      renderWhiteboardNow();
    }
    await new Promise((res) => setTimeout(res, 700));
    const slot = document.querySelector('.wb-map-radial-slot');
    const slotCs = slot ? getComputedStyle(slot) : null;
    const grip = document.querySelector('.wb-map-size-grip');
    const actions = document.querySelector('.wb-map-actions');
    const overlap = grip && actions ? (() => { const a = grip.getBoundingClientRect(), b = actions.getBoundingClientRect(); return a.right > b.left && b.right > a.left && a.bottom > b.top && b.bottom > a.top; })() : null;
    // the link tools can see a topic
    const box = topics[0] ? wbItemBBox('object', topics[0]) : null;
    const hit = box ? wbLinkCandidateAt((box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2) : null;
    return {
      topics: topics.length,
      edges: document.querySelectorAll('.wb-map-edge').length,
      edgeVisible,
      edge: edgeRule && {
        width: edgeRule.getPropertyValue('stroke-width'),
        opacity: edgeRule.getPropertyValue('opacity'),
        marker: edgeRule.getPropertyValue('marker-end'),
      },
      slotRule: slotRule && {
        bg: slotRule.getPropertyValue('background'),
        border: slotRule.getPropertyValue('border'),
      },
      markerFill,
      slot: slotCs && { bg: slotCs.backgroundColor, border: slotCs.borderTopWidth + ' ' + slotCs.borderTopColor, w: Math.round(slot.getBoundingClientRect().width) },
      gripSide: grip ? getComputedStyle(grip).left : null,
      gripOverlapsActions: overlap,
      linkCandidate: hit ? `${hit[0]}:${hit[1].kind || ''}` : null,
    };
  });
  console.log(`177 branches    ${r.edges} edge(s), ${JSON.stringify(r.edge)}, drawn span ${r.edgeVisible}px, marker fill ${r.markerFill}`);
  console.log(`177 radial slot computed ${JSON.stringify(r.slot)}; rule ${JSON.stringify(r.slotRule)}`);
  console.log(`177 Aa grip     left ${r.gripSide}, overlaps the node actions ${r.gripOverlapsActions}`);
  console.log(`177 link tools  a topic is a candidate: ${r.linkCandidate} (of ${r.topics} topics)`);
  if (!r.edge || parseFloat(r.edge.width) < 3 || r.edge.opacity !== '1' || !/wb-map-arrow/.test(r.edge.marker)) bad.push('branch stroke');
  if (!r.slotRule || !/modal-bg-opaque/.test(r.slotRule.bg) || !/color-mix/.test(r.slotRule.border)) bad.push('radial slot');
  if (r.gripOverlapsActions !== false) bad.push('Aa grip overlaps the actions');
  if (!r.linkCandidate || !r.linkCandidate.startsWith('object:')) bad.push('a topic is not a link candidate');
  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
