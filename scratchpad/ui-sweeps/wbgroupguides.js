// INBOX 267 (2), verbatim: "Alignment bars don't appear for group selections".
//
// A previous session recorded this as built (`5273bae`, `wbBulkGroupBox`), so
// this measures rather than believes either way: select two cards, drag them
// until the group's own edge is within the snap distance of a third card's
// edge, and count the guide lines actually in the document.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const v = document.getElementById('library-view-whiteboard');
    if (v.classList.contains('hidden') || !v.offsetParent) {
      for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle('hidden', s !== v);
    }
    await initWhiteboard(); wbShowCanvasView(); await fetchWhiteboardState();
    await new Promise((r) => setTimeout(r, 600));
  });

  // Three cards. Two are the group; the third is what the group lines up with.
  // Its left edge is the target, set a long way below so nothing overlaps.
  const setup = await page.evaluate(async () => {
    const at = [[120, 140], [420, 140], [123, 520]];
    const ids = [];
    for (const [x, y] of at) {
      const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `guide card at ${x}`, category: 'General' }) });
      const n = await apiJson('/whiteboard/nodes', { method: 'POST', body: JSON.stringify({ entry_id: e.id, board_id: window.currentBoardId ?? null, x, y, z: 1 }) });
      wbState.nodes.push(n);
      ids.push(n.id);
    }
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 500));
    if (window.currentTool !== 'select' && typeof setWbTool === 'function') setWbTool('select');
    wbMultiSelection.clear();
    for (const id of ids.slice(0, 2)) wbMultiSelection.add(wbMultiKey('node', id));
    wbApplySelectionHighlight();
    await new Promise((r) => setTimeout(r, 400));
    const card = document.querySelector(`.node-card[data-id="${ids[0]}"]`);
    const r = card.getBoundingClientRect();
    return { ids, grab: { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + 12) } };
  });
  console.log('setup', JSON.stringify(setup));

  // Drag the group by one of its members. The group's left edge starts at 120
  // and the lone card's is at 123, so a drag of +3 puts them level, which is
  // inside the snap distance and must draw a vertical guide.
  await page.mouse.move(setup.grab.x, setup.grab.y);
  await page.mouse.down();
  for (const dx of [20, 40, 30, 10, 3]) {
    await page.mouse.move(setup.grab.x + dx, setup.grab.y + 2, { steps: 4 });
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);
  const mid = await page.evaluate(() => {
    const g = document.getElementById('wb-align-guides');
    const lines = [...(g?.querySelectorAll('line') || [])].map((l) => ({
      x1: Math.round(+l.getAttribute('x1')), y1: Math.round(+l.getAttribute('y1')),
      x2: Math.round(+l.getAttribute('x2')), y2: Math.round(+l.getAttribute('y2')),
      kind: l.getAttribute('class'),
      visible: l.getBoundingClientRect().width > 0 || l.getBoundingClientRect().height > 0,
    }));
    return { group: !!g, lines, selected: wbMultiSelection.size };
  });
  await page.mouse.up();
  await page.waitForTimeout(300);
  console.log('mid-drag', JSON.stringify(mid, null, 1));

  //: And the case the report was actually about: a group dragged **by a
  //: sketch**. Cards have had guides since `wbBulkGroupBox`; the sketch drag
  //: handler never asked for them at all, solo or in a group, so a marquee
  //: that caught a sketch and was dragged by it was the one selection on the
  //: board with none.
  const sketchCase = await page.evaluate(async () => {
    //: On screen, deliberately. Board y=800 lands at screen y=968 in a 900px
    //: viewport, and a first version put the sketch there: every mouse event
    //: missed it, the sketch never moved, and the probe reported the feature
    //: broken when it had never been exercised.
    const path = 'M 300 300 L 460 300 L 460 380 L 300 380 Z';
    const sk = await apiJson('/whiteboard/sketches', {
      method: 'POST',
      body: JSON.stringify({
        board_id: window.currentBoardId ?? null,
        //: `data` is a JSON *string* holding `{d, color, width}`: the route's
        //: field is `data`, and a flat `{d: ...}` body is rejected, which is
        //: why an earlier run silently made no sketch at all.
        data: JSON.stringify({ d: path, color: '#888888', width: 3, shape: 'rect' }),
        x: 0, y: 0, z: 1,
      }),
    }).catch(() => null);
    if (!sk) return { made: false };
    wbState.sketches.push(sk);
    //: A partner well to the right, so the group is genuinely a group and its
    //: left edge is the sketch's own.
    const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'sketch group partner', category: 'General' }) });
    const n = await apiJson('/whiteboard/nodes', { method: 'POST', body: JSON.stringify({ entry_id: e.id, board_id: window.currentBoardId ?? null, x: 600, y: 300, z: 1 }) });
    wbState.nodes.push(n);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 600));
    wbMultiSelection.clear();
    wbMultiSelection.add(wbMultiKey('sketch', sk.id));
    wbMultiSelection.add(wbMultiKey('node', n.id));
    wbApplySelectionHighlight();
    await new Promise((r) => setTimeout(r, 400));
    const el = document.querySelector(`.sketch-group[data-id="${sk.id}"] .sketch-hitbox`);
    if (!el) return { made: true, grabbed: false };
    const r = el.getBoundingClientRect();
    return {
      made: true, grabbed: true, id: sk.id,
      x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
      k: d3.zoomTransform(document.getElementById('whiteboard-container')).k,
    };
  });
  console.log('sketch case', JSON.stringify(sketchCase));
  let sketchLines = null;
  let snapped = null;
  if (sketchCase.grabbed) {
    //: The group's left edge is the sketch's, 300; the target card's is 123.
    //: So the drag that can line them up is 177 board pixels to the left.
    const need = Math.round(-177 * (sketchCase.k || 1));
    await page.mouse.move(sketchCase.x, sketchCase.y);
    await page.mouse.down();
    for (const f of [0.3, 0.6, 0.9, 1, 1]) {
      await page.mouse.move(sketchCase.x + Math.round(need * f), sketchCase.y, { steps: 5 });
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(400);
    const read = await page.evaluate((id) => ({
      lines: [...(document.getElementById('wb-align-guides')?.querySelectorAll('line') || [])].length,
      d: document.querySelector(`.sketch-group[data-id="${id}"] .sketch-path`)?.getAttribute('d') || '',
    }), sketchCase.id);
    sketchLines = read.lines;
    snapped = read.d.startsWith('M 123 ');
    await page.mouse.up();
    await page.waitForTimeout(300);
    console.log('guide lines while dragging by the sketch:', sketchLines, 'snapped to the edge:', snapped);
  }

  const findings = [];
  if (sketchCase.grabbed && !sketchLines) {
    findings.push('a group dragged by a sketch drew no alignment guide');
  } else if (sketchCase.grabbed && !snapped) {
    findings.push('the guide was drawn but the sketch did not snap to the edge it named');
  }
  if (mid.selected < 2) findings.push(`the group selection did not survive the drag (${mid.selected} selected)`);
  if (!mid.lines.length) findings.push('no alignment guide was drawn while a group was dragged into line');
  else if (!mid.lines.some((l) => l.visible)) findings.push(`${mid.lines.length} guide line(s) exist but none has any extent on screen`);
  if (errors.length) findings.push(`${errors.length} page error(s): ${errors.slice(0, 2)}`);
  for (const line of findings) console.log(`    ${line}`);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
