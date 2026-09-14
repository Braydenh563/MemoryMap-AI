// INBOX 174: a board preview's labels drawn past the paper's edge.
// Measures every label's own box against the paper rect inside the same svg.
const { boot } = require("./lib.js");


const BOARDS = [
  {
    name: "wide topics near both edges",
    board: {
      type: "map",
      preview_aspect: 1.6,
      preview_items: [
        { x: 0.45, y: 0.1, w: 0.4, h: 0.08, label: "Cloud computing costs", kind: "card" },
        { x: 0.02, y: 0.4, w: 0.35, h: 0.08, label: "Retry budget planning", kind: "card" },
        { x: 0.62, y: 0.7, w: 0.34, h: 0.08, label: "Open questions list", kind: "card" },
        { x: 0.49, y: 0.9, w: 0.02, h: 0.02, label: "Tiny", kind: "object" },
      ],
      preview_edges: [],
    },
  },
  {
    name: "tall board, small blocks",
    board: {
      type: "board",
      preview_aspect: 0.7,
      preview_items: [
        { x: 0.9, y: 0.1, w: 0.06, h: 0.05, label: "Ingest pipeline", kind: "card" },
        { x: 0.02, y: 0.5, w: 0.06, h: 0.05, label: "Connections problem", kind: "card" },
      ],
      preview_edges: [],
    },
  },
];

(async () => {
  const { browser, page } = await boot();
  const out = await page.evaluate((boards) => {
    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "0px";
    holder.style.top = "0px";
    holder.style.zIndex = "9999";
    document.body.appendChild(holder);
    const rows = [];
    for (const entry of boards) {
      for (const size of ["card", "row"]) {
        const svg = mapPreview(entry.board, { size });
        holder.appendChild(svg);
        const paperEl = svg.querySelector(".board-minimap-paper");
        const paper = paperEl.getBoundingClientRect();
        const vw = Number(svg.getAttribute("viewBox").split(" ")[2]);
        // The control: the rule this replaced, replayed into the same svg from
        // the blocks it drew. Old rule: hang the label off the left once the
        // block's own left edge is past halfway, otherwise off the right, with
        // a flat 16-character budget and no check that the side has room.
        const blocks = [...svg.querySelectorAll("rect:not(.board-minimap-paper)")];
        const NSU = "http://www.w3.org/2000/svg";
        const legacy = [];
        for (const block of blocks) {
          const nx = Number(block.getAttribute("x"));
          const w = Number(block.getAttribute("width"));
          const h = Number(block.getAttribute("height"));
          const ny = Number(block.getAttribute("y"));
          const near = [...svg.querySelectorAll(".board-minimap-label")][0];
          if (!near) continue;
          const font = Number(near.getAttribute("font-size"));
          const item = entry.board.preview_items[blocks.indexOf(block)];
          if (!item || !item.label) continue;
          const gap = font * 0.25;
          const t = document.createElementNS(NSU, "text");
          t.setAttribute("class", "board-minimap-label");
          t.setAttribute("font-size", String(font));
          const rightHalf = nx > vw / 2;
          t.setAttribute("x", String(rightHalf ? nx - gap : nx + w + gap));
          t.setAttribute("y", String(ny + h * 0.73));
          if (rightHalf) t.setAttribute("text-anchor", "end");
          t.textContent = item.label.length > 16
            ? `${item.label.slice(0, 15).trimEnd()}\u2026`
            : item.label;
          svg.appendChild(t);
          legacy.push([item.label, t]);
        }
        for (const [name, t] of legacy) {
          const box = t.getBoundingClientRect();
          rows.push({
            board: entry.name,
            size,
            rule: "before",
            label: name,
            overLeft: Math.round((paper.left - box.left) * 10) / 10,
            overRight: Math.round((box.right - paper.right) * 10) / 10,
          });
          t.remove();
        }
        for (const text of svg.querySelectorAll(".board-minimap-label")) {
          const box = text.getBoundingClientRect();
          rows.push({
            board: entry.name,
            size,
            rule: "now",
            label: text.textContent,
            overLeft: Math.round((paper.left - box.left) * 10) / 10,
            overRight: Math.round((box.right - paper.right) * 10) / 10,
          });
        }
      }
    }
    holder.remove();
    return rows;
  }, BOARDS);
  let bad = 0;
  for (const row of out) {
    const over = Math.max(row.overLeft, row.overRight);
    if (over > 0.5 && row.rule === "now") bad += 1;
    console.log(
      `${over > 0.5 ? "OVER" : "ok  "} ${row.rule} ${row.board} / ${row.size} "${row.label}" left ${row.overLeft} right ${row.overRight}`,
    );
  }
  console.log(`labels ${out.length}, past the paper ${bad}`);
  await browser.close();
})();
