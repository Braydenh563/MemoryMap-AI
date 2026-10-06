// INBOX 715: the New board dialog, the board and map templates, a new map's
// offer, the Library's map tiles and the icon picker's kind strip. Measured:
// the Name word clears the field's focus ring by --space-2; the kind is a
// tab strip under the head (no .seg); the preview's caption sits on
// --space-3; every board template's titles are one size and inside their
// frames; no two map pictures alike; the offer and the tiles one line each.
//
//   BASE=http://127.0.0.1:8851 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     WIDTHS=1440,390 node scratchpad/ui-sweeps/board715.js   (THEME=dark)
const { boot, openBoardsTab, waitForBoardOpen } = require("./lib.js");

const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);

(async () => {
  let bad = 0;
  const check = (label, ok, detail = "") => {
    if (!ok) bad++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  };
  for (const width of WIDTHS) {
    console.log(`--- ${width} ${process.env.THEME || "light"}`);
    const mobile = width < 600;
    const { browser, page } = await boot({ viewport: { width, height: mobile ? 844 : 900 }, hasTouch: mobile, isMobile: mobile });
    let errors = 0;
    page.on("pageerror", () => errors++);
    await openBoardsTab(page);
    const openDialog = async (kind) => {
      await page.evaluate((k) => { window.__picked = createNewBoard(k); }, kind);
      await page.waitForSelector("#wb-template-dialog[open] .wb-template-choice", { timeout: 15000 });
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await page.waitForTimeout(250);
    };
    await openDialog("board");
    const d = await page.evaluate(() => {
      const dialog = document.getElementById("wb-template-dialog");
      const probe = document.createElement("div");
      probe.style.paddingTop = "var(--space-2)";
      probe.style.paddingLeft = "var(--space-3)";
      dialog.append(probe);
      const space2 = parseFloat(getComputedStyle(probe).paddingTop);
      const space3 = parseFloat(getComputedStyle(probe).paddingLeft);
      probe.remove();
      const word = dialog.querySelector(".wb-template-name-row > span").getBoundingClientRect();
      const field = document.getElementById("wb-template-name");
      const cs = getComputedStyle(field);
      const fr = field.getBoundingClientRect();
      const ring = cs.outlineStyle !== "none" ? parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth) : 0;
      const shadow = (cs.boxShadow.match(/(-?[\d.]+)px/g) || []).map(parseFloat);
      const spread = cs.boxShadow !== "none" && shadow.length >= 4 ? Math.max(0, shadow[3]) : 0;
      const tabs = document.getElementById("wb-template-kind");
      const head = dialog.querySelector(".dialog-head").getBoundingClientRect();
      const tb = tabs.getBoundingClientRect();
      const dr = dialog.getBoundingClientRect();
      return {
        focused: document.activeElement === field, ring: Math.max(ring, spread), space2, space3,
        gap: fr.top - Math.max(ring, spread) - word.bottom,
        seg: dialog.querySelectorAll(".seg").length, strip: tabs.classList.contains("tabs-line") && tabs.getAttribute("role") === "tablist",
        tabs: [...tabs.querySelectorAll('[role="tab"]')].map((t) => `${t.textContent}:${t.getAttribute("aria-selected")}`),
        underHead: tb.top >= head.bottom - 1, stripWidth: Math.round(tb.width), dialogWidth: Math.round(dr.width),
        inView: dr.left >= 0 && dr.right <= innerWidth + 0.5,
        groups: [...dialog.querySelectorAll(".wb-template-group")].map((g) => g.textContent),
        rows: dialog.querySelectorAll(".wb-template-choice").length,
        listOverflowX: document.getElementById("wb-template-list").scrollWidth - document.getElementById("wb-template-list").clientWidth,
      };
    });
    check("name field focused on open", d.focused);
    check("Name word clears the focus ring by --space-2", d.gap >= d.space2 - 0.5, `gap ${d.gap.toFixed(1)}px, ring ${d.ring}px, --space-2 ${d.space2}px`);
    check("kind is a tab strip, no .seg in the dialog", d.strip && d.seg === 0, JSON.stringify(d.tabs));
    check("strip under the head", d.underHead, `strip ${d.stripWidth}px of ${d.dialogWidth}px`);
    check("dialog inside the window", d.inView);
    check("board rows grouped by purpose", d.groups.length >= 5 && d.rows >= 18, `${d.rows} rows, groups ${d.groups.join(" / ")}`);
    check("no sideways scroll in the list", d.listOverflowX <= 0, `${d.listOverflowX}px`);

    // Every board template: the preview's caption padding and its titles.
    const boards = await page.evaluate(async () => {
      const out = [];
      const rows = [...document.querySelectorAll("#wb-template-list .wb-template-choice")];
      for (const row of rows) {
        row.click();
        await new Promise((r) => requestAnimationFrame(r));
        const preview = document.getElementById("wb-template-preview");
        const caption = preview.querySelector(".wb-template-preview-text");
        const shown = preview.getBoundingClientRect().width > 0;
        const cs = getComputedStyle(caption);
        const pr = preview.getBoundingClientRect();
        const cr = caption.querySelector("strong").getBoundingClientRect();
        //: Below 44rem the preview is left out; the row carries the same picture.
        //: (measured at a preview's size, a copy laid out off to the side: at
        //: 56px wide a title is a pixel tall and its box is rounding).
        let svg = preview.querySelector("svg");
        if (!shown) {
          svg = row.querySelector("svg").cloneNode(true);
          svg.style.position = "fixed";
          svg.style.left = "0";
          svg.style.top = "0";
          svg.style.width = "600px";
          svg.style.height = "400px";
          document.body.append(svg);
        }
        const titles = [...svg.querySelectorAll(".wb-thumb-title")];
        const frames = [...svg.querySelectorAll(".wb-thumb-frame")];
        const sizes = new Set(titles.map((t) => t.getAttribute("font-size")));
        let overlaps = 0;
        if (frames.length === titles.length) {
          titles.forEach((t, i) => {
            const a = t.getBoundingClientRect(), f = frames[i].getBoundingClientRect();
            if (!(a.left > f.left + 0.5 && a.right < f.right - 0.5 && a.top > f.top + 0.5 && a.bottom < f.bottom - 0.5)) overlaps++;
          });
        }
        if (!shown) svg.remove();
        out.push({
          name: row.querySelector("strong").textContent, shown,
          padTop: parseFloat(cs.paddingTop), padLeft: parseFloat(cs.paddingLeft),
          captionInset: shown ? Math.round(cr.top - pr.top) : null,
          sizes: sizes.size, titles: titles.length, frames: frames.length, overlaps,
          dashed: [...svg.querySelectorAll("rect")].some((r) => r.getAttribute("stroke-dasharray") && !r.classList.contains("wb-thumb-blank")),
        });
      }
      return out;
    });
    check("preview shown only from 44rem", boards.every((b) => b.shown === (width >= 704)), `shown ${boards[0].shown} at ${width}`);
    const shot = async (name) => { if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SCRATCH || "."}/b715-${name}-${width}-${process.env.THEME || "light"}.png` }); };
    await page.evaluate(() => [...document.querySelectorAll(".wb-template-choice")].find((r) => r.textContent.includes("SWOT analysis")).click());
    await shot("dialog");
    for (const b of boards) {
      const pad = Math.abs(b.padTop - d.space3) < 0.5 && Math.abs(b.padLeft - d.space3) < 0.5;
      check(`board: ${b.name}`, pad && b.sizes <= 1 && b.overlaps === 0 && !b.dashed,
        `caption pad ${b.padTop}/${b.padLeft}${b.shown ? `, inset ${b.captionInset}px` : " (preview hidden at this width)"}, ${b.titles} titles in ${b.frames} frames, ${b.sizes} size(s), ${b.overlaps} on an edge`);
    }

    // The mind map tab: arrows move the kind; rows grouped; pictures unique.
    await page.focus('#wb-template-kind [data-value="board"]');
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('#wb-template-kind [role="tab"]')];
      const rows = [...document.querySelectorAll("#wb-template-list .wb-template-choice")];
      const pics = rows.map((r) => [...r.querySelectorAll("svg *")].map((e) => e.getAttribute("d") || `${e.getAttribute("x")},${e.getAttribute("y")},${e.getAttribute("width")}`).join("|"));
      return {
        selected: tabs.find((t) => t.getAttribute("aria-selected") === "true")?.dataset.value,
        focus: document.activeElement?.dataset.value,
        placeholder: document.getElementById("wb-template-name").placeholder,
        rows: rows.length, unique: new Set(pics).size,
        groups: [...document.querySelectorAll(".wb-template-group")].map((g) => g.textContent),
      };
    });
    check("ArrowRight moves to Mind map", m.selected === "map" && m.focus === "map", `placeholder "${m.placeholder}"`);
    check("map templates offered, grouped", m.rows >= 15 && m.groups.length >= 4, `${m.rows} rows, groups ${m.groups.join(" / ")}`);
    check("no two map pictures alike in the picker", m.unique === m.rows, `${m.unique} unique of ${m.rows}`);
    await shot("maps");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // A board from SWOT: the panels as drawn on the board.
    const stamp = Date.now() % 100000;
    await openDialog("board");
    await page.evaluate(() => [...document.querySelectorAll(".wb-template-choice")].find((r) => r.textContent.includes("SWOT analysis")).click());
    await page.fill("#wb-template-name", `SWOT ${stamp}`);
    await page.click("#wb-template-create");
    await waitForBoardOpen(page, 4);
    await page.waitForTimeout(600);
    const s = await page.evaluate(() => {
      const frames = [...document.querySelectorAll("#whiteboard-container .wb-object-frame.wb-frame-panel")];
      return frames.map((f) => {
        const fr = f.getBoundingClientRect();
        const t = f.querySelector(".wb-frame-title");
        const h = f.querySelector(".wb-frame-hint");
        const tr = t.getBoundingClientRect(), hr = h.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(t);
        const words = range.getBoundingClientRect();
        const bg = getComputedStyle(f).backgroundColor;
        return {
          title: t.textContent, size: getComputedStyle(t).fontSize, weight: getComputedStyle(t).fontWeight,
          inside: words.top >= fr.top + 2 && words.left >= fr.left + 2 && words.right <= fr.right - 2,
          hint: h.textContent, hintBelow: hr.top >= words.bottom - 0.5 && hr.bottom <= fr.bottom,
          border: getComputedStyle(f).borderTopStyle, radius: getComputedStyle(f).borderTopLeftRadius, bg,
        };
      });
    });
    await shot("swot");
    check("SWOT board: four panels", s.length === 4, s.map((f) => `${f.title} ${f.size}/${f.weight} ${f.bg}`).join("; "));
    check("SWOT board: one title size and weight", new Set(s.map((f) => f.size + f.weight)).size === 1);
    check("SWOT board: titles inside the top, hint under each", s.every((f) => f.inside && f.hint && f.hintBelow));
    check("SWOT board: solid edge, token corner, tinted ground", s.every((f) => f.border === "solid" && parseFloat(f.radius) > 0 && f.bg !== "rgba(0, 0, 0, 0)"));

    // A map from Cause and effect: its name at the centre, laid out to the left.
    await openDialog("map");
    await page.evaluate(() => [...document.querySelectorAll(".wb-template-choice")].find((r) => r.textContent.includes("Cause and effect")).click());
    await page.fill("#wb-template-name", `Late ${stamp}`);
    await page.click("#wb-template-create");
    await waitForBoardOpen(page, 6);
    await page.waitForTimeout(800);
    const c = await page.evaluate(() => ({ layout: wbMapLayout(), roots: wbMapIndex().roots.map((r) => r.data.content), n: wbMapIndex().nodes.length }));
    check("map from Cause and effect: named centre, tree-left", c.layout === "tree-left" && c.roots.length === 1 && c.roots[0].startsWith("Late"), JSON.stringify(c));

    // The Library's map tiles: one line each, no two pictures alike.
    await page.evaluate(() => wbOpenSidebar("library"));
    await page.waitForTimeout(1200);
    const t = await page.evaluate(() => {
      const group = document.querySelector('.wb-lib-group[data-group="set:maps"]');
      if (!group) return null;
      group.open = true;
      const tiles = [...group.querySelectorAll(".wb-lib-tile")];
      const names = tiles.map((x) => x.querySelector(".wb-lib-name"));
      const pics = tiles.map((x) => [...x.querySelectorAll("svg *")].map((e) => e.getAttribute("d") || `${e.getAttribute("x")},${e.getAttribute("y")}`).join("|"));
      return {
        n: tiles.length, heights: new Set(names.map((x) => Math.round(x.getBoundingClientRect().height))).size,
        tileHeights: new Set(tiles.map((x) => Math.round(x.getBoundingClientRect().height))).size,
        titled: tiles.every((x) => x.title), unique: new Set(pics).size,
      };
    });
    check("library map tiles: one line, even grid", t && t.heights === 1 && t.tileHeights === 1 && t.titled, JSON.stringify(t));
    check("library map tiles: no two pictures alike", t && t.unique === t.n);
    await page.evaluate(() => window.wbCloseSidebar?.());

    // A blank map: the offer of templates as tiles.
    await openDialog("map");
    await page.fill("#wb-template-name", `Blank ${stamp}`);
    await page.click("#wb-template-create");
    await waitForBoardOpen(page, 1);
    await page.waitForSelector("#wb-map-templates:not([hidden]) .wb-map-template-tile", { timeout: 15000 }).catch(() => {});
    const o = await page.evaluate(() => {
      const card = document.getElementById("wb-map-templates");
      const r = card.getBoundingClientRect();
      const tiles = [...card.querySelectorAll(".wb-map-template-tile")];
      const root = document.querySelector("#whiteboard-container .wb-object.wb-map-node, #whiteboard-container .wb-object[data-kind='topic']") || document.querySelector("#whiteboard-container .wb-object");
      const rr = root?.getBoundingClientRect();
      const over = rr ? Math.max(0, Math.min(r.right, rr.right) - Math.max(r.left, rr.left)) * Math.max(0, Math.min(r.bottom, rr.bottom) - Math.max(r.top, rr.top)) : -1;
      const pics = tiles.map((x) => [...x.querySelectorAll("svg *")].map((e) => e.getAttribute("d") || `${e.getAttribute("x")},${e.getAttribute("y")}`).join("|"));
      //: Every tile in the row's visible part is what a press there reaches,
      //: not the selected root's bar or anything else drawn over the card.
      const row = card.querySelector(".wb-map-templates-row").getBoundingClientRect();
      const covered = tiles.filter((x) => {
        const b = x.getBoundingClientRect();
        if (b.right > row.right || b.left < row.left) return false;
        const hit = document.elementFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2);
        return !x.contains(hit);
      }).map((x) => x.dataset.wbTemplate);
      return {
        covered,
        shown: !card.hidden, n: tiles.length, unique: new Set(pics).size,
        names: new Set(tiles.map((x) => Math.round(x.querySelector(".wb-map-template-name").getBoundingClientRect().height))).size,
        inView: r.left >= 0 && r.right <= innerWidth + 0.5, h: Math.round(r.height), over,
        rowOverflowY: card.querySelector(".wb-map-templates-row").scrollHeight - card.querySelector(".wb-map-templates-row").clientHeight,
      };
    });
    await shot("offer");
    check("blank map offers the templates as tiles", o.shown && o.n >= 15 && o.unique === o.n, `${o.n} tiles, ${o.unique} unique`);
    check("offer: one-line names, inside the window, no vertical spill", o.names === 1 && o.inView && o.rowOverflowY <= 0, `card ${o.h}px tall`);
    check("offer does not cover the root topic", o.over === 0, `${o.over}px2`);
    check("every visible tile is pressable", o.covered.length === 0, o.covered.join(", "));
    await page.evaluate(() => document.querySelector("#wb-map-templates .wb-map-template-tile[data-wb-template='brainstorm']").click());
    await page.waitForTimeout(1500);
    const b = await page.evaluate(() => ({ layout: wbMapLayout(), n: wbMapIndex().nodes.length, hidden: document.getElementById("wb-map-templates").hidden }));
    check("a tile fills the map and takes its layout", b.n > 5 && b.layout === "radial" && b.hidden, JSON.stringify(b));

    // The icon picker: Emoji | Icons is a tab strip under the head.
    await page.evaluate(() => ensureModule("iconPicker").then(() => openIconPicker({ title: "Emoji and icons" })));
    await page.waitForSelector(".icon-picker", { timeout: 10000 });
    const ip = await page.evaluate(() => {
      const panel = document.querySelector(".icon-picker");
      const tabs = panel.querySelector(".icon-picker-modes");
      const head = panel.querySelector(".dialog-head").getBoundingClientRect();
      return {
        strip: tabs.classList.contains("tabs-line") && tabs.getAttribute("role") === "tablist", seg: panel.querySelectorAll(".seg").length,
        underHead: tabs.getBoundingClientRect().top >= head.bottom - 1,
        beforeSearch: tabs.getBoundingClientRect().bottom <= panel.querySelector(".search-field").getBoundingClientRect().top + 0.5,
        full: Math.abs(tabs.getBoundingClientRect().width - panel.querySelector(".search-field").getBoundingClientRect().width) < 2,
      };
    });
    check("icon picker: Emoji | Icons a full-width tab strip under the head", ip.strip && !ip.seg && ip.underHead && ip.beforeSearch && ip.full, JSON.stringify(ip));
    check("no page errors", errors === 0, `${errors}`);
    await browser.close();
  }
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
