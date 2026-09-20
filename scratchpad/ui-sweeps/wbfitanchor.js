// INBOX 267 (3), verbatim: "Double tap anchor resize nodes to auto size
// adjust".
//
// A `dblclick` on `.wb-resize-handle` calling `wbFitToText` is already in
// whiteboard.js, so this measures rather than rebuilds (CLAUDE.md: "already
// exists is not is good enough"). Two questions: does it actually change the
// card's height, and does anything on screen say the gesture exists?
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

  // A card holding far more text than its box: fitting it must make it taller.
  const setup = await page.evaluate(async () => {
    const long = Array.from({ length: 14 }, (_, i) => `Line ${i}: a sentence long enough to wrap at a card's width.`).join(' ');
    const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: long, category: 'General' }) });
    const n = await apiJson('/whiteboard/nodes', {
      method: 'POST',
      body: JSON.stringify({ entry_id: e.id, board_id: window.currentBoardId ?? null, x: 200, y: 160, z: 1, height: 90 }),
    });
    wbState.nodes.push(n);
    //: **The card's text comes from `allEntries`, not from the node row.**
    //: Without this the card renders its muted placeholder, one line tall,
    //: and the probe measures a fit-to-text against a card with no text in
    //: it: 21px of content in a 100px box, nothing to grow into, and a
    //: perfectly working gesture reported as broken. Measured exactly that
    //: way once already.
    if (typeof loadEntries === 'function') await loadEntries();
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 600));
    if (window.currentTool !== 'select' && typeof setWbTool === 'function') setWbTool('select');
    const card = document.querySelector(`.node-card[data-id="${n.id}"]`);
    card?.click();
    await new Promise((r) => setTimeout(r, 400));
    const handle = card?.querySelector('.wb-resize-handle[data-handle="se"]');
    const r = handle?.getBoundingClientRect();
    return {
      id: n.id,
      handles: card ? card.querySelectorAll('.wb-resize-handle').length : 0,
      //: What the handle says about itself. The rotate grip carries a title
      //: explaining its own modifier; if this one says nothing, the gesture
      //: is real and invisible, which is indistinguishable from missing.
      title: handle?.getAttribute('title') || '',
      before: card ? Math.round(card.getBoundingClientRect().height) : 0,
      at: r ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null,
    };
  });
  console.log('setup', JSON.stringify(setup));

  if (setup.at) {
    await page.mouse.dblclick(setup.at.x, setup.at.y);
    await page.waitForTimeout(1500);
  }
  const after = await page.evaluate((id) => {
    const card = document.querySelector(`.node-card[data-id="${id}"]`);
    return {
      height: card ? Math.round(card.getBoundingClientRect().height) : 0,
      //: `.wb-card-content` is the real class; the three guesses this
      //: replaces all missed, so the check fell back to the card itself,
      //: whose scroll height includes the eight resize handles sitting
      //: outside its edge on purpose and is therefore always a pixel or two
      //: past its client height. It reported clipping on a card that fits.
      clipped: card ? (() => {
        const body = card.querySelector('.wb-card-content');
        return body ? body.scrollHeight > body.clientHeight + 1 : null;
      })() : null,
      toast: document.querySelector('.toast')?.textContent?.trim() || '',
    };
  }, setup.id);
  console.log('after', JSON.stringify(after));

  const findings = [];
  if (!setup.handles) findings.push('the selected card has no resize handles at all');
  else if (!setup.at) findings.push('no south-east resize handle to double tap');
  else if (after.height <= setup.before + 4) {
    findings.push(`double tapping the handle did not resize the card (${setup.before}px then ${after.height}px)`);
  }
  if (setup.handles && !setup.title) {
    findings.push('the resize handle says nothing about the double tap, so the gesture is invisible');
  }
  if (after.clipped) findings.push('the card is still clipping its text after being fitted to it');
  if (errors.length) findings.push(`${errors.length} page error(s): ${errors.slice(0, 2)}`);
  for (const line of findings) console.log(`    ${line}`);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
