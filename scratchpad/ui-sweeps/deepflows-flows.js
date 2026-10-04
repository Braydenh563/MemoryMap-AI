// The flows deepflows.js runs. Each is `async (env) => {...}` and throws on a
// broken expectation; page errors, bad responses and overflow are collected by
// the runner. See deepflows.js for the env fields.
const flows = {};

//: Poll `fn` (run in the page) until it returns something truthy, up to `ms`.
async function until(env, fn, arg, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await env.js(fn, arg);
    if (v) return v;
    if (Date.now() > end) return null;
    await env.wait(250);
  }
}

//: A note made through the API, as a fixture for flows that are not about making one.
async function fixtureNote(env, text, extra = {}) {
  return env.js(async ([content, more]) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, ...more }) }), [text, extra]);
}

//: Phone: the open note page goes back to the list.
async function closeNotePage(env) {
  const back = env.page.locator('.sheet-overlay[data-sheet="note"] .sheet-close');
  if (await back.count()) {
    await back.first().click();
    await env.wait(450);
  }
}

//: Press the dark confirm button of a confirmDialog (the one that is not Cancel).
async function confirmYes(env) {
  const yes = env.page.locator('.confirm-overlay .confirm-actions button:not(:has-text("Cancel"))').last();
  await yes.waitFor({ state: 'visible', timeout: 4000 });
  await yes.click();
  await env.wait(700);
}

//: A note's row in the Your notes list, by id.
const rowSel = (id) => `#entry-list > li[data-id="${id}"]`;

async function showNotesList(env) {
  await closeNotePage(env);
  await env.js(() => switchTab('notes'));
  await env.wait(500);
  await env.js(() => loadEntries());
  await env.js(() => document.querySelector('[data-section="browse"]')?.click());
  await env.wait(1200);
}

//: Save a new note the way a person does: New note, type, Save.
async function createNote(env, text) {
  await env.js(() => switchTab('notes'));
  await env.wait(400);
  if (await env.page.isVisible('#notes-new-note')) await env.page.click('#notes-new-note');
  else await env.js(() => startNewNote());
  await env.wait(900);
  env.at('click the capture box');
  await env.page.locator('#capture .cm-content').first().click({ timeout: 6000 });
  env.at('type the note');
  await env.page.keyboard.type(text);
  await env.page.click('#save-btn');
  const found = await until(env, async (s) => {
    const body = await apiJson('/entries?limit=10');
    const list = Array.isArray(body) ? body : body.entries || [];
    return list.find((e) => e.content.includes(s)) || null;
  }, text, 20000);
  if (!found) throw new Error('saved note never reached /entries');
  return found;
}

//: Open the row's "More actions" menu and press the item whose text contains `label`.
async function rowMenu(env, id, label, group = null) {
  await openRow(env, id);
  await actionsOf(env, id).locator('button[aria-label="More actions"]').first().click();
  await env.wait(250);
  if (group) {
    await env.page.locator('[role="menuitem"]:visible', { hasText: new RegExp(`^\\s*${group}\\s*›?\\s*$`) }).first().click();
    await env.wait(300);
  }
  const item = env.page.locator('[role="menuitem"]:visible', { hasText: label }).first();
  await item.waitFor({ state: 'visible', timeout: 4000 });
  await item.click();
  await env.wait(500);
}

//: Make a row's actions reachable. Desktop: click the card. Phone: the tap
//: opens the note as a page, whose actions are in the thumb bar.
async function openRow(env, id) {
  if (env.phone) {
    //: One page at a time: another note's page is put away first.
    const open = await env.page.$('.sheet-overlay[data-sheet="note"] .sheet-title, .sheet-overlay[data-sheet="note"] h2');
    if (open && !(await env.page.locator('.sheet-overlay[data-sheet="note"] .note-page-list > li').first().getAttribute('data-id').then((v) => v === String(id), () => false))) await closeNotePage(env);
    if (await env.page.$('.sheet-overlay[data-sheet="note"] .note-page-bar')) return;
    const li = env.page.locator(rowSel(id));
    await li.scrollIntoViewIfNeeded();
    await li.locator('.entry-content').first().tap({ position: { x: 20, y: 8 } });
    await env.page.waitForSelector('.sheet-overlay[data-sheet="note"] .note-page-bar', { timeout: 4000 });
    return;
  }
  const li = env.page.locator(rowSel(id));
  await li.scrollIntoViewIfNeeded();
  if (!(await li.locator('button[aria-label="More actions"]').first().isVisible().catch(() => false))) {
    await li.locator('.entry-content').first().click({ position: { x: 20, y: 8 } });
    await env.wait(500);
  }
}

