// The mind map's perspectives on a map that actually has notes on it (the
// remaining list, item 4). Every earlier pass measured Colour by on a map of
// topics, where "category" and "age" are the quiet grey by construction and
// the measurement says nothing.
//
// Twenty notes across four categories, each hung on the map as a reference
// node, then each perspective in turn: how many distinct colours the nodes
// carry, and what each of them measures against the node's own card.
//
//   BASE=http://127.0.0.1:8791 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mapperspective.js
const { boot } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

// WCAG relative luminance and contrast, on rgb triples.
function luminance([r, g, b]) {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
// `--wb-branch` is written as a hex from the palette and the card's own
// background comes back from `getComputedStyle` as `rgb(...)`: both shapes
// have to parse, or the contrast column is empty, which is what the first run
// of this sweep measured.
const parse = (css) => {
  const text = String(css).trim();
  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((at) => parseInt(h.slice(at, at + 2), 16));
  }
  const m = text.match(/(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};

(async () => {
  const { browser, page } = await boot({});
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(600);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(900);

  const built = await page.evaluate(async () => {
    // Four categories, five notes each.
    // There is no POST /categories: a category is made by filing a note into
    // it, and `POST /entries` takes the name. Which is also the honest way to
    // build this map, since it is how a person's notes get their categories.
    const names = ["Reading", "Fieldwork", "Admin", "Ideas"];
    const notes = [];
    for (let i = 0; i < 20; i++) {
      const entry = await apiJson("/entries", {
        method: "POST",
        body: JSON.stringify({
          content: `Note ${i}: body of note ${i}`,
          category: names[i % names.length],
        }),
      });
      notes.push(entry);
    }
    const cats = [...new Set(names)];
    const board = await apiJson("/whiteboard/boards", {
      method: "POST",
      body: JSON.stringify({ name: `Perspectives ${Date.now()}`, type: "map", layout: "tree-right" }),
    });
    window.currentBoardId = board.id;
    const root = await apiJson(`/whiteboard/boards/${board.id}/nodes`, {
      method: "POST",
      body: JSON.stringify({ kind: "topic", parent_id: null, text: "Everything" }),
    });
    for (const note of notes) {
      await apiJson(`/whiteboard/boards/${board.id}/nodes`, {
        method: "POST",
        body: JSON.stringify({ kind: "note", parent_id: root.id, ref_id: note.id, text: note.title || `Note ${note.id}` }),
      });
    }
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 800));
    return { board: board.id, notes: notes.length, cats: cats.length };
  });
  console.log("  built:", JSON.stringify(built));
  check("a map of twenty note nodes across four categories exists",
    built.notes === 20 && built.cats === 4, JSON.stringify(built));

  const read = async (perspective) => {
    await page.evaluate(async (p) => {
      const picker = document.getElementById("wb-map-perspective");
      picker.value = p;
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    }, perspective);
    await page.waitForTimeout(900);
    return page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("#wb-html-layer .wb-object")) {
        const cs = getComputedStyle(el);
        out.push({
          branch: cs.getPropertyValue("--wb-branch").trim(),
          card: cs.backgroundColor,
        });
      }
      const legend = document.getElementById("wb-map-legend");
      return {
        nodes: out,
        quiet: getComputedStyle(document.documentElement).getPropertyValue("--muted").trim(),
        legendShown: legend ? !legend.hidden : false,
        legendRows: legend ? legend.querySelectorAll("*").length : 0,
      };
    });
  };

  for (const [perspective, want] of [["category", 4], ["age", 1], ["notes", 2], ["branch", 2]]) {
    const seen = await read(perspective);
    const colours = [...new Set(seen.nodes.map((n) => n.branch).filter(Boolean))];
    const card = parse(seen.nodes[0].card);
    const measured = colours.map((c) => {
      const rgb = parse(c);
      return { colour: c, ratio: rgb && card ? Number(contrast(rgb, card).toFixed(2)) : null };
    });
    // The quiet grey is excluded from the bar deliberately, and it is the one
    // colour here that does not clear it (2.77:1, measured). It is `--muted`,
    // the app's own token, and it does not carry information: it is what a
    // node wears when it has nothing to say under the perspective in force
    // ("no category", "not a note"). The 3:1 bar is for a graphical object
    // that means something. Raising it would mean raising `--muted` for the
    // whole app, which is another surface's decision entirely.
    const informative = measured.filter((m) => m.colour.toLowerCase() !== seen.quiet.toLowerCase() && m.ratio !== null);
    const worst = informative.length ? Math.min(...informative.map((m) => m.ratio)) : 0;
    console.log(`  ${perspective}: ${colours.length} colours ${JSON.stringify(measured)} quiet ${seen.quiet} legend ${seen.legendShown}`);
    check(`colour by ${perspective} gives at least ${want} distinct colours`,
      colours.length >= want, `${colours.length}: ${colours.join(", ")}`);
    // 3:1, the WCAG bar for a graphical object against its background: these
    // are a bar down a card's edge and a branch line, not text.
    check(`every colour by ${perspective} that means something stands off the card`,
      informative.length > 0 && worst >= 3,
      `worst ${worst}:1 over ${informative.length} colours, quiet grey at ${(measured.find((m) => m.colour.toLowerCase() === seen.quiet.toLowerCase()) || {}).ratio}:1`);
    if (perspective !== "branch") {
      check(`colour by ${perspective} says what the colours mean`, seen.legendShown,
        `legend shown ${seen.legendShown}, ${seen.legendRows} elements`);
    }
  }

  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
