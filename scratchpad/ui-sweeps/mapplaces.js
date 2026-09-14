// **One place per action** (MINDMAP_PLAN §12.5, INBOX 200: "the way the
// controls are available, what controls and tools are available and where").
// The rule this gates:
//
//   the ring  = what you do to this topic from here, six slots at most,
//               each with its word drawn;
//   the strip = how the topic and its line look;
//   the dock  = what you do to the map;
//   and no action appears in more than one of the three.
//
// Plus the reachability half (§12.5, step 3): every ring action is also a key
// and also in the topic's own menu, proved by building a five-node tree with
// the keyboard and never the pointer.
//
//   BASE=http://127.0.0.1:8802 SCRATCH=/tmp/mm-mapux \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapplaces.js
const { boot } = require("./lib.js");

const VIEWPORT = (() => {
  const raw = process.env.VIEWPORT;
  if (!raw) return { width: 1440, height: 900 };
  const [w, h] = raw.split("x").map(Number);
  return { width: w || 1440, height: h || 900 };
})();

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

async function newBoard(page, name) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}

// What each surface writes, as a word. The audit's own vocabulary: two
// controls that produce the same edit carry the same word here, whatever they
// are called on screen, which is the only way "the same action in two places"
// can be measured rather than argued about.
const ACTION_OF_ID = {
  // the ring
  "wb-radial-child": "add-child",
  "wb-radial-sibling": "add-sibling",
  "wb-radial-collapse": "fold",
  "wb-radial-delete": "delete",
  "wb-radial-connect": "connect",
  "wb-radial-more": "more",
  // the strip
  "wb-map-bold": "look-bold",
  "wb-map-italic": "look-italic",
  "wb-map-core": "look-core",
  "wb-map-text-size": "look-size",
  "wb-map-align": "look-align",
  "wb-map-strip-color": "look-colour",
  "wb-map-strip-icon": "look-icon",
  "wb-map-shape": "look-shape",
  "wb-map-spine": "look-spine",
  "wb-map-edge-width": "look-line-width",
  "wb-map-edge-dashed": "look-line-dash",
  "wb-map-edge-arrow": "look-line-arrow",
  "wb-map-edge-shape": "look-line-shape",
  "wb-map-reset": "look-reset",
  // the dock's map sections
  "wb-map-add-root": "add-root",
  "wb-map-focus-here": "focus",
  "wb-map-layout": "layout",
  "wb-map-tidy": "tidy-map",
  // the line ring
  "wb-link-reverse": "line-reverse",
  "wb-link-label": "line-label",
  "wb-link-cut": "line-cut",
};