//: Where a note's own action buttons are: on its row, or in the phone page's bar.
const actionsOf = (env, id) => env.page.locator(env.phone ? '.sheet-overlay[data-sheet="note"] .note-page-bar' : rowSel(id));

flows.note = async (env) => {
  const text = `Deep flow note ${env.STAMP}${env.width} ${env.theme}`;
  const made = await createNote(env, text);
  env.at('find the new note in the list');
  await showNotesList(env);
  if (!(await env.page.isVisible(rowSel(made.id)))) throw new Error('new note is not in the list');
  await env.overflow('list with the new note');
  env.at('open the row and press Edit');
  await openRow(env, made.id);
  await actionsOf(env, made.id).locator('button[aria-label="Edit this entry"]').first().click();
  await env.wait(800);
  await env.overflow('edit form');
  env.at('type into the edit form');
  const edited = `${text} EDITED`;
  const surface = env.page.locator('#entry-list .note-edit-box ~ .cm-editor .cm-content, #entry-list li .cm-content').first();
  if (await surface.count()) {
    await surface.click();
    await env.page.keyboard.press('End');
    await env.page.keyboard.type(' EDITED');
  } else {
    await env.page.locator('#entry-edit-content').fill(edited);
  }
  await env.wait(400);
  env.at('Save changes');
  await env.page.locator('#entry-list button:has-text("Save changes")').first().click();
  await env.wait(1200);
  const after = await env.js(async (id) => (await apiJson(`/entries/${id}`)).content, made.id);
  if (!after.includes('EDITED')) throw new Error(`edit did not save: ${after.slice(0, 80)}`);
  env.at('Move to bin');
  // Delete: bin, then Undo from the toast restores it.
  await showNotesList(env);
  await rowMenu(env, made.id, 'Move to bin');
  await env.wait(900);
  //: A binned note answers 404 on its own route (the bin is read through the
  //: Library), so the 404 is the expected sign and the flow says so.
  env.expect(404, `/entries/${made.id}`);
  const live = (id) => env.js(async (i) => { const r = await fetch(`/entries/${i}`, { headers: { 'X-Auth-Token': authToken() } }); return r.status === 200; }, id);
  if (await live(made.id)) throw new Error('after Move to bin the note is still live');
  await env.overflow('after bin');
  env.at('Undo');
  await env.page.getByRole('button', { name: 'Undo' }).first().click();
  await env.wait(1200);
  if (!(await live(made.id))) throw new Error('Undo did not restore the note');
  // Clean up behind ourselves.
  await env.js(async (id) => { await api(`/entries/${id}`, { method: 'DELETE' }); }, made.id);
};

flows.private = async (env) => {
  const made = await fixtureNote(env, `Private flow ${env.STAMP}${env.width}${env.theme} secret text`);
  await showNotesList(env);
  env.at('Make private');
  await rowMenu(env, made.id, 'Make private');
  await confirmYes(env);
  await env.wait(800);
  let now = await env.js(async (id) => (await apiJson(`/entries/${id}`)).is_private, made.id);
  if (!now) throw new Error('note is not private after Make private');
  await showNotesList(env);
  const chip = await env.page.locator(`${rowSel(made.id)} >> text=/^\\s*private/`).count();
  if (!chip) throw new Error('the row has no private chip');
  await env.overflow('a private row');
  env.at('Make readable');
  await rowMenu(env, made.id, 'Make readable');
  await env.wait(900);
  now = await env.js(async (id) => (await apiJson(`/entries/${id}`)).is_private, made.id);
  if (now) throw new Error('note is still private after Make readable');
  const text = await env.js(async (id) => (await apiJson(`/entries/${id}`)).content, made.id);
  if (!text.includes('secret text')) throw new Error(`the text did not survive the round trip: ${text.slice(0, 60)}`);
  await env.js(async (id) => { await api(`/entries/${id}`, { method: 'DELETE' }); await api(`/entries/${id}/purge`, { method: 'DELETE' }); }, made.id);
};

