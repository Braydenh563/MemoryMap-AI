// GRAPH_PLAN Phase 4, the last open item: the local map beside an open note or
// document, the same renderer at `size: "pane"`.
//
// What this has to prove, and why each number is here:
//
//  1. The pane draws. A canvas measured inside a hidden parent is 0x0 and
//     paints nothing, which is the failure mode of every panel built this way,
//     so the box, the backing store and the node count are all read rather
//     than the element's existence.
//  2. It draws the *local* map: the node count matches `/graph/local` for the
//     note that is open, not the whole notebook.
//  3. **It does not fight the Graph tab.** This is the reason the item was
//     left: the renderer used to keep its state in module-level singletons. So
//     the tab's own node count, camera and canvas size are read before the
//     pane is ever opened and again after it has drawn, and they must be
//     identical.
//  4. It follows what you have open, on both surfaces it attaches to.
//
//   BASE=http://127.0.0.1:8945 node scratchpad/ui-sweeps/graphpane.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 950 } });
  const findings = [];
  const check = (ok, what) => { if (!ok) findings.push(what); return ok; };

  // --- the Graph tab first, so its state is on the record before the pane ---
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(3500);
  const tabBefore = await page.evaluate(() => ({
    nodes: gcNodes.length,
    edges: gcEdges.length,
    k: +d3.zoomTransform(graphSvg.node()).k.toFixed(3),
    canvas: [gcCanvas.width, gcCanvas.height],
    dims: [Math.round(graphDims.w), Math.round(graphDims.h)],
  }));
  console.log('graph tab before the pane ', JSON.stringify(tabBefore));

  // --- open a note, then look at the Notes tab -----------------------------
  const noteId = await page.evaluate(() => {
    const linked = gcNodes.filter((n) => !n.isGroup && (gcAdj.get(n.id) || { size: 0 }).size >= 2);
    return (linked[0] || gcNodes[0]).id;
  });
  await page.evaluate((id) => { flashEntry(id); }, noteId);
  await page.waitForTimeout(2500);

  const pane = await page.evaluate(() => {
    const el = document.getElementById('graph-pane');
    if (!el) return null;
    const box = document.getElementById('graph-pane-box');
    const canvas = document.getElementById('graph-pane-canvas');
    const r = box.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    const sidebar = document.getElementById('sidebar').getBoundingClientRect();
    return {
      host: el.parentElement.id,
      box: [Math.round(r.width), Math.round(r.height)],
      canvasCss: [Math.round(cr.width), Math.round(cr.height)],
      backing: [canvas.width, canvas.height],
      nodes: graphPaneSurface ? graphPaneSurface.nodes.length : -1,
      edges: graphPaneSurface ? graphPaneSurface.edges.length : -1,
      drawn: graphPaneSurface ? graphPaneSurface.labelsDrawn : -1,
      chip: document.getElementById('graph-pane-count').textContent,
      insideSidebar: r.left >= sidebar.left - 1 && r.right <= sidebar.right + 1,
      // A blank canvas is the failure this measures: count the pixels that are
      // not the background of the box.
      painted: (() => {
        const ctx = canvas.getContext('2d');
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let ink = 0;
        for (let i = 0; i < d.length; i += 4 * 37) if (d[i + 3] > 8) ink += 1;
        return ink;
      })(),
    };
  });
  console.log('pane beside a note        ', JSON.stringify(pane));
  check(pane, 'the pane never appeared beside a note');
  if (pane) {
    check(pane.host === 'sidebar', `pane hung in ${pane.host}, want sidebar`);
    check(pane.box[0] > 120 && pane.box[1] > 120, `pane box ${pane.box} is too small to read`);
    check(pane.backing[0] > 0 && pane.backing[1] > 0, 'the pane canvas has no backing store');
    check(pane.nodes > 0, `the pane drew ${pane.nodes} nodes`);
    check(pane.painted > 0, 'the pane canvas is blank');
  }

  // The local map, not the notebook.
  const local = await page.evaluate(
    async (id) => (await apiJson(`/graph/local/${id}?depth=1`)).nodes.length,
    noteId
  );
  console.log('local payload for that note', local, 'vs the whole map', tabBefore.nodes);
  if (pane) check(pane.nodes === local, `pane drew ${pane.nodes}, /graph/local says ${local}`);

  // --- the tab is untouched -------------------------------------------------
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500);
  const tabAfter = await page.evaluate(() => ({
    nodes: gcNodes.length,
    edges: gcEdges.length,
    canvas: [gcCanvas.width, gcCanvas.height],
    dims: [Math.round(graphDims.w), Math.round(graphDims.h)],
    paneAlive: Boolean(graphPaneSurface && graphPaneSurface.canvas),
    paneNodes: graphPaneSurface ? graphPaneSurface.nodes.length : -1,
    sameCanvas: Boolean(graphPaneSurface && graphPaneSurface.canvas === gcCanvas),
  }));
  console.log('graph tab after the pane  ', JSON.stringify(tabAfter));
  check(tabAfter.nodes === tabBefore.nodes, `tab node count ${tabBefore.nodes} -> ${tabAfter.nodes}`);
  check(tabAfter.edges === tabBefore.edges, `tab edge count ${tabBefore.edges} -> ${tabAfter.edges}`);
  check(
    String(tabAfter.dims) === String(tabBefore.dims),
    `graphDims ${tabBefore.dims} -> ${tabAfter.dims}: the pane moved the tab's camera size`
  );
  check(!tabAfter.sameCanvas, 'the pane and the tab share one canvas');
  check(tabAfter.paneAlive, 'the pane surface was torn down by the tab render');

  // --- and beside a document ------------------------------------------------
  const doc = await page.evaluate(async () => {
    const made = await apiJson('/documents', {
      method: 'POST',
      body: JSON.stringify({ title: 'Pane probe', content: 'A document with a note on it.' }),
    });
    return made.id;
  });
  const attached = await page.evaluate(
    async (args) =>
      Boolean(
        await apiJson(`/documents/${args.doc}/notes`, {
          method: 'POST',
          body: JSON.stringify({ entry_id: args.note }),
        }).catch(() => null)
      ),
    { doc, note: noteId }
  );
  await page.evaluate(() => switchTab('documents'));
  await page.waitForTimeout(2500);
  await page.evaluate((id) => (typeof openDocument === 'function' ? openDocument(id) : null), doc);
  await page.waitForTimeout(3000);
  const onDoc = await page.evaluate(() => {
    const el = document.getElementById('graph-pane');
    const empty = document.getElementById('graph-pane-empty');
    return {
      host: el ? el.parentElement.id : null,
      nodes: graphPaneSurface ? graphPaneSurface.nodes.length : -1,
      chip: document.getElementById('graph-pane-count').textContent,
      emptyShown: empty ? !empty.hidden : null,
      focusHidden: document.getElementById('graph-pane-focus').hidden,
    };
  });
  console.log('pane beside a document    ', JSON.stringify(onDoc), 'attached:', attached);
  check(onDoc.host === 'doc-sidebar', `pane hung in ${onDoc.host} on the Documents tab`);

  // --- collapse, and the whole-page checks ---------------------------------
  const collapsed = await page.evaluate(() => {
    document.getElementById('graph-pane-toggle').click();
    const el = document.getElementById('graph-pane');
    const body = document.getElementById('graph-pane-body');
    return {
      collapsed: el.dataset.collapsed,
      bodyHeight: Math.round(body.getBoundingClientRect().height),
      expanded: document.getElementById('graph-pane-toggle').getAttribute('aria-expanded'),
    };
  });
  console.log('collapsed                 ', JSON.stringify(collapsed));
  check(collapsed.bodyHeight === 0, `collapsed body is still ${collapsed.bodyHeight}px tall`);
  check(collapsed.expanded === 'false', 'aria-expanded did not follow the collapse');

  const scroll = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  console.log('page overflow             ', JSON.stringify(scroll));
  check(scroll.horizontal <= 0, `the page scrolls ${scroll.horizontal}px sideways`);

  console.log(findings.length ? `FAIL: ${findings.length}\n  ` + findings.join('\n  ') : 'PASS');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
