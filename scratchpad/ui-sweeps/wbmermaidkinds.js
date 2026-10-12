// canvasdepth: Mermaid state, class and sequence diagrams onto a board, measured.
//   BASE=http://127.0.0.1:8850 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbmermaidkinds.js
const { openFresh, checker } = require("./cdlib.js");
const STATE = "stateDiagram-v2\n[*] --> Still\nStill --> Moving : push\nMoving --> Still : stop\nMoving --> Crash\nCrash --> [*]";
const CLASS = "classDiagram\nAnimal <|-- Duck\nAnimal <|-- Fish\nAnimal *-- Leg : has\nclass Animal {\n  +String name\n  +int age\n  +eat() void\n}\nDuck : +swim()\nFish ..> Water";
const SEQ = "sequenceDiagram\nparticipant A as Alice\nactor B as Bob\nA->>B: Hello Bob\nB-->>A: Hi Alice\nA->>A: think\nNote over A,B: a note\nloop Every minute\n  B-)C: ping\nend";
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors } = await openFresh({ width: W });
  const { check, summary } = checker();
  const run = (src) => page.evaluate(async (s) => {
    const before = { sk: wbState.sketches.length, ob: (wbState.objects || []).length };
    await wbImportMermaid(s, [0, 0]);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const made = wbState.sketches.slice(before.sk).map((x) => ({ id: x.id, data: JSON.parse(x.data) }));
    const objs = (wbState.objects || []).slice(before.ob).map((o) => ({ kind: o.kind, x: o.x, y: o.y, w: o.width, h: o.height }));
    const shapes = made.filter((m) => !m.data.type && m.data.shape !== "line").map((m) => ({ label: m.data.label ?? "", box: wbPathBBox(m.data.d) }));
    const links = made.filter((m) => m.data.type);
    const drawn = links.filter((l) => wbState.sketches.find((s) => s.id === l.id) && document.querySelector(`[data-sketch-id="${l.id}"], #wb-sketch-${l.id}`)).length;
    return { shapes, links: links.map((l) => l.data), objs, drawn };
  }, src);
  const overlaps = (boxes) => {
    let n = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY) n++;
    }
    return n;
  };
  const st = await run(STATE);
  check("state: 3 states plus start and end dots", st.shapes.length === 5 && st.shapes.filter((s) => s.label === "").length === 2, st.shapes.map((s) => s.label));
  check("state: 5 arrows, labels kept", st.links.length === 5 && st.links.filter((l) => l.label).length === 2 && st.links.every((l) => l.endCap), st.links.map((l) => l.label));
  check("state: no shapes overlap", overlaps(st.shapes.map((s) => s.box)) === 0);
  await page.evaluate(() => wbState.sketches.forEach((s) => {}));
  const cl = await run(CLASS);
  const animal = cl.shapes.find((s) => s.label.startsWith("Animal"));
  const water = cl.shapes.find((s) => s.label === "Water");
  check("class: 5 classes, Animal with its 3 members", cl.shapes.length === 5 && animal && animal.label.split("\n").length === 4, cl.shapes.map((s) => s.label));
  check("class: Animal taller than Water", animal && water && (animal.box.maxY - animal.box.minY) > (water.box.maxY - water.box.minY), [animal?.box, water?.box]);
  check("class: inheritance has a start cap, the dependency is dashed", cl.links.filter((l) => l.startCap).length === 3 && cl.links.some((l) => l.dash === "dashed"), cl.links.map((l) => [l.startCap, l.endCap, l.dash]));
  check("class: no class boxes overlap", overlaps(cl.shapes.map((s) => s.box).map((b) => ({ ...b, minX: b.minX + 3000, maxX: b.maxX + 3000 }))) === 0);
  const sq = await run(SEQ);
  const heads = sq.shapes.map((s) => s.label);
  check("sequence: Alice, Bob, C along the top", JSON.stringify(heads) === JSON.stringify(["Alice", "Bob", "C"]), heads);
  const msgs = sq.links.filter((l) => l.sourcePoint);
  check("sequence: 4 messages, the reply dashed", msgs.length === 4 && msgs.filter((m) => m.dash === "dashed").length === 1, msgs.map((m) => m.label));
  const ys = msgs.map((m) => m.sourcePoint.y);
  check("sequence: each message below the last", ys.every((y, i) => i === 0 || y > ys[i - 1]), ys);
  check("sequence: a note sticky and a loop label", sq.objs.filter((o) => o.kind === "text").length === 2, sq.objs);
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