flows.link = async (env) => {
  const a = await fixtureNote(env, `Link flow A ${env.STAMP}${env.width}${env.theme}`);
  const b = await fixtureNote(env, `Link flow B ${env.STAMP}${env.width}${env.theme}`);
  await showNotesList(env);
  env.at('Link to another on A');
  await rowMenu(env, a.id, 'Link to another', 'Connect');
  await showNotesList(env);
  env.at('Link to another on B');
  await rowMenu(env, b.id, 'Link to another', 'Connect');
  await env.wait(1200);
  const links = await env.js(async (id) => (await apiJson(`/entries/${id}`)).links.map((l) => l.entry_id), a.id);
  if (!links.includes(b.id)) throw new Error(`A is not linked to B: ${JSON.stringify(links)}`);
  await showNotesList(env);
  await env.overflow('linked rows');
  // A [[wiki link]] typed in a note makes a link too, and an aliased one draws its shown words.
  const c = await fixtureNote(env, `Link flow C ${env.STAMP}${env.width}${env.theme} points at [[Link flow B ${env.STAMP}${env.width}${env.theme}|the second one]]`);
  await showNotesList(env);
  const label = await env.js((id) => document.querySelector(`#entry-list > li[data-id="${id}"] .wiki-link`)?.textContent || null, c.id);
  if (label !== 'the second one') throw new Error(`an aliased [[A|B]] link draws "${label}", not "the second one"`);
  const cLinks = await env.js(async (id) => (await apiJson(`/entries/${id}`)).links.map((l) => l.entry_id), c.id);
  if (!cLinks.includes(b.id)) throw new Error('the [[wiki|alias]] link was not stored');
  for (const n of [a, b, c]) await env.js(async (id) => { await api(`/entries/${id}`, { method: 'DELETE' }); await api(`/entries/${id}/purge`, { method: 'DELETE' }); }, n.id);
};

//: Where a graph node, or the middle of a link, is on the screen. Read from the
//: canvas's own state (`gcTab`, graph-canvas.js) so the click goes through the
//: same hit-test a person's does.
const graphPoints = () => {
  const s = gcTab;
  const r = s.canvas.getBoundingClientRect();
  const t = s.transform || d3.zoomIdentity;
  const onScreen = ([x, y]) => x > r.left + 20 && x < r.right - 20 && y > r.top + 20 && y < r.bottom - 20;
  const screen = (x, y) => { const p = t.apply([x, y]); return [r.left + p[0], r.top + p[1]]; };
  const world = ([sx, sy]) => t.invert([sx - r.left, sy - r.top]);
  const nodes = s.nodes.filter((n) => Number.isFinite(n.x) && onScreen(screen(n.x, n.y)) && (n.degree || 0) > 0)
    .sort((a, b) => (b.degree || 0) - (a.degree || 0));
  let node = null;
  for (const n of nodes) {
    const [sx, sy] = screen(n.x, n.y);
    const w = world([sx, sy]);
    if (gcNodeAtWorld(w[0], w[1], s) === n) { node = { id: n.id, x: sx, y: sy, preview: n.preview }; break; }
  }
  let link = null;
  for (const e of s.edges) {
    if (e.kind !== 'link' || !e.source || !e.target || !Number.isFinite(e.source.x)) continue;
    const a = e.source; const b = e.target;
    const curved = !s.tree && gcCurvedLinks(s);
    let mx = (a.x + b.x) / 2; let my = (a.y + b.y) / 2;
    if (curved) { const c = gcBowPoint(a, b); mx = 0.25 * a.x + 0.5 * c.x + 0.25 * b.x; my = 0.25 * a.y + 0.5 * c.y + 0.25 * b.y; }
    const sp = screen(mx, my);
    if (!onScreen(sp)) continue;
    const w = world(sp);
    if (gcNodeAtWorld(w[0], w[1], s)) continue;
    if (gcEdgeAtWorld(w[0], w[1], s) === e) { link = { x: sp[0], y: sp[1], a: a.id, b: b.id }; break; }
  }
  return { node, link, total: s.nodes.length, edges: s.edges.length };
};

