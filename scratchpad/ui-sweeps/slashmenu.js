// The "/" block menu, driven by the keyboard in the note capture box and in
// a document (INBOX 421 b: the blocks were "confusing to use, and limited in
// what they can do and how to use them").
//
// Per surface: the rows and groups with nothing typed, every row carrying an
// icon element in its tile, the preview (at desktop widths) holding a real
// render, fuzzy search ("twcl" finds Two columns), Tab reaching the next
// group's first row, Enter inserting the block, the code block's language
// step, Recent leading the next open, and the popup inside the window.
//
//   BASE=http://127.0.0.1:8794 node scratchpad/ui-sweeps/slashmenu.js
//   VIEW=390 THEME=dark ... for the phone width and dark.
const { boot } = require("./lib.js");

const WIDTH = Number(process.env.VIEW || 1440);

(async () => {
  const { page, browser } = await boot({});
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + detail : ""}`);
  };
  const state = () => page.evaluate(() => {
    const menu = document.getElementById("editor-menu");
    const open = menu && !menu.classList.contains("hidden");
    if (!open) return { open: false };
    const rows = [...menu.querySelectorAll(".editor-menu-item")];
    const groups = [...menu.querySelectorAll(".editor-menu-group")].map((g) => g.textContent);
    const active = menu.querySelector(".editor-menu-item.active");
    const pane = document.getElementById("editor-menu-preview");
    const m = menu.getBoundingClientRect();
    return {
      open: true,
      rows: rows.length,
      groups,
      tiles: rows.filter((r) => r.querySelector(".editor-menu-tile i.ph")).length,
      abouts: rows.filter((r) => r.querySelector(".editor-menu-about")).length,
      active: active ? active.querySelector(".editor-menu-label").textContent : null,
      activeGroup: active ? (() => {
        let el = active.previousElementSibling;
        while (el && !el.classList.contains("editor-menu-group")) el = el.previousElementSibling;
        return el ? el.textContent : null;
      })() : null,
      preview: pane && !pane.classList.contains("hidden")
        ? { rendered: pane.querySelectorAll(".editor-menu-sample > *").length, head: pane.querySelector(".editor-menu-preview-head")?.textContent }
        : null,
      box: [Math.round(m.left), Math.round(m.top), Math.round(m.right), Math.round(m.bottom)],
      inView: m.left >= 0 && m.top >= 0 && m.right <= innerWidth + 1 && m.bottom <= innerHeight + 1,
      phText: [...menu.querySelectorAll("*")].some((el) => [...el.childNodes].some((n) => n.nodeType === 3 && /\bph:[a-z]/.test(n.nodeValue))),
    };
  });

  const errors = [];
  page.on("pageerror", (e) => errors.push((e.stack || e.message).split("\n").filter((l) => !l.includes("codemirror.min.js")).slice(0, 8).join(" | ")));
  try {
    await page.evaluate(() => { Error.stackTraceLimit = 60; try { localStorage.removeItem("editorRecentBlocks"); } catch {} });
    const doc = await page.evaluate(async () => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" };
      const d = await (await fetch("/documents", { method: "POST", headers, body: JSON.stringify({ title: "Slash probe", content: "Slash probe\n\n## One\n\n" }) })).json();
      return d.id;
    });
    if (WIDTH < 600) await page.setViewportSize({ width: WIDTH, height: 844 });

    for (const surface of ["note", "document"]) {
      console.log(`--- ${surface}`);
      if (surface === "note") {
        await page.evaluate(async () => {
          switchTab("notes");
          showNotesSection("capture");
          await new Promise((r) => setTimeout(r, 1200));
        });
        await page.click("#entry-content");
      } else {
        await page.evaluate(async (id) => {
          switchTab("documents");
          await new Promise((r) => setTimeout(r, 500));
          await openDocument(id);
          await new Promise((r) => setTimeout(r, 2000));
          if (typeof setDocView === "function") setDocView("live");
          await new Promise((r) => setTimeout(r, 500));
          docCmView.focus();
          docCmView.dispatch({ selection: { anchor: docCmView.state.doc.length } });
        }, doc);
      }
      const text = () => page.evaluate((s) => s === "note"
        ? document.getElementById("entry-content").value
        : docCmView.state.doc.toString(), surface);

      await page.keyboard.type("/");
      await page.waitForTimeout(400);
      let s = await state();
      console.log(JSON.stringify({ ...s, groups: s.groups && s.groups.join(",") }));
      check(`${surface}: opens`, s.open);
      check(`${surface}: groups`, s.groups && ["Basic", "Structure", "Callouts", "Media", "Embeds", "Advanced"].every((g) => s.groups.includes(g)), s.groups && s.groups.join(","));
      check(`${surface}: row count`, s.rows >= 40, s.rows);
      check(`${surface}: every tile has an icon element`, s.tiles === s.rows, `${s.tiles}/${s.rows}`);
      check(`${surface}: no icon token as text`, !s.phText);
      check(`${surface}: inside the window`, s.inView, JSON.stringify(s.box));
      if (WIDTH >= 704) check(`${surface}: preview renders the block`, s.preview && s.preview.rendered > 0, JSON.stringify(s.preview));
      else check(`${surface}: no preview on a phone`, !s.preview);

      const groupsAtOpen = s.groups;
      await page.keyboard.press("Tab");
      s = await state();
      check(`${surface}: Tab jumps to the next group`, s.activeGroup === groupsAtOpen[1], `${s.active} in ${s.activeGroup}`);
      await page.keyboard.press("Shift+Tab");
      s = await state();
      check(`${surface}: Shift+Tab jumps back`, s.activeGroup === groupsAtOpen[0], `${s.active} in ${s.activeGroup}`);

      await page.keyboard.type("twcl");
      await page.waitForTimeout(250);
      s = await state();
      check(`${surface}: fuzzy "twcl"`, s.active === "Two columns", s.active);
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await page.keyboard.type("toc");
      await page.waitForTimeout(250);
      s = await state();
      check(`${surface}: "toc" finds contents`, s.active === "Table of contents", s.active);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      const afterToc = await text();
      check(`${surface}: Enter writes [TOC]`, /\[TOC\]\n/.test(afterToc) && !/\/toc/.test(afterToc), JSON.stringify(afterToc.slice(-30)));

      // The code block's language step.
      await page.keyboard.type("/code");
      await page.waitForTimeout(300);
      s = await state();
      check(`${surface}: "code" finds the code block`, s.active === "Code block", s.active);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      s = await state();
      check(`${surface}: language step opens`, s.open && s.groups[0] === "Language", JSON.stringify(s.groups));
      await page.keyboard.type("py");
      await page.waitForTimeout(250);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      const afterCode = await text();
      check(`${surface}: fence written with its language and closed`, /```python\n\n```/.test(afterCode), JSON.stringify(afterCode.slice(-40)));
      await page.keyboard.type("print(1)");

      // Recent leads the next open.
      // To the end of the text, on a fresh line, whatever wrapping the width
      // gives the fence.
      await page.keyboard.press("Control+End");
      await page.keyboard.press("Enter");
      await page.keyboard.type("/");
      await page.waitForTimeout(350);
      s = await state();
      check(`${surface}: Recent first`, s.open && s.groups[0] === "Recent" && ["Code block", "Table of contents"].includes(s.active), `${s.groups && s.groups[0]}: ${s.active} (${JSON.stringify(await page.evaluate(() => editorRecentIds()))}) ${s.open ? "" : JSON.stringify((await text()).slice(-40))}`);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Backspace");
      s = await state();
      check(`${surface}: Escape closes`, !s.open);
    }

    await page.evaluate(async (id) => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "" };
      await fetch(`/documents/${id}`, { method: "DELETE", headers });
      const box = document.getElementById("entry-content");
      box.value = "";
      box.dispatchEvent(new Event("input", { bubbles: true }));
    }, doc);
    check("no page errors", !errors.length, errors.join(" || "));
    console.log(fails ? `FAIL: ${fails} check(s)` : "the block menu works");
  } finally {
    await browser.close();
  }
  process.exit(fails ? 1 : 0);
})();
