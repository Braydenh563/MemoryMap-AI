// The board's note card editor (DOCUMENTS_PLAN Phase 8c, the board half;
// documents-tail.md item 1). A concept map's Tab makes a branch and opens its
// card for typing (`wbEditNodeText`). This reads whether that editor is the
// app's one note engine (a CodeMirror view in a `.note-surface`) or a bare
// textarea, and whether its four behaviours hold either way:
//
//   Enter commits, Shift+Enter is a newline, Escape abandons, and a key
//   typed in the card never reaches the board's own gestures (Tab and
//   Enter make branches there).
//
//   BASE=http://127.0.0.1:8796 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node wbcardeditor.js
// EXPECT_SURFACE=1 fails when the card is still a bare textarea.
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.waitForTimeout(3000);
  const boardId = await page.evaluate(async () => {
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'Card editor probe' }) });
    const entry = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'Root idea for the probe' }) });
    await apiJson('/whiteboard/nodes', { method: 'POST', body: JSON.stringify({ entry_id: entry.id, board_id: board.id, x: 200, y: 200 }) });
    await loadEntries();
    switchTab('library');
    await new Promise((r) => setTimeout(r, 400));
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 1200));
    return board.id;
  });
  const nodeCount = () => page.evaluate(() => wbState.nodes.length);
  // Open an editor the way a person does: a branch off the root card.
  const openEditor = async () => {
    await page.evaluate(async () => {
      const root = wbState.nodes[0];
      await wbMindMapAddChild(root.id);
    });
    await page.waitForTimeout(900);
    return page.evaluate(() => {
      const box = document.querySelector('.wb-card-editor');
      const wrap = box?.closest('.note-surface');
      return {
        open: !!box,
        surface: !!wrap?.querySelector('.cm-editor'),
        focusInEditor: !!(wrap || box)?.contains(document.activeElement) || document.activeElement === box,
      };
    });
  };
  const findings = [];

  // 1. Enter commits the typed text.
  let s = await openEditor();
  console.log('editor:', JSON.stringify(s));
  const geo = await page.evaluate(() => {
    const card = document.querySelector('.wb-card-editor')?.closest('.node-card');
    const ed = card?.querySelector('.note-surface, .wb-card-editor');
    const c = card?.getBoundingClientRect();
    const e = ed?.getBoundingClientRect();
    return c && e ? { card: [Math.round(c.width), Math.round(c.height)], editor: [Math.round(e.width), Math.round(e.height)], inside: e.left >= c.left - 1 && e.right <= c.right + 1 && e.bottom <= c.bottom + 1 } : null;
  });
  console.log('geometry:', JSON.stringify(geo));
  if (geo && !geo.inside) findings.push('the editor spills out of its card');
  if (process.env.SHOTS) {
    const card = await page.$('.node-card:has(.wb-card-editor)');
    if (card) await card.screenshot({ path: `${process.env.SCRATCH || '.'}/shots/wbcardeditor-${process.env.THEME || 'light'}.png` });
  }
  if (!s.open) findings.push('Tab made no editor');
  if (process.env.EXPECT_SURFACE && !s.surface) findings.push('the card is a bare textarea, not the note engine');
  if (!s.focusInEditor) findings.push('the editor does not have the focus');
  const before = await nodeCount();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('First line');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('second line');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  const tabMadeBranch = (await nodeCount()) !== before;
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  const committed = await page.evaluate(() => {
    const node = wbState.nodes[wbState.nodes.length - 1];
    const entry = allEntries.find((e) => e.id === node.entry_id);
    return { text: entry?.content || '', editorGone: !document.querySelector('.wb-card-editor') };
  });
  console.log('after Enter:', JSON.stringify(committed), 'Tab made a branch:', tabMadeBranch);
  if (tabMadeBranch) findings.push('Tab typed in the card reached the board and made a branch');
  if (!committed.editorGone) findings.push('Enter did not close the editor');
  if (!/First line\s*\n\s*second line/.test(committed.text)) findings.push(`Enter did not save both lines: ${JSON.stringify(committed.text)}`);

  // 2. Escape abandons, and does not leave full screen or reach the board.
  s = await openEditor();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Thrown away');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  const abandoned = await page.evaluate(() => {
    const node = wbState.nodes[wbState.nodes.length - 1];
    const entry = allEntries.find((e) => e.id === node.entry_id);
    return { text: entry?.content || '', editorGone: !document.querySelector('.wb-card-editor') };
  });
  console.log('after Escape:', JSON.stringify(abandoned));
  if (!abandoned.editorGone) findings.push('Escape did not close the editor');
  if (abandoned.text.includes('Thrown away')) findings.push('Escape saved the text');

  // 3. Clicking away commits.
  s = await openEditor();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Kept by the blur');
  await page.mouse.click(1300, 820);
  await page.waitForTimeout(900);
  const blurred = await page.evaluate(() => {
    const node = wbState.nodes[wbState.nodes.length - 1];
    const entry = allEntries.find((e) => e.id === node.entry_id);
    return { text: entry?.content || '', editorGone: !document.querySelector('.wb-card-editor') };
  });
  console.log('after click away:', JSON.stringify(blurred));
  if (!blurred.editorGone) findings.push('clicking away did not close the editor');
  if (!blurred.text.includes('Kept by the blur')) findings.push('clicking away did not save');

  if (errors.length) findings.push(`${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
  await page.evaluate((id) => apiJson(`/whiteboard/boards/${id}`, { method: 'DELETE' }).catch(() => null), boardId);
  for (const f of findings) console.log('    ' + f);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