(async () => {
  const { browser, page } = await boot({ viewport: VIEWPORT });
  await newBoard(page, `Places map ${Date.now()}`);

  // --- 0. the first open: the hint, and the rail's "where is everything" ----
  // Before a topic is added, which is the only moment the hint exists. The
  // browser context is fresh per run, so `wbMapFirstHintDone` is unset here.
  const firstOpen = await page.evaluate(() => {
    const hint = document.getElementById("wb-map-first-hint");
    const card = document.getElementById("wb-map-templates");
    const root = document.querySelector(".wb-map-node")?.closest(".wb-object");
    const canvas = document.getElementById("library-view-whiteboard").getBoundingClientRect();
    const box = hint ? hint.getBoundingClientRect() : null;
    const rootBox = root ? root.getBoundingClientRect() : null;
    const overlap = (a, b) => (a && b
      ? Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      : -1);
    return {
      shown: Boolean(hint) && !hint.hidden && !card.hidden && box.width > 0 && box.height > 0,
      words: (hint?.textContent || "").trim().split(/\s+/).length,
      inside: box ? Math.round(box.left - canvas.left) >= 0 && Math.round(box.right - canvas.right) <= 0 : false,
      overRoot: Math.round(overlap(box, rootBox)),
      stored: (() => { try { return localStorage.getItem("wbMapFirstHintDone"); } catch { return "err"; } })(),
    };
  });
  check("an empty map says how to start, once", firstOpen.shown && firstOpen.stored === null,
    `${firstOpen.words} words, flag ${firstOpen.stored}`);
  check("the hint is inside the canvas and off the root topic",
    firstOpen.inside && firstOpen.overRoot === 0,
    `inside ${firstOpen.inside}, ${firstOpen.overRoot}px2 over the root`);

  // The rail's '?': the one place that names all three surfaces.
  await page.click('#wb-tool-group [data-help-for="wb-map-places-help"]');
  await page.waitForTimeout(400);
  const help = await page.evaluate(() => {
    const panel = document.getElementById("wb-map-places-help");
    const r = panel.getBoundingClientRect();
    const t = panel.textContent.toLowerCase();
    return {
      open: !panel.classList.contains("hidden"),
      onScreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      names: ["ring", "strip", "rail"].filter((w) => t.includes(w)).length,
      keys: ["tab", "enter", "shift and f10"].filter((w) => t.includes(w)).length,
      expanded: document.querySelector('[data-help-for="wb-map-places-help"]').getAttribute("aria-expanded"),
    };
  });
  check("the rail's help names all three surfaces and the keys",
    help.open && help.onScreen && help.names === 3 && help.keys === 3 && help.expanded === "true",
    JSON.stringify(help));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    const kid = await wbMapAddChild(root.id);
    await wbMapAddChild(kid.id);
  });
  await page.waitForTimeout(1800);
  // A new topic is left in its own editor; click away so the label blurs.
  await page.mouse.click(200, 700);
  await page.waitForTimeout(400);

  const leaf = await page.evaluate(() => {
    const index = wbMapIndex();
    return index.nodes.find((n) => (index.childrenOf.get(n.id) || []).length === 0).id;
  });
  const centre = await page.evaluate((id) => {
    const r = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, leaf);
  await page.mouse.click(centre.x, centre.y);
  await page.waitForTimeout(600);

  // --- 1. what each surface holds, by id ------------------------------------
  const surfaces = await page.evaluate(() => {
    const listed = (root) => [...(document.querySelector(root)?.querySelectorAll("button, select, input") || [])]
      .filter((c) => c.id && !c.hidden && !c.closest("[hidden]")
        && getComputedStyle(c).display !== "none" && !c.closest(".select-menu"))
      .map((c) => c.id);
    return {
      ring: listed("#wb-map-radial"),
      strip: listed("#wb-map-strip"),
      lineRing: [...document.querySelectorAll("#wb-map-link-radial .wb-map-radial-slot")].map((s) => s.id),
      dock: [...document.querySelectorAll('#wb-tool-group [data-wb-surface="map"] button, #wb-tool-group [data-wb-surface="map"] select, #wb-tool-group [data-wb-surface="map"] input')]
        .filter((c) => c.id && getComputedStyle(c).display !== "none" && !c.closest(".select-menu"))
        .map((c) => c.id),
    };
  });
  console.log("  surfaces:", JSON.stringify(surfaces));

  check("the ring holds six slots or fewer", surfaces.ring.length <= 6, `${surfaces.ring.length} slots`);
  const mapped = (ids) => ids.map((id) => ACTION_OF_ID[id]).filter(Boolean);
  const ringActs = mapped(surfaces.ring);
  check("every ring slot is one of the six §12.5 names",
    ringActs.length === surfaces.ring.length
      && ringActs.every((a) => ["add-child", "add-sibling", "fold", "delete", "connect", "more"].includes(a)),
    ringActs.join(", "));
  const stripActs = mapped(surfaces.strip);
  check("every strip control is a look",
    stripActs.length === surfaces.strip.length && stripActs.every((a) => a.startsWith("look-")),
    surfaces.strip.filter((id) => !(ACTION_OF_ID[id] || "").startsWith("look-")).join(", ") || stripActs.length + " looks");
  const dockActs = mapped(surfaces.dock);
  check("every dock control acts on the map, not on the topic in hand",
    dockActs.length === surfaces.dock.length
      && dockActs.every((a) => ["add-root", "focus", "layout", "tidy-map"].includes(a)),
    dockActs.join(", "));

  // The rule itself: no action in two of the three.
  const seen = new Map();
  const clashes = [];
  for (const [surface, ids] of [["ring", surfaces.ring], ["strip", surfaces.strip], ["dock", surfaces.dock], ["line ring", surfaces.lineRing]]) {
    for (const id of ids) {
      const act = ACTION_OF_ID[id];
      if (!act) continue;
      if (seen.has(act) && seen.get(act) !== surface) clashes.push(`${act}: ${seen.get(act)} and ${surface}`);
      seen.set(act, surface);
    }
  }
  check("no action is on two of the surfaces", clashes.length === 0, clashes.join("; ") || `${seen.size} distinct actions`);

  // --- 2. the ring and the strip are never open together --------------------
  const both = await page.evaluate((id) => {
    const node = wbMapIndex().byId.get(id);
    wbOpenMapRadial(node);
    const ringOpen = !document.getElementById("wb-map-radial").classList.contains("hidden");
    const stripOpen = !document.getElementById("wb-map-strip").classList.contains("hidden");
    wbCloseMapRadial();
    const stripBack = !document.getElementById("wb-map-strip").classList.contains("hidden");
    return { ringOpen, stripOpen, stripBack };
  }, leaf);
  check("the ring open means the strip is away, and closing it brings the strip back",
    both.ringOpen && !both.stripOpen && both.stripBack, JSON.stringify(both));

  // --- 3. every ring action is also in the topic's own menu -----------------
  // On a topic that has children: fold is offered only where there is a branch
  // to fold, which is the same rule the ring's own slot follows (it is
  // disabled on a leaf rather than moved or taken away).
  const menu = await page.evaluate(() => {
    const index = wbMapIndex();
    const parent = index.nodes.find((n) => (index.childrenOf.get(n.id) || []).length > 0);
    wbHandleItemClick("object", parent.id, { shiftKey: false });
    const built = wbBuildContextMenu("object");
    return [...built.querySelectorAll(".menu-item")].map((b) => `${b.textContent.trim()} | ${b.title}`);
  });
  console.log("  menu:", JSON.stringify(menu));
  const inMenu = (re) => menu.some((m) => re.test(m));
  check("the menu carries the ring's six", [
    /Add a child topic/, /Add a topic beside/, /Connect this topic/, /Delete/,
  ].every(inMenu) && (inMenu(/Fold this branch/) || inMenu(/Open this branch/)),
    `${menu.length} items`);
  check("the menu carries what left the ring",
    [/Add from the library/, /Link this topic to a page/, /Copy this branch/, /Back to the branch/].every(inMenu),
    menu.length + " items");

  // --- 4. a five-node tree with the keyboard alone --------------------------
  await page.evaluate(() => wbCloseContextMenu());
  const before = await page.evaluate(() => wbMapIndex().nodes.length);
  // Focus the canvas the way a click does, without selecting anything new:
  // the keys are read on the document, guarded against a focused field.
  await page.evaluate((id) => {
    wbHandleItemClick("object", id, { shiftKey: false });
    document.getElementById("whiteboard-container")?.focus();
  }, leaf);
  await page.waitForTimeout(300);
  // Tab, Enter, Tab, Enter: a child, a sibling of it, a child of that, a
  // sibling of that. Escape after each add, because a new topic opens in its
  // own editor and the next key would be typed into the label.
  for (const key of ["Tab", "Enter", "Tab", "Enter"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(900);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
  const after = await page.evaluate(() => wbMapIndex().nodes.length);
  check("four topics added with the keyboard and no pointer", after - before === 4,
    `${before} nodes to ${after}`);

  // Fold with C, and read it back off the node.
  const folded = await page.evaluate(() => {
    const index = wbMapIndex();
    const parent = index.nodes.find((n) => (index.childrenOf.get(n.id) || []).length > 0);
    wbHandleItemClick("object", parent.id, { shiftKey: false });
    return parent.id;
  });
  await page.waitForTimeout(300);
  await page.keyboard.press("c");
  await page.waitForTimeout(900);
  const foldState = await page.evaluate((id) => Boolean(wbMapIndex().byId.get(id)?.data?.collapsed), folded);
  check("C folds the selected branch", foldState === true, `collapsed ${foldState}`);
  await page.keyboard.press("c");
  await page.waitForTimeout(700);

  // Shift+F10 opens the topic's own menu, which is the ring's More from the
  // keyboard: the last of the six with no key of its own.
  const menuOpen = await page.evaluate(() => {
    const m = document.querySelector(".wb-ctx-menu");
    return m ? !m.classList.contains("hidden") : false;
  });
  await page.keyboard.press("Shift+F10");
  await page.waitForTimeout(500);
  const menuNow = await page.evaluate(() => {
    const m = document.querySelector(".wb-ctx-menu");
    return { open: m ? !m.classList.contains("hidden") : false, items: m ? m.querySelectorAll(".menu-item").length : 0 };
  });
  check("Shift+F10 opens the topic's own menu", !menuOpen && menuNow.open && menuNow.items > 6,
    `${menuNow.items} items, open ${menuNow.open}`);

  // --- 5. the hint is spent -------------------------------------------------
  // A second new map, after the first one grew: the flag is written and the
  // line does not come back.
  await page.keyboard.press("Escape");
  await newBoard(page, `Second map ${Date.now()}`);
  const spent = await page.evaluate(() => {
    const hint = document.getElementById("wb-map-first-hint");
    const card = document.getElementById("wb-map-templates");
    return {
      hidden: hint.hidden,
      cardShown: !card.hidden,
      stored: (() => { try { return localStorage.getItem("wbMapFirstHintDone"); } catch { return "err"; } })(),
    };
  });
  check("the hint is gone on the next map, and the offer is not",
    spent.hidden && spent.cardShown && spent.stored === "1", JSON.stringify(spent));

  const bad = results.filter((r) => !r.ok);
  console.log(`\n${VIEWPORT.width}x${VIEWPORT.height}: ${results.length - bad.length}/${results.length} passed`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
