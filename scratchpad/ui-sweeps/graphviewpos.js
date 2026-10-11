// GRAPH_PLAN Phase 5, "positions on a saved view" (INBOX 275's neighbour
// row): before this fix a saved view restored layout, colour, filters,
// groups and zoom, but not where the unpinned notes sat, so reopening a
// force-layout view was a fresh solution of the same forces rather than the
// picture that was saved. Measures both halves of the decision on record
// (GRAPH_PLAN, "Decision made, 2026-09-21"): a restored arrangement holds
// (case A, nothing added since the save) and only reheats for a genuinely
// unplaced note, holding every saved one still while it does (case B).
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=/opt/node22/lib/node_modules \
//     BASE=http://127.0.0.1:8791 node scratchpad/ui-sweeps/graphviewpos.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));

  // Seed enough linked notes that force layout actually has something to
  // solve (a one- or two-note graph settles trivially and would not tell
  // "held in place" apart from "nothing to move anyway").
  const seeded = await page.evaluate(async () => {
    const ids = [];
    for (let i = 0; i < 8; i++) {
      const created = await apiJson('/entries', {
        method: 'POST',
        body: JSON.stringify({ content: `graphviewpos fixture note ${i}`, is_draft: false }),
      });
      ids.push(created.id);
    }
    for (let i = 1; i < ids.length; i++) {
      await api(`/entries/${ids[0]}/links`, {
        method: 'POST',
        body: JSON.stringify({ target_id: ids[i] }),
      }).catch(() => {});
    }
    return ids;
  });

  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500); // let the worker settle the initial layout
  await page.waitForFunction(() => (graphNodesRef || []).length >= 8, null, { timeout: 60000 }); // slow machines draw late
  await page.waitForTimeout(1500);

  const captured = await page.evaluate(() => {
    const positions = {};
    for (const n of graphNodesRef || []) positions[n.id] = { x: n.x, y: n.y };
    return positions;
  });

  // Save the view through the same path a person uses: the More menu's
  // Save button and the app's own promptDialog overlay (graphviewmenu.js's
  // pattern).
  await page.click('#graph-more-menu summary');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('graph-view-save').click());
  await page.waitForTimeout(400);
  await page.fill('.confirm-overlay input[type="text"]', 'pos sweep');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  // What the view holds is the reference, not `captured`: on a loaded machine
  // the first layout is still settling (up to the worker's 20s budget) when
  // `captured` is read, and the save comes a second later (claim #238's 361
  // to 608px were partly that gap; it is printed below as captureVsSaved).
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('graph-saved-views')).find((v) => v.name === 'pos sweep').positions);

  // Disturb the layout: drag one node hard, so the simulation is somewhere
  // else entirely by the time the view is reapplied. A plain reheat
  // (physics slider) might resettle close to the same picture by chance;
  // dragging is the same gesture a real disturbance would be.
  await page.evaluate(() => {
    const n = (graphNodesRef || [])[0];
    if (n) {
      n.x += 400;
      n.y += 400;
    }
  });
  await page.evaluate(() => {
    const el = document.getElementById('graph-gravity');
    el.value = '90';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1500);

  console.log('displaced node id:', await page.evaluate(() => (graphNodesRef || [])[0]?.id));
  const disturbed = await page.evaluate(() => {
    const positions = {};
    for (const n of graphNodesRef || []) positions[n.id] = { x: n.x, y: n.y };
    return positions;
  });

  // Apply the saved view.
  await page.click('#graph-more-menu summary');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const sel = document.getElementById('graph-view-picker');
    sel.value = 'pos sweep';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  // Since INBOX 586 a computed layout glides to its place instead of cutting, so
  // "right after apply" at a fixed 300 ms measured the middle of the glide on a
  // loaded machine. Wait until the nodes stop moving (a step under 0.5 px for
  // four samples in a row, 12 s at most), then compare with what was saved.
  const settle = async () => {
    let prev = null, still = 0;
    for (let i = 0; i < 48 && still < 4; i++) {
      await page.waitForTimeout(250);
      const cur = await page.evaluate(() => (graphNodesRef || []).map((n) => [n.id, n.x, n.y]));
      if (prev) {
        const step = Math.max(0, ...cur.map((c, k) => (prev[k] && prev[k][0] === c[0] ? Math.hypot(c[1] - prev[k][1], c[2] - prev[k][2]) : 99)));
        still = step < 0.5 ? still + 1 : 0;
      }
      prev = cur;
    }
  };
  await settle();

  const soonAfterApply = await page.evaluate(() => {
    const positions = {};
    for (const n of graphNodesRef || []) positions[n.id] = { x: n.x, y: n.y };
    return positions;
  });

  await page.waitForTimeout(2000); // long after: must still hold, not re-settle

  const longAfterApply = await page.evaluate(() => {
    const positions = {};
    for (const n of graphNodesRef || []) positions[n.id] = { x: n.x, y: n.y };
    return positions;
  });

  const dist = (a, b, id) =>
    a[id] && b[id] ? Math.hypot(a[id].x - b[id].x, a[id].y - b[id].y) : Infinity;
  const ids = Object.keys(saved);
  const captureVsSaved = Math.round(Math.max(0, ...Object.keys(captured).filter((id) => saved[id]).map((id) => dist(captured, saved, id))));
  // d5567b1ec: the graph "fits to the middle", re-centring the world after a render, so
  // raw coordinates move together by a rigid shift while the picture is unchanged.
  // Compare the arrangement: remove the mean shift between the two maps, then take
  // the largest residual. A fresh force solution still shows as hundreds of px.
  const shifted = (a, b) => {
    const both = ids.filter((id) => a[id] && b[id]);
    const dx = both.reduce((t, id) => t + (a[id].x - b[id].x), 0) / (both.length || 1);
    const dy = both.reduce((t, id) => t + (a[id].y - b[id].y), 0) / (both.length || 1);
    const worst = both.map((id) => [id, Math.round(Math.hypot(a[id].x - b[id].x - dx, a[id].y - b[id].y - dy))]).sort((x, y) => y[1] - x[1]).slice(0, 4);
    return { dx: Math.round(dx), dy: Math.round(dy), n: both.length, worst, resid: Math.max(0, ...both.map((id) => Math.hypot(a[id].x - b[id].x - dx, a[id].y - b[id].y - dy))) };
  };
  const maxDriftFromDisturbed = Math.max(...ids.map((id) => dist(disturbed, soonAfterApply, id)));
  const savedShift = shifted(saved, soonAfterApply);
  const maxDriftFromSaved = savedShift.resid;
  const maxDriftAfterHolding = Math.max(...ids.map((id) => dist(soonAfterApply, longAfterApply, id)));

  // Case B: add a note *after* the save, then reapply. The saved notes
  // must stay close to their saved spot while the new one gets placed.
  // Linked to the first fixture note, so "placed near its links" has a
  // neighbour to be near.
  const newId = await page.evaluate(async (hub) => {
    const created = await apiJson('/entries', {
      method: 'POST',
      body: JSON.stringify({ content: 'graphviewpos fixture note added after save', is_draft: false }),
    });
    await api(`/entries/${created.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: hub }) }).catch(() => {});
    return created.id;
  }, seeded[0]);
  await page.evaluate(() => renderGraph());
  await page.waitForTimeout(1500);
  await page.click('#graph-more-menu summary');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const sel = document.getElementById('graph-view-picker');
    sel.value = 'pos sweep';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await settle(); // let the new note's own settle finish

  const withNewNote = await page.evaluate((newId) => {
    const positions = {};
    for (const n of graphNodesRef || []) positions[n.id] = { x: n.x, y: n.y };
    return { positions, newNodePresent: positions[newId] != null };
  }, newId);
  const newShift = shifted(saved, withNewNote.positions);
  const maxDriftWithNewNote = newShift.resid;
  const newToLink = Math.round(withNewNote.positions[newId] && withNewNote.positions[seeded[0]]
    ? Math.hypot(withNewNote.positions[newId].x - withNewNote.positions[seeded[0]].x, withNewNote.positions[newId].y - withNewNote.positions[seeded[0]].y)
    : Infinity);

  const ok = (v) => (v ? 'PASS' : 'FAIL');
  console.log(JSON.stringify({
    captureVsSaved,
    maxDriftFromDisturbed,
    maxDriftFromSaved,
    maxDriftAfterHolding,
    maxDriftWithNewNote,
    savedShift,
    newShift,
    newNodePresent: withNewNote.newNodePresent,
    newToLink,
    errors: errs,
  }, null, 1));
  // A few pixels of drift is the world-clamp's rigid recentring (it runs on
  // every render regardless, disturbed or not); the broken behaviour this
  // measures is two orders of magnitude bigger (hundreds of px, a fresh
  // force-layout solution), so the tolerance is generous on purpose rather
  // than tuned to this one run's exact note count.
  const HOLDS = 10;
  console.log(`disturbing the layout actually moved it (sanity): ${ok(maxDriftFromDisturbed > 50)}`);
  console.log(`applying the view restores the saved spots (case A): ${ok(maxDriftFromSaved < HOLDS)}`);
  console.log(`the restored picture holds rather than re-settling: ${ok(maxDriftAfterHolding < HOLDS)}`);
  console.log(`a note added since the save is placed (case B): ${ok(withNewNote.newNodePresent)}`);
  console.log(`the saved notes stayed put while it was (case B): ${ok(maxDriftWithNewNote < 20)}`);
  console.log(`the new note sits near its link (case B, under 200px): ${ok(newToLink < 200)}`);

  await browser.close();
  process.exit(
    maxDriftFromDisturbed > 50 && maxDriftFromSaved < HOLDS && maxDriftAfterHolding < HOLDS &&
      withNewNote.newNodePresent && maxDriftWithNewNote < 20
      ? 0
      : 1
  );
})();
