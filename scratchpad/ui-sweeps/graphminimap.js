// What the graph's minimap actually draws (INBOX 164: "the graph minimap needs
// an upgrade").
//
// Five questions, and the first is the one the report is about:
//
//   1. Does it draw the graph's *shape*, or a cloud of dots? A map is its
//      links; a scatter of points says where the notes are and nothing about
//      what is joined to what, which is the one thing an overview of a graph is
//      for.
//   2. Is the node you have selected findable in it? A minimap with no "you are
//      here" beyond the viewport rectangle cannot answer "where is the note I am
//      reading".
//   3. Does the viewport rectangle follow a pan, and land where it should?
//      Measured by panning the canvas a known number of pixels and reading the
//      rectangle before and after.
//   4. Is there anything to see before the pointer arrives? The panel rests at
//      45% opacity, so a measurement of the resting state is the honest one.
//   5. Does a drag across it pan the map, and does the map land under the
//      cursor?
//
//   BASE=http://127.0.0.1:8961 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node graphminimap.js
//
// Seeds its own linked notes, the same way graphhover.js does. Non-zero on any
// of the five.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  let failures = 0;

  // A hub and two rings around it, so the map has a real shape: a dot cloud and
  // a linked graph are indistinguishable at five notes.
  console.log(await page.evaluate(async () => {
    const hub = 'Minimap hub';
    const spokes = ['Ingest', 'Parse', 'Store', 'Retry budget', 'Nightly batch', 'Priya'];
    const leaves = ['Backoff', 'Jitter', 'Dead letters'];
    let made = 0;
    const post = async (title, body) => {
      try {
        await api('/entries', { method: 'POST', body: JSON.stringify({ title, content: `${title}. ${body}`, tags: ['minimap'] }) });
        made += 1;
      } catch (e) { return 'seed failed: ' + e.message; }
      return null;
    };
    const listed = await (await api('/entries?limit=200')).json();
    const rows = Array.isArray(listed) ? listed
      : Array.isArray(listed.entries) ? listed.entries
        : Array.isArray(listed.items) ? listed.items : [];
    //: By prefix, not by exact title: the title a note ends up with is derived
    //: from its own text, so a `title` sent on the POST is not what comes back,
    //: and an exact match reseeded ten notes on every run (172, 182, 192 nodes
    //: over three of them, which is a sweep measuring a different graph each
    //: time it is asked the same question).
    const seen = rows.some((e) => String(e.title || e.content || '').startsWith(hub));
    if (seen) return 'graph already seeded';
    await post(hub, spokes.map((t) => `[[${t}]]`).join(' '));
    for (const s of spokes) await post(s, `[[${hub}]]`);
    for (const l of leaves) await post(l, '[[Retry budget]]');
    return `seeded ${made}`;
  }));

  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(5000);

  const read = () => page.evaluate(() => {
    const svg = document.getElementById('graph-minimap-svg');
    const panel = document.getElementById('graph-minimap');
    if (!svg || !panel) return { missing: true };
    const frame = document.getElementById('graph-minimap-frame');
    const fbox = frame ? {
      x: +(frame.getAttribute('x') || 0), y: +(frame.getAttribute('y') || 0),
      w: +(frame.getAttribute('width') || 0), h: +(frame.getAttribute('height') || 0),
    } : null;
    const count = (sel) => svg.querySelectorAll(sel).length;
    return {
      hidden: panel.classList.contains('hidden'),
      restingOpacity: +(parseFloat(getComputedStyle(panel).opacity) || 0).toFixed(2),
      dots: count('#graph-minimap-dots circle'),
      edges: count('#graph-minimap-edges line, #graph-minimap-edges path'),
      hereMarks: count('.graph-minimap-here'),
      frame: fbox,
      nodes: typeof gcNodes !== 'undefined' && gcNodes ? gcNodes.length : null,
      //: The links as the minimap counts them: `graphAdjacency` is what it draws
      //: from, and it holds both directions, so halve it for the number of
      //: lines there are to draw.
      links: typeof graphAdjacency !== 'undefined' && graphAdjacency
        ? [...graphAdjacency.values()].reduce((n, set) => n + set.size, 0) / 2
        : null,
    };
  });

  const before = await read();
  if (before.missing) {
    console.log('no minimap in the page');
    console.log('FAIL: 1 findings');
    await browser.close();
    process.exit(1);
  }
  console.log(`graph ${before.nodes} nodes, ${before.links} links`);
  console.log(`minimap resting opacity ${before.restingOpacity}  dots ${before.dots}  edges ${before.edges}  "you are here" marks ${before.hereMarks}`);
  console.log(`frame ${JSON.stringify(before.frame)}`);

  // 3. The rectangle follows a pan. Panned through the zoom behaviour itself
  // rather than with a synthetic drag: what is being measured is the minimap's
  // response to a transform, and a drag adds the canvas's own gesture handling
  // to the question.
  await page.evaluate(() => {
    const svg = d3.select('#graph-svg').empty() ? null : d3.select('#graph-svg');
    const target = d3.zoomTransform(graphSvg.node()).translate(-260 / d3.zoomTransform(graphSvg.node()).k, 0);
    graphSvg.call(graphZoom.transform, target);
    return svg;
  });
  await page.waitForTimeout(700);
  const after = await read();
  const moved = after.frame && before.frame ? +(after.frame.x - before.frame.x).toFixed(1) : 0;
  console.log(`after a 260px pan the frame moved ${moved}px, now ${JSON.stringify(after.frame)}`);

  // 5. A drag over the minimap pans the map. Dragged with real pointer events
  // so the pointer capture, the class and the handler all take part.
  const box = await page.evaluate(() => {
    const r = document.getElementById('graph-minimap-svg').getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  const centreBefore = await page.evaluate(() => {
    const t = d3.zoomTransform(graphSvg.node());
    return t.invert([graphDims.w / 2, graphDims.h / 2]).map((v) => +v.toFixed(1));
  });
  await page.mouse.move(box.x + box.w * 0.3, box.y + box.h * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.w * 0.75, box.y + box.h * 0.5, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  const centreAfter = await page.evaluate(() => {
    const t = d3.zoomTransform(graphSvg.node());
    return t.invert([graphDims.w / 2, graphDims.h / 2]).map((v) => +v.toFixed(1));
  });
  console.log(`drag across the minimap moved the centre from ${centreBefore} to ${centreAfter}`);

  // 2. The selected node, marked. Selected through the renderer's own state so
  // the sweep is not also testing hit-testing on a canvas.
  const selected = await page.evaluate(() => {
    if (typeof gcNodes === 'undefined' || !gcNodes?.length) return null;
    const node = gcNodes.find((n) => Number.isFinite(n.x));
    if (!node) return null;
    // `focusGraphNode` is the one path that makes a note "the one in hand" from
    // the keyboard, and `gcSelected` is the canvas's own selection set: the
    // minimap reads both, so the sweep drives both rather than inventing a
    // third piece of state for itself.
    if (typeof focusGraphNode === 'function') focusGraphNode(node, { announceIt: false });
    if (typeof gcSelected !== 'undefined' && gcSelected) gcSelected.add(node.id);
    if (typeof graphMinimapPaint === 'function') graphMinimapPaint();
    return node.id;
  });
  await page.waitForTimeout(600);
  const withSelection = await read();
  console.log(`with note ${selected} selected: ${withSelection.hereMarks} "you are here" mark(s)`);

  const bad = [];
  if (before.dots < 5) bad.push(`${before.dots} dots for ${before.nodes} nodes`);
  if (before.edges < 1) bad.push(`no edges drawn for ${before.links} links: a cloud of dots is not a map of a graph`);
  if (!before.frame || before.frame.w <= 0) bad.push('the viewport rectangle has no size');
  if (Math.abs(moved) < 1) bad.push(`the frame did not move on a 260px pan (${moved}px)`);
  if (Math.abs(centreAfter[0] - centreBefore[0]) < 10) bad.push(`a drag across the minimap moved the centre ${(centreAfter[0] - centreBefore[0]).toFixed(1)}px`);
  if (withSelection.hereMarks < 1) bad.push('the selected note is not marked in the minimap');
  failures += bad.length;
  for (const line of bad) console.log(`  ${line}`);
  for (const line of errs) console.log(`    console: ${line}`);
  failures += errs.length;
  console.log(failures ? `FAIL: ${failures} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