flows.graph = async (env) => {
  await env.js(() => switchTab('graph'));
  env.at('wait for the graph to draw');
  const ready = await until(env, () => typeof gcTab !== 'undefined' && gcTab.nodes && gcTab.nodes.length > 5 && gcTab.canvas.width > 0, null, 15000);
  if (!ready) throw new Error('the graph never drew nodes');
  await env.wait(3000); // let the layout settle
  await env.overflow('graph');
  let pts = await env.js(graphPoints);
  if (!pts.node) throw new Error(`no clickable node among ${pts.total}`);
  env.at('click a node');
  await env.page.mouse.click(pts.node.x, pts.node.y);
  await env.wait(900);
  const popup = await env.js(() => typeof graphPopupId !== 'undefined' ? graphPopupId : null);
  if (popup == null) throw new Error(`clicking node ${pts.node.id} (${pts.node.preview}) opened no popup`);
  await env.overflow('node popup');
  await env.page.keyboard.press('Escape');
  await env.wait(500);
  pts = await env.js(graphPoints);
  if (!pts.link) throw new Error(`no clickable link among ${pts.edges} edges`);
  env.at('click a link');
  await env.page.mouse.click(pts.link.x, pts.link.y);
  await env.wait(700);
  if (!(await env.page.$('#graph-link-peek'))) throw new Error('clicking a link opened no peek');
  await env.overflow('link peek');
  await env.page.keyboard.press('Escape');
  await env.wait(300);
};

