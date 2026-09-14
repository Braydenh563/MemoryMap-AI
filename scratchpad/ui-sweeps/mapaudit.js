// **The control audit** (INBOX 200, "the way the controls are available, what
// controls and tools are available and where"): open a map of twelve topics
// and enumerate every control a user meets, surface by surface, with what it
// does. It asserts nothing about design; it produces the count per surface and
// the duplicate list that MINDMAP_PLAN §12.5 is written from.
//
// Why a sweep rather than a read of index.html: half of these controls are
// built by `renderWhiteboard` at runtime (the node's own row, the grips), the
// strip and both rings hide groups per selection, and the rail hides thirteen
// board-only tools on a map. Only the running app knows which are there.
//
//   BASE=http://127.0.0.1:8802 SCRATCH=/tmp/mm-mapux \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapaudit.js
const { boot } = require("./lib.js");

const VIEWPORT = (() => {
  const raw = process.env.VIEWPORT;
  if (!raw) return { width: 1440, height: 900 };
  const [w, h] = raw.split("x").map(Number);
  return { width: w || 1440, height: h || 900 };
})();

async function newBoard(page, name, type) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  if (type === "map") await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}

// Everything a person can press, inside one container, as it stands now.
const CONTROLS = "button, select, input, [role=menuitem], .wb-color-picker";
const describe = (root) => `(() => {
  const el = ${root};
  if (!el) return null;
  const seen = [];
  for (const c of el.querySelectorAll("${CONTROLS}")) {
    const box = c.getBoundingClientRect();
    if (c.hidden || c.closest("[hidden]")) continue;
    // enhanceSelect leaves the real <select> in place and adds an opener plus
    // one button per option: counting those would report a four-value picker
    // as five controls. The select is the control; its menu is its value list.
    if (c.closest(".select-menu") || c.classList.contains("select-opener")) continue;
    const cs = getComputedStyle(c);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    seen.push({
      id: c.id || "",
      tag: c.tagName.toLowerCase(),
      label: (c.getAttribute("aria-label") || c.title || c.textContent || "").trim().slice(0, 80),
      w: Math.round(box.width),
      h: Math.round(box.height),
    });
  }
  return seen;
})()`;

