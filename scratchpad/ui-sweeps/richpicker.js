// The rich picker (DESIGN.md's recipe index, rich-picker.js) on every list
// converted to it: the command palette (Ctrl+K) and the capture box's [[ link
// suggest. The owner: "I reallllllyyyy like the design of this popup panel
// menu for the / commands. can we do more similar design styles elsewhere in
// the app??"
//
// Per surface: the rows and their anatomy (tile, title over a muted line,
// keycap), row height, the preview pane (shown from 44rem, holding what the
// row says), no sideways scroll, the popup inside the window, and the
// keyboard: arrows move one lit row, typing filters, Enter runs or inserts,
// Escape closes. Screenshots to scratchpad/shots/rich-picker/<TAG>-...
//
//   BASE=http://127.0.0.1:8797 TAG=after VIEW=390 THEME=dark \
//     node scratchpad/ui-sweeps/richpicker.js
const fs = require("fs");
const path = require("path");
const { boot } = require("./lib.js");

const WIDTH = Number(process.env.VIEW || 1440);
const HEIGHT = WIDTH < 600 ? 844 : 900;
const TAG = process.env.TAG || "after";
const THEME = process.env.THEME || "light";
const SHOTS = path.join(__dirname, "..", "shots", "rich-picker");
//: ONLY=palette,wiki,doclink,create runs just those sections.
const want = (name) => !process.env.ONLY || process.env.ONLY.split(",").includes(name);

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const phone = WIDTH < 600;
  const { page, browser } = await boot({
    viewport: { width: WIDTH, height: HEIGHT },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + detail : ""}`);
  };
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${TAG}-${name}-${WIDTH}-${THEME}.png`) });

  //: One measure for any list: the rows, what each carries, the lit row, the
  //: preview, and whether the popup fits.
  const measure = (listSel, rowSel, previewSel, boxSel) => page.evaluate(([listSel, rowSel, previewSel, boxSel]) => {
    const list = document.querySelector(listSel);
    const box = document.querySelector(boxSel);
    if (!list || !box || box.classList.contains("hidden") || !box.getClientRects().length) return { open: false };
    const rows = [...list.querySelectorAll(rowSel)];
    const heights = rows.map((r) => Math.round(r.getBoundingClientRect().height)).sort((a, b) => a - b);
    const active = list.querySelectorAll(".active");
    const pane = previewSel ? document.querySelector(previewSel) : null;
    const paneOn = pane && !pane.classList.contains("hidden") && getComputedStyle(pane).display !== "none";
    const b = box.getBoundingClientRect();
    const tile = rows[0]?.querySelector(".rich-picker-tile");
    return {
      open: true,
      rows: rows.length,
      rowH: heights.length ? heights[Math.floor(heights.length / 2)] : 0,
      tiles: rows.filter((r) => r.querySelector(".rich-picker-tile")).length,
      tileBox: tile ? `${Math.round(tile.getBoundingClientRect().width)}x${Math.round(tile.getBoundingClientRect().height)}` : "none",
      abouts: rows.filter((r) => r.querySelector(".rich-picker-about")).length,
      keys: rows.filter((r) => r.querySelector("kbd")).length,
      keysText: rows.map((r) => r.querySelector("kbd")?.textContent).filter(Boolean).slice(0, 4),
      groups: [...list.querySelectorAll(".rich-picker-group, .palette-group-header")].map((g) => g.textContent).slice(0, 6),
      lit: active.length,
      litIndex: rows.indexOf(active[0]),
      litLabel: active[0] ? (active[0].querySelector(".rich-picker-label") || active[0]).textContent.trim().slice(0, 40) : null,
      activedescendant: list.getAttribute("aria-activedescendant") || "",
      pane: paneOn ? {
        w: Math.round(pane.getBoundingClientRect().width),
        head: pane.querySelector(".rich-picker-preview-head")?.textContent.trim().slice(0, 40) || "",
        about: pane.querySelector(".rich-picker-preview-about")?.textContent.trim().slice(0, 60) || "",
        sample: pane.querySelector(".rich-picker-sample")?.textContent.trim().slice(0, 60) || "",
        keys: pane.querySelector(".rich-picker-preview-keys")?.textContent.trim() || "",
      } : null,
      box: `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)}`,
      inView: b.left >= 0 && b.top >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1,
      hscroll: list.scrollWidth > list.clientWidth + 1,
      scrollerThin: getComputedStyle(list).scrollbarWidth,
      hover: rows[1] ? getComputedStyle(rows[1]).backgroundColor : "",
    };
  }, [listSel, rowSel, previewSel, boxSel]);

  if (want("palette")) {
    // --- the command palette -------------------------------------------------
    const PAL = ["#palette-list", "li[role=option], li:not(.palette-group-header):not(.rich-picker-group)", "#palette-preview", "#palette-card"];
    if (phone) await page.evaluate(() => openPalette());
    else await page.keyboard.press("Control+k");
    await page.waitForTimeout(500);
    let m = await measure(...PAL);
    check("palette opens", m.open, m.box);
    if (m.open) {
      console.log("     palette", JSON.stringify(m));
      check("palette: one lit row", m.lit === 1, `${m.lit} lit, "${m.litLabel}"`);
      check("palette: no sideways scroll", !m.hscroll);
      check("palette: inside the window", m.inView, m.box);
      await shot("palette");
      const first = m.litLabel;
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(150);
      const down = await measure(...PAL);
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(150);
      const up = await measure(...PAL);
      const order = await page.evaluate(() => paletteMatches("").map((r) => r.label.replace(/^ph:[\w-]+\s+/, "")));
      check("palette: ArrowDown x3 lights the fourth row", down.litLabel === order[3], `"${down.litLabel}" vs "${order[3]}" (from "${first}")`);
      check("palette: ArrowUp lights the third", up.litLabel === order[2], `"${up.litLabel}"`);
      if (down.pane) await shot("palette-row4");
      await page.keyboard.type("new");
      await page.waitForTimeout(250);
      const typed = await measure(...PAL);
      console.log("     typed 'new'", JSON.stringify({ rows: typed.rows, lit: typed.litLabel, keys: typed.keysText, pane: typed.pane }));
      check("palette: typing filters", typed.rows > 0 && typed.rows < m.rows, `${m.rows} -> ${typed.rows}`);
      await shot("palette-new");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const closed = await page.evaluate(() => document.getElementById("palette-overlay").classList.contains("hidden"));
      check("palette: Escape closes", closed);
      //: Enter runs the lit row: "Toggle light/dark" is the one command whose
      //: effect is visible without leaving the page, and it is run twice so the
      //: theme the sweep measures is the one it asked for.
      const runs = [];
      for (let i = 0; i < 2; i += 1) {
        if (phone) await page.evaluate(() => openPalette());
        else await page.keyboard.press("Control+k");
        await page.waitForTimeout(300);
        await page.keyboard.type("toggle light");
        await page.waitForTimeout(200);
        const before = await page.evaluate(() => document.documentElement.dataset.theme || localStorage.getItem("theme"));
        await page.keyboard.press("Enter");
        await page.waitForTimeout(400);
        const after = await page.evaluate(() => ({
          theme: document.documentElement.dataset.theme || localStorage.getItem("theme"),
          closed: document.getElementById("palette-overlay").classList.contains("hidden"),
        }));
        runs.push(`${before}->${after.theme}${after.closed ? " closed" : " OPEN"}`);
      }
      check("palette: Enter runs the lit row and closes", runs.every((r) => r.endsWith("closed")) && !runs[0].startsWith(runs[0].split("->")[1]), runs.join(", "));
    }

  }
  if (want("wiki")) {
    // --- the [[ link suggest in the capture box --------------------------------
    await page.evaluate(() => switchTab("notes"));
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("#notes-subtabs button")].find((b) => /capture/i.test(b.textContent));
      if (btn) btn.click();
    });
    await page.waitForTimeout(800);
    //: The note engine mounts over the textarea on first focus, and the blur
    //: that mounting causes hides the list: wait for it before typing.
    await page.click("#entry-content").catch(() => {});
    await page.waitForTimeout(2500);
    const editable =(await page.$(".cm-editor .cm-content")) || (await page.$("#entry-content"));
    if (!editable) {
      check("capture box on screen", false);
    } else {
      await editable.click();
      //: Two lines first, so the caret is not on the box's first line and a
      //: list under the box is told apart from a list under the caret.
      await page.keyboard.type("First line");
      await page.keyboard.press("Enter");
      await page.keyboard.type("See [[");
      await page.waitForTimeout(500);
      //: Whichever list opened: the old one under the box (`#wiki-suggest`), or
      //: the "/" menu's panel at the caret (`#editor-menu`), which the owner
      //: asked for: "this dropdown should show below the line being written in
      //: a separate popup panel like the / command menu, not below the textbox".
      const which = await page.evaluate(() => {
        const old = document.getElementById("wiki-suggest");
        if (old && !old.classList.contains("hidden") && old.getClientRects().length) return "old";
        const menu = document.getElementById("editor-menu");
        return menu && !menu.classList.contains("hidden") ? "menu" : "none";
      });
      const WIKI = which === "old"
        ? ["#wiki-suggest-list, ul#wiki-suggest", "li[role=option]", "#wiki-suggest-preview", "#wiki-suggest"]
        : ["#editor-menu-list", ".editor-menu-item", "#editor-menu-preview", "#editor-menu"];
      const w = await measure(...WIKI);
      check("[[ suggest opens", w.open, `${which} ${w.box}`);
      if (w.open) {
        const caret = await page.evaluate((sel) => {
          const cursor = document.querySelector(".cm-editor .cm-cursor");
          const c = cursor ? cursor.getBoundingClientRect() : null;
          const p = document.querySelector(sel).getBoundingClientRect();
          return c ? { caretTop: Math.round(c.top), caretBottom: Math.round(c.bottom), panelTop: Math.round(p.top), panelBottom: Math.round(p.bottom) } : null;
        }, WIKI[3]);
        const below = caret && caret.panelTop - caret.caretBottom;
        const above = caret && caret.caretTop - caret.panelBottom;
        console.log("     wiki", which, JSON.stringify({ ...w, caret }));
        check("[[: the panel sits at the caret line (under 8px from it)", caret && ((below >= 0 && below < 8) || (above >= 0 && above < 8)), caret ? `below ${below}, above ${above}` : "no caret");
        check("[[: one lit row", w.lit === 1, `${w.lit}`);
        check("[[: no sideways scroll", !w.hscroll);
        await shot("wiki");
        await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(150);
        const d = await measure(...WIKI);
        check("[[: ArrowDown moves the lit row", d.litIndex === w.litIndex + 1, `row ${w.litIndex} -> ${d.litIndex} ("${d.litLabel}")`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
        const gone = await measure(...WIKI);
        check("[[: Escape closes", !gone.open);
        await page.keyboard.press("Backspace");
        await page.keyboard.press("Backspace");
        await page.keyboard.type("[[");
        await page.waitForTimeout(400);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);
        const value = await page.evaluate(() => document.getElementById("entry-content").value);
        check("[[: Enter inserts a finished link", /\[\[[^\]]+\]\]/.test(value), JSON.stringify(value.slice(0, 60)));
      }
      await page.evaluate(() => {
        const box = document.getElementById("entry-content");
        box.value = "";
        box.dispatchEvent(new InputEvent("input", { bubbles: true }));
      });
    }

  }
  if (want("doclink")) {
    // --- [[ in a document: the "/" menu's own list, now with the note's lines --
    const docId = await page.evaluate(async () => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" };
      const d = await (await fetch("/documents", { method: "POST", headers, body: JSON.stringify({ title: "Link probe", content: "Link probe\n\n" }) })).json();
      return d.id;
    });
    await page.evaluate(async (id) => {
      switchTab("documents");
      await new Promise((r) => setTimeout(r, 500));
      await openDocument(id);
      await new Promise((r) => setTimeout(r, 2000));
      if (typeof setDocView === "function") setDocView("live");
      await new Promise((r) => setTimeout(r, 500));
      docCmView.focus();
      docCmView.dispatch({ selection: { anchor: docCmView.state.doc.length } });
    }, docId);
    await page.keyboard.type("[[");
    await page.waitForTimeout(600);
    const EDM = ["#editor-menu-list", ".editor-menu-item", "#editor-menu-preview", "#editor-menu"];
    const d1 = await measure(...EDM);
    check("document [[ opens", d1.open, d1.box);
    if (d1.open) {
      console.log("     doc [[", JSON.stringify({ rows: d1.rows, rowH: d1.rowH, lit: d1.litLabel, pane: d1.pane, box: d1.box }));
      check("document [[: the preview shows the note's lines where there is room", phone ? !d1.pane : Boolean(d1.pane && d1.pane.sample), d1.pane ? d1.pane.sample : "no pane");
      await shot("doc-link");
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(150);
      const d2 = await measure(...EDM);
      check("document [[: ArrowDown moves the lit row", d2.litIndex === d1.litIndex + 1, `${d1.litIndex} -> ${d2.litIndex}`);
      await page.keyboard.press("Escape");
    }
    await page.evaluate(async (id) => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "" };
      await fetch(`/documents/${id}`, { method: "DELETE", headers });
    }, docId);

  }
  if (want("create")) {
    // --- the Library's Create picker: the kinds you can make -------------------
    //: A dialog of buttons, not a listbox: Tab walks the kinds, Enter or a
    //: click makes one, Escape closes. Only the rows' look moves to the recipe.
    await page.evaluate(async () => {
      switchTab("library");
      await new Promise((r) => setTimeout(r, 1500));
      const all = document.querySelector('#library-subtabs button[data-target="library-view-all"], #library-subtabs button');
      all?.click();
      await new Promise((r) => setTimeout(r, 600));
      if (typeof openLibraryCreatePicker === "function") openLibraryCreatePicker();
      await new Promise((r) => setTimeout(r, 400));
    });
    const create = () => page.evaluate(() => {
      const card = document.querySelector(".library-create-picker");
      if (!card) return { open: false };
      const rows = [...card.querySelectorAll("[data-kind]")];
      const heights = rows.map((r) => Math.round(r.getBoundingClientRect().height));
      const b = card.getBoundingClientRect();
      return {
        open: true,
        rows: rows.length,
        rowH: heights.sort((a, c) => a - c)[Math.floor(heights.length / 2)],
        tiles: rows.filter((r) => r.querySelector(".rich-picker-tile")).length,
        keys: rows.map((r) => r.querySelector("kbd")?.textContent).filter(Boolean),
        focused: document.activeElement?.dataset?.kind || document.activeElement?.tagName,
        box: `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)}`,
        inView: b.left >= 0 && b.top >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1,
        hscroll: [...card.querySelectorAll("ul")].some((u) => u.scrollWidth > u.clientWidth + 1),
        focusBg: document.activeElement ? getComputedStyle(document.activeElement).backgroundColor : "",
      };
    });
    const c1 = await create();
    check("Create picker opens", c1.open, c1.box);
    if (c1.open) {
      console.log("     create", JSON.stringify(c1));
      check("Create: inside the window, no sideways scroll", c1.inView && !c1.hscroll, c1.box);
      await shot("create");
      //: One row lit with the pointer resting on another than the focused one.
      if (!phone) {
        const third = await page.$('.library-create-picker [data-kind="map"]');
        await third.hover();
        await page.waitForTimeout(150);
        const lit = await page.evaluate(() => [...document.querySelectorAll(".library-create-picker [data-kind]")]
          .filter((r) => getComputedStyle(r).backgroundColor !== "rgba(0, 0, 0, 0)").map((r) => r.dataset.kind));
        check("Create: one row lit with the pointer on another", lit.length === 1 && lit[0] === "map", lit.join(","));
        await page.mouse.move(2, 2);
      }
      await page.keyboard.press("Tab");
      await page.waitForTimeout(100);
      const c2 = await create();
      check("Create: Tab walks to the next kind", c2.focused === "document" && c1.focused === "note", `${c1.focused} -> ${c2.focused}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      check("Create: Escape closes", !(await create()).open);
    }

  }
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "the rich pickers hold");
  process.exit(fails ? 1 : 0);
})();