//: Library > Boards & maps, then open the board called `title`.
async function openBoardByTitle(env, title) {
  await env.js(() => switchTab('library'));
  await env.wait(900);
  await env.js(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await env.wait(1500);
  await env.page.locator('#library-view-whiteboard').getByText(title, { exact: true }).first().click();
  await env.page.waitForSelector('#wb-back-to-boards', { state: 'visible', timeout: 8000 });
  await env.wait(1500);
}

const boardId = (env, title) => env.js(async (t) => (await apiJson('/whiteboard/boards')).find((b) => b.title === t)?.id, title);

flows.mindmap = async (env) => {
  const id = await boardId(env, 'Bubble tea');
  if (!id) throw new Error('the seeded map is missing (run deepflows-seed.js)');
  const flat = (i) => env.js(async (b) => {
    const out = [];
    const walk = (list) => { for (const n of list || []) { out.push(n); walk(n.children); } };
    walk((await apiJson(`/whiteboard/boards/${b}/tree`)).roots);
    return out.map((n) => ({ id: n.id, text: n.text }));
  }, i);
  const count = async () => (await flat(id)).length;
  const before = await count();
  env.at('open the map');
  await openBoardByTitle(env, 'Bubble tea');
  await env.overflow('map open');
  env.at('select the root topic');
  await env.page.locator('.wb-map-node, [data-map-node], .wb-card').filter({ hasText: /^Bubble tea/ }).first().click({ position: { x: 20, y: 10 } });
  await env.wait(700);
  env.at('Add a child topic');
  const add = env.page.locator('button[aria-label="Add a child topic"]:visible').first();
  await add.click();
  await env.wait(700);
  await env.page.keyboard.type(`Topic ${env.STAMP}${env.width}${env.theme}`);
  await env.page.keyboard.press('Enter');
  await env.wait(1500);
  const after = await count();
  if (after !== before + 1) throw new Error(`the map has ${after} topics, wanted ${before + 1}`);
  await env.overflow('after adding a topic');
  // Leave the map as found.
  const added = (await flat(id)).filter((n) => /^Topic df/.test(n.text || '')).map((n) => n.id);
  for (const nid of added) await env.js(async (n) => { await api(`/whiteboard/objects/${n}`, { method: 'DELETE' }); }, nid);
  await env.js(() => document.getElementById('wb-back-to-boards')?.click());
  await env.wait(500);
};

flows.whiteboard = async (env) => {
  const id = await boardId(env, 'Launch plan');
  if (!id) throw new Error('the seeded board is missing (run deepflows-seed.js)');
  const objects = (i) => env.js(async (b) => (await apiJson(`/whiteboard/?board_id=${b}`)).objects.map((o) => ({ id: o.id, kind: o.kind, data: o.data })), i);
  const before = await objects(id);
  env.at('open the board');
  await openBoardByTitle(env, 'Launch plan');
  await env.overflow('board open');
  env.at('Insert > Sticky note');
  await env.page.locator('button[title="Add something to the board"]:visible').first().click();
  await env.page.locator('[role="menuitem"]:visible', { hasText: 'Sticky note' }).first().click();
  await env.wait(400);
  const stage = await env.page.locator('#wb-stage, #whiteboard-stage, .wb-stage, #wb-canvas').first().boundingBox().catch(() => null);
  const x = stage ? stage.x + stage.width * 0.55 : env.width * 0.55;
  const y = stage ? stage.y + stage.height * 0.5 : 400;
  env.at('click the canvas to drop the sticky');
  await env.page.mouse.click(x, y);
  await env.wait(700);
  await env.page.keyboard.type(`Sticky ${env.STAMP}${env.width}${env.theme}`);
  await env.page.keyboard.press('Escape');
  await env.wait(1500);
  const after = await objects(id);
  const made = after.filter((o) => !before.some((b) => b.id === o.id));
  if (made.length !== 1) throw new Error(`wanted one new object, found ${made.length}: ${JSON.stringify(made).slice(0, 160)}`);
  if (!JSON.stringify(made[0].data).includes('Sticky df')) throw new Error(`the sticky holds no text: ${JSON.stringify(made[0]).slice(0, 160)}`);
  await env.overflow('sticky placed');
  for (const o of made) await env.js(async (n) => { await api(`/whiteboard/objects/${n}`, { method: 'DELETE' }); }, o.id);
  await env.js(() => document.getElementById('wb-back-to-boards')?.click());
  await env.wait(500);
};

flows.document = async (env) => {
  const original = '# Trip plan\n\nFlights, hotel and a list of places to see.';
  const doc = await env.js(async () => (await apiJson('/documents')).find((d) => d.title === 'Trip plan'));
  if (!doc) throw new Error('the seeded document is missing (run deepflows-seed.js)');
  const restore = () => env.js(async ([id, text]) => { await api(`/documents/${id}`, { method: 'PUT', body: JSON.stringify({ title: 'Trip plan', content: text }) }); }, [doc.id, original]);
  const content = () => env.js(async (id) => (await apiJson(`/documents/${id}`)).content, doc.id);
  try {
    env.at('open the document');
    await env.js(() => switchTab('library'));
    await env.wait(900);
    await env.js(() => document.querySelector('#library-subtabs [data-target="library-view-documents"]')?.click());
    await env.wait(1500);
    await env.page.locator('#library-view-documents').getByText('Trip plan', { exact: true }).first().click();
    //: A phone opens a document to read it; Edit is one press away.
    await env.page.waitForSelector('#doc-back', { state: 'visible', timeout: 8000 });
    await env.wait(1000);
    if (!(await env.page.isVisible('#tab-documents .cm-content'))) {
      await env.page.locator('button[title="Edit the document"]:visible').first().click();
    }
    await env.page.waitForSelector('#tab-documents .cm-content', { state: 'visible', timeout: 8000 });
    await env.wait(800);
    await env.overflow('document open');
    env.at('type into the document');
    await env.page.locator('#tab-documents .cm-content').first().click();
    await env.page.keyboard.press('Control+End');
    await env.page.keyboard.type(` Typed ${env.STAMP}${env.width}${env.theme}.`);
    env.at('add a properties block');
    await env.page.keyboard.press('Control+Home');
    await env.page.keyboard.type('---\nstatus: draft\n---\n');
    await env.page.waitForSelector('.doc-props input.doc-prop-input', { state: 'visible', timeout: 5000 });
    await env.overflow('properties panel');
    env.at('set the property');
    const field = env.page.locator('.doc-props input.doc-prop-input:not(.doc-prop-new-input)').first();
    await field.fill('done');
    await field.press('Enter');
    await env.wait(2500); // autosave
    const text = await content();
    if (!/status:\s*done/.test(text)) throw new Error(`the property did not reach the file: ${JSON.stringify(text.slice(0, 60))}`);
    if (!text.includes(`Typed ${env.STAMP}${env.width}${env.theme}.`)) throw new Error('typed text did not save');
    // Back to the list through the document's own back button.
    await env.js(() => document.getElementById('doc-back')?.click());
    await env.wait(600);
  } finally {
    await restore();
  }
};

//: No model is connected in the sandbox, so the answer is the graceful one: the
//: notes' own words and a way to connect a model, never an error.
flows.ask = async (env) => {
  await env.js(() => switchTab('notes'));
  await env.wait(600);
  await env.js(() => document.querySelector('[data-section="ask"]')?.click());
  await env.wait(900);
  env.at('type the question');
  await env.page.fill('#question', 'What is in Alpha project?');
  await env.page.press('#question', 'Enter');
  env.at('wait for the answer');
  const answer = await until(env, () => {
    const t = document.querySelector('#ai-answer')?.innerText || '';
    return t.trim().length > 30 && !/Searching your notes|Stargazing/.test(t) ? t : null;
  }, null, 20000);
  if (!answer) throw new Error('no answer was drawn');
  if (!/no model|isn.t running|not running|not connected/i.test(answer)) throw new Error(`the no-model answer does not say so: ${answer.slice(0, 120)}`);
  if (/error|traceback|undefined|\[object/i.test(answer)) throw new Error(`the answer carries a raw error: ${answer.slice(0, 160)}`);
  await env.overflow('ask answer');
  const connect = await env.page.locator('button:has-text("Connect a model")').count();
  if (!connect) throw new Error('the no-model state offers no way to connect one');
};

flows.notifications = async (env) => {
  const k = `${env.STAMP}${env.width}${env.theme}`;
  await env.js(([key]) => {
    recordNotification({ kind: 'job', title: `Sweep one ${key}`, detail: 'first', key: `sweep:${key}:1` });
    recordNotification({ kind: 'job', title: `Sweep two ${key}`, detail: 'second', key: `sweep:${key}:2` });
  }, [k]);
  env.at('open the bell');
  await env.page.locator('#notif-btn').click();
  await env.page.waitForSelector('#notif-panel:not(.hidden)', { timeout: 4000 });
  await env.wait(500);
  const rows = () => env.js((key) => [...document.querySelectorAll('#notif-list > li')].filter((li) => li.textContent.includes(key)).length, k);
  if ((await rows()) !== 2) throw new Error(`the panel shows ${await rows()} of the 2 notifications`);
  await env.overflow('notifications panel');
  env.at('remove one');
  //: The row's remove button is revealed by pointing at the row (always there on touch).
  await env.page.locator(`#notif-list > li:has-text("Sweep one ${k}")`).hover();
  await env.page.locator(`#notif-panel button[aria-label="Remove: Sweep one ${k}"]`).click();
  await env.wait(500);
  if ((await rows()) !== 1) throw new Error('Remove did not take the row out');
  const stored = await env.js((key) => storedNotifications().filter((n) => String(n.title).includes(key)).map((n) => n.title), k);
  if (stored.length !== 1 || !stored[0].includes('two')) throw new Error(`the wrong one is left in storage: ${JSON.stringify(stored)}`);
  env.at('mark the other read');
  await env.page.locator(`#notif-list > li:has-text("${k}")`).first().hover();
  await env.page.locator(`#notif-list > li:has-text("${k}") button.notif-read-toggle`).first().click();
  await env.wait(400);
  env.at('close the panel');
  await env.page.locator('#notif-close').click();
  await env.wait(400);
  if (await env.page.isVisible('#notif-panel')) throw new Error('the panel did not close');
  await env.js((key) => { for (const n of storedNotifications().filter((x) => String(x.title).includes(key))) dismissNotification(n); }, k);
};

//: The dashboard on a notebook with properties and private notes: every widget
//: draws, none prints a `---` block as a note's words.
flows.dashboard = async (env) => {
  await env.js(() => switchTab('dashboard'));
  await env.wait(3500);
  const bad = await env.js(() => [...document.querySelectorAll('#tab-dashboard .dash-list-text, #tab-dashboard .random-note, #tab-dashboard .dash-list li')]
    .map((e) => e.innerText.trim()).filter((t) => /^---|status: active|priority: \d+/.test(t)).slice(0, 2));
  if (bad.length) throw new Error(`the dashboard prints a properties block as words: ${JSON.stringify(bad).slice(0, 160)}`);
  await env.overflow('dashboard');
};

module.exports = flows;