(async () => {
  const { browser, page } = await boot({ viewport: VIEWPORT });
  const out = {};

  await newBoard(page, "Audit map", "map");
  // Twelve topics: a trunk, four first-level branches, and seven under them,
  // which is the smallest tree that has a trunk, a branch with children, a
  // leaf and a second level for the ring's transplant slots to mean anything.
  await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    for (let i = 0; i < 4; i++) await wbMapAddChild(root.id);
    const index = wbMapIndex();
    const ids = index.childrenOf.get(root.id).map((n) => n.id);
    for (const id of ids.slice(0, 3)) {
      await wbMapAddChild(id);
      await wbMapAddChild(id);
    }
    await wbMapAddChild(ids[0]);
  });
  await page.waitForTimeout(2200);
  out.nodes = await page.evaluate(() => wbMapIndex().nodes.length);

  // 1. The top bar.
  out.topbar = await page.evaluate(describe(`document.getElementById("wb-topbar")`));
  // The three grouped menus in it, one at a time.
  out.menus = {};
  for (const [name, id] of [["Insert", "wb-insert-menu"], ["View", "wb-view-menu"], ["Board", "wb-board-menu"]]) {
    const opened = await page.evaluate((menuId) => {
      const menu = document.getElementById(menuId);
      if (!menu) return false;
      menu.classList.remove("hidden");
      return true;
    }, id);
    out.menus[name] = opened ? await page.evaluate(describe(`document.getElementById("${id}")`)) : null;
    await page.evaluate((menuId) => document.getElementById(menuId)?.classList.add("hidden"), id);
  }

  // 2. The rail (the bottom dock of tool sections).
  out.rail = await page.evaluate(describe(`document.getElementById("wb-tool-group")`));
  out.railSections = await page.evaluate(() => {
    const rows = [];
    for (const s of document.querySelectorAll("#wb-tool-group .wb-tool-section")) {
      if (getComputedStyle(s).display === "none") continue;
      rows.push({
        label: s.querySelector(".wb-tool-section-label")?.textContent.trim() || "",
        surface: s.dataset.wbSurface || "shared",
        controls: [...s.querySelectorAll("button, select, input")].filter(
          (c) => !c.hidden && getComputedStyle(c).display !== "none"
        ).length,
      });
    }
    return rows;
  });

  // 3. Select a leaf and read the node strip, the node's own row, and the ring.
  // A real click, not `wbHandleItemClick` from `page.evaluate`: the strip is
  // placed by `wbUpdateSelectionBar`, which the render pass calls, and a
  // selection made out of band leaves it at 0x0 (measured: w 0, h 0).
  const leaf = await page.evaluate(() => {
    const index = wbMapIndex();
    const leafNode = index.nodes.find((n) => (index.childrenOf.get(n.id) || []).length === 0);
    return leafNode.id;
  });
  const leafBox = await page.evaluate((id) => {
    const b = document.querySelector(`[data-id="${id}"]`)?.getBoundingClientRect();
    return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
  }, leaf);
  if (leafBox) await page.mouse.click(leafBox.x, leafBox.y);
  await page.waitForTimeout(900);
  out.strip = await page.evaluate(describe(`document.getElementById("wb-map-strip")`));
  out.stripBox = await page.evaluate(() => {
    const b = document.getElementById("wb-map-strip")?.getBoundingClientRect();
    return b ? { w: Math.round(b.width), h: Math.round(b.height) } : null;
  });
  out.nodeRow = await page.evaluate((id) => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (!el) return null;
    return [...el.querySelectorAll("button")].map((c) => ({
      cls: c.className.replace(/ghost |small |icon-only /g, ""),
      label: (c.getAttribute("aria-label") || c.title || "").slice(0, 60),
      hidden: c.hidden,
      opacity: Number(getComputedStyle(c).opacity),
    }));
  }, leaf);

  // 4. The node ring and the link ring.
  out.ring = await page.evaluate((id) => {
    const index = wbMapIndex();
    const node = index.byId.get(id);
    wbOpenMapRadial(node);
    const ring = document.getElementById("wb-map-radial");
    const slots = [...ring.querySelectorAll(".wb-map-radial-slot")].filter((s) => !s.hidden);
    const caption = ring.querySelector(".wb-map-radial-caption");
    return {
      slots: slots.map((s) => {
        const b = s.getBoundingClientRect();
        return {
          id: s.id,
          label: (s.getAttribute("aria-label") || s.title || "").slice(0, 70),
          // Is the label drawn, or only in the tooltip? The slot is icon-only,
          // so what is painted is the icon plus whatever ::after carries.
          text: s.textContent.trim(),
          w: Math.round(b.width),
          h: Math.round(b.height),
        };
      }),
      captionText: caption ? caption.textContent.trim() : null,
      captionShown: caption ? getComputedStyle(caption).opacity : null,
      ringHidden: ring.classList.contains("hidden"),
      stripHiddenWhileRing: document.getElementById("wb-map-strip")?.classList.contains("hidden"),
    };
  }, leaf);
  out.linkRing = await page.evaluate(() => {
    const ring = document.getElementById("wb-map-link-radial");
    const slots = [...ring.querySelectorAll(".wb-map-radial-slot")];
    return {
      slots: slots.map((s) => ({
        id: s.id,
        label: (s.getAttribute("aria-label") || s.title || "").slice(0, 70),
      })),
      caption: ring.querySelector(".wb-map-radial-caption")?.textContent.trim() || null,
    };
  });

  // 5. The flat context menu: what a right-click would have offered if the
  // ring did not take it. Built by the same function the gesture calls.
  out.ctxMenu = await page.evaluate((id) => {
    wbHandleItemClick("object", id, { shiftKey: false });
    const menu = wbBuildContextMenu("object");
    return [...menu.querySelectorAll(".menu-item")].map((b) => ({
      label: b.textContent.trim(),
      key: b.title,
    }));
  }, leaf);

  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
