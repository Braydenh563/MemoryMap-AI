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
  await page.waitForTimeout(300); // right after apply: case A must already hold

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
  const ids = Object.keys(captured);
  const maxDriftFromDisturbed = Math.max(...ids.map((id) => dist(disturbed, soonAfterApply, id)));
  const maxDriftFromSaved = Math.max(...ids.map((id) => dist(captured, soonAfterApply, id)));
  const maxDriftAfterHolding = Math.max(...ids.map((id) => dist(soonAfterApply, longAfterApply, id)));

  // Case B: add a note *after* the save, then reapply. The saved notes
  // must stay close to their saved spot while the new one gets placed.
  const newId = await page.evaluate(async () => {
    const created = await apiJson('/entries', {
      method: 'POST',
      body: JSON.stringify({ content: 'graphviewpos fixture note added after save', is_draft: false }),
    });
    return created.id;
  });
  await page.evaluate(() => renderGraph());
  await page.waitForTimeout(1500);
  await page.click('#graph-more-menu summary');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const sel = document.getElementById('graph-view-picker');
    sel.value = 'pos sweep';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(3000); // let the new note's own settle finish

  const withNewNote = await page.evaluate((newId) => {
    const positions = {};
    for (const n of graphNodesRef || []) positions[n.id] = { x: n.x, y: n.y };
    return { positions, newNodePresent: positions[newId] != null };
  }, newId);
  const maxDriftWithNewNote = Math.max(...ids.map((id) => dist(captured, withNewNote.positions, id)));

  const ok = (v) => (v ? 'PASS' : 'FAIL');
  console.log(JSON.stringify({
    maxDriftFromDisturbed,
    maxDriftFromSaved,
    maxDriftAfterHolding,
    maxDriftWithNewNote,
    newNodePresent: withNewNote.newNodePresent,
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

  await browser.close();
  process.exit(
    maxDriftFromDisturbed > 50 && maxDriftFromSaved < HOLDS && maxDriftAfterHolding < HOLDS &&
      withNewNote.newNodePresent && maxDriftWithNewNote < 20
      ? 0
      : 1
  );
})();
