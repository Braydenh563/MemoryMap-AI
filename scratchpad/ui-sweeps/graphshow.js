// INBOX 185, the graph's Show switches: "Things that I have turned off in the
// graph for not showing them like the mindmap and entities still show anyway".
//
// What this counts, and why counting is the only way to see it. Every one of
// the three switches is drawn the same, so they look like three of one thing,
// but they were not: Entities and Documents add nodes that do not otherwise
// exist, so "off" really did mean absent for those two, while a board *is* an
// `Entry` (routes_graph.py §2) and has been a node on this map since boards
// existed. All the mind maps switch ever did was set `type` on a node that was
// already on screen and draw its membership edges, so with it off the map still
// carried every mind map, drawn as an ordinary note. A screenshot cannot tell
// those two apart, which is why this counts the drawn nodes by kind against the
// ids the API says are boards, with every switch off and again with each on.
//
//   BASE=http://127.0.0.1:8794 node scratchpad/ui-sweeps/graphshow.js
const { boot } = require('./lib.js');

const SWITCHES = ['graph-entities', 'graph-documents', 'graph-maps'];

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 950 } });
  const findings = [];
  const check = (ok, what) => { if (!ok) findings.push(what); return ok; };

  // A board to look for. Idempotent enough: one more named the same costs
  // nothing, and the count below is read off the API rather than assumed.
  await page.evaluate(async () => {
    await apiJson('/whiteboard/boards', {
      method: 'POST',
      body: JSON.stringify({ name: 'Show-switch probe', type: 'map' }),
    }).catch(() => null);
  });

  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(3000);

  const set = async (id, on) =>
    page.evaluate(
      async (args) => {
        const el = document.getElementById(args.id);
        if (!el || el.checked === args.on) return;
        el.checked = args.on;
        el.dispatchEvent(new Event('change'));
        await new Promise((r) => setTimeout(r, 2600));
      },
      { id, on }
    );

  const read = async () =>
    page.evaluate(async () => {
      //: The ids the graph itself calls boards, asked for directly rather than
      //: read off `/whiteboard/boards`: that endpoint lists every note with a
      //: card or a sketch on it, which is a wider set than the `is_board` flag
      //: the graph filters on (measured here: 4 against 3, the fourth an
      //: ordinary note somebody had drawn on). Two definitions of "a board"
      //: would make this sweep fail for a reason that is not the report.
      const boards = (await apiJson('/graph?include_maps=true')).nodes
        .filter((n) => n.type === 'map' || n.type === 'board' || n.type === 'whiteboard')
        .map((n) => n.id);
      const drawn = gcNodes.filter((n) => !n.isGroup);
      const kinds = {};
      for (const n of drawn) kinds[n.type || 'note'] = (kinds[n.type || 'note'] || 0) + 1;
      return {
        drawn: drawn.length,
        kinds,
        boardsOnMap: drawn.filter((n) => boards.includes(n.id)).length,
        boardsInNotebook: boards.length,
        entityNodes: drawn.filter((n) => String(n.id).startsWith('entity:')).length,
        documentNodes: drawn.filter((n) => String(n.id).startsWith('document:')).length,
      };
    });

  for (const id of SWITCHES) await set(id, false);
  const off = await read();
  console.log('every switch off  ', JSON.stringify(off));
  check(
    off.boardsInNotebook > 0,
    'no board in the notebook, so this sweep proves nothing about boards'
  );
  check(
    off.boardsOnMap === 0,
    `Boards is off and ${off.boardsOnMap} of the notebook's ${off.boardsInNotebook} boards are still drawn`
  );
  check(off.entityNodes === 0, `Entities is off and ${off.entityNodes} entity nodes are drawn`);
  check(off.documentNodes === 0, `Documents is off and ${off.documentNodes} document nodes are drawn`);

  await set('graph-maps', true);
  const onMaps = await read();
  console.log('Boards on         ', JSON.stringify(onMaps));
  check(
    onMaps.boardsOnMap === onMaps.boardsInNotebook,
    `Boards is on and ${onMaps.boardsOnMap} of ${onMaps.boardsInNotebook} are drawn`
  );
  check(
    (onMaps.kinds.map || 0) + (onMaps.kinds.board || 0) + (onMaps.kinds.whiteboard || 0) > 0,
    'Boards is on and no node says it is one'
  );
  check(
    onMaps.drawn === off.drawn + onMaps.boardsInNotebook,
    `Boards on drew ${onMaps.drawn}, off drew ${off.drawn}, and there are ${onMaps.boardsInNotebook} boards`
  );

  await set('graph-maps', false);
  const offAgain = await read();
  console.log('Boards off again  ', JSON.stringify(offAgain));
  check(
    offAgain.boardsOnMap === 0,
    `turning Boards off again left ${offAgain.boardsOnMap} boards on the map`
  );

  await set('graph-entities', true);
  const onEntities = await read();
  console.log('Entities on       ', JSON.stringify(onEntities));
  await set('graph-entities', false);
  const entitiesOff = await read();
  console.log('Entities off again', JSON.stringify(entitiesOff));
  check(
    entitiesOff.entityNodes === 0,
    `turning Entities off again left ${entitiesOff.entityNodes} entity nodes on the map`
  );

  console.log(findings.length ? `FAIL: ${findings.length}\n  ` + findings.join('\n  ') : 'PASS');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
