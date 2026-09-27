// Every editor dropdown opens, and opens touching the thing it is about
// (INBOX 421 c, the owner: "sometimes document editor dropdowns appear at the
// top of the screen and other times it is fine, sometimes it doesnt open at
// all", with the spelling menu drawn at the top of the window).
//
// Real mouse input, not dispatched events: the bug lives in the gap between
// the press that moves the caret (which makes the Live view redraw the line
// under the pointer, revealing its markup) and the event that opens the menu,
// and a synthetic `click` on an element skips that gap entirely.
//
// For a flagged word at the top, the middle and the bottom of the visible
// editor, in a long document, three gestures each (click, right click,
// double click), and the "/" menu typed at the same three places. A case
// fails when the menu does not open, is not inside the window, or does not
// touch its word (more than 6px away vertically or overlapping it).
//
//   BASE=http://127.0.0.1:8794 node scratchpad/ui-sweeps/menuanchor.js
//   VIEW=390 THEME=dark ... for the phone width and dark.
const { boot } = require("./lib.js");

const WIDTH = Number(process.env.VIEW || 1440);
const FILL = "The quick brown fox jumped over the lazy dog and went home. ";
const WORDS = ["quozzle", "sproggle", "vimberlot", "frimbly", "glorptak", "zindrop"];

const content = () => {
  const lines = ["Menu anchor probe", ""];
  for (let i = 0; i < 90; i += 1) {
    // One flagged word every sixth paragraph, some inside **bold**, so the
    // line the caret lands on has markup to reveal and is redrawn.
    const w = WORDS[i % WORDS.length];
    lines.push(i % 6 === 0
      ? `Paragraph ${i}. ${FILL}Then **a ${w} word** sits here. ${FILL}`
      : `Paragraph ${i}. ${FILL}`);
    lines.push("");
  }
  return lines.join("\n");
};

(async () => {
  const phone = WIDTH < 600;
  // Booted wide and narrowed after the document is open, the way docnarrow.js
  // does: a phone-width boot lands on the documents list, not the editor.
  const { page, browser } = await boot({});
  let fails = 0;
  try {
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 160)));
    await page.evaluate(async (text) => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" };
      const doc = await (await fetch("/documents", {
        method: "POST", headers, body: JSON.stringify({ title: "Menu anchor probe", content: text }),
      })).json();
      window.__probeDoc = doc.id;
      switchTab("documents");
      await new Promise((r) => setTimeout(r, 500));
      await openDocument(doc.id);
      await new Promise((r) => setTimeout(r, 2500));
    }, content());
    if (phone) {
      await page.setViewportSize({ width: WIDTH, height: 844 });
      await page.waitForTimeout(900);
    }

    // Put a flagged word at a place in the editor's visible box: `where` is a
    // fraction of the box's height (0.08 top, 0.5 middle, 0.9 bottom).
    const place = async (where) => page.evaluate(async (frac) => {
      closeDocSuggest();
      editorCloseMenu?.();
      const scroller = document.querySelector(".cm-scroller");
      const box = scroller.getBoundingClientRect();
      const visTop = Math.max(box.top, 0);
      const visBottom = Math.min(box.bottom, window.innerHeight);
      const target = visTop + (visBottom - visTop) * frac;
      // Walk the findings, scroll each to the target line, take the first
      // that lands within a line of it.
      for (const finding of docProseFound) {
        if (!/[a-z]{6,}/.test(finding.text || "")) continue;
        const block = docCmView.lineBlockAt(finding.start);
        scroller.scrollTop = Math.max(0, block.top - (target - box.top) + block.height / 2);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 120));
        const mark = [...document.querySelectorAll("[data-doc-finding]")]
          .find((n) => docProseFound[Number(n.dataset.docFinding)] === finding);
        if (!mark) continue;
        const r = mark.getClientRects()[0];
        if (!r || Math.abs((r.top + r.bottom) / 2 - target) > 40) continue;
        window.__finding = finding;
        return { x: r.left + Math.min(8, r.width / 2), y: (r.top + r.bottom) / 2, text: finding.text };
      }
      return null;
    }, where);

    const measure = async () => page.evaluate(() => {
      const menu = document.getElementById("doc-suggest-menu");
      const open = menu && !menu.classList.contains("hidden");
      const mark = [...document.querySelectorAll("[data-doc-finding]")]
        .find((n) => docProseFound[Number(n.dataset.docFinding)] === window.__finding);
      const w = mark ? mark.getClientRects()[0] : null;
      if (!open) return { open: false };
      const m = menu.getBoundingClientRect();
      const gap = w ? Math.max(0, Math.round(m.top - w.bottom), Math.round(w.top - m.bottom)) : null;
      const overlaps = w ? !(m.bottom <= w.top + 1 || m.top >= w.bottom - 1) : null;
      // Flush with one of the word's edges, or (where the band is too narrow
      // for that, a phone) with the word inside the menu's own width.
      const edge = w ? Math.min(Math.abs(m.left - w.left), Math.abs(m.right - w.right)) : null;
      const spans = w ? m.left <= w.left + 1 && m.right >= w.right - 1 : false;
      const xOff = w ? (spans && window.innerWidth < 600 ? 0 : Math.round(edge)) : null;
      return {
        open: true, xOff,
        menu: [Math.round(m.left), Math.round(m.top), Math.round(m.right), Math.round(m.bottom)],
        word: w ? [Math.round(w.left), Math.round(w.top), Math.round(w.right), Math.round(w.bottom)] : null,
        gap, overlaps,
        inView: m.top >= 0 && m.left >= 0 && m.bottom <= window.innerHeight + 1 && m.right <= window.innerWidth + 1,
      };
    });

    for (const [label, frac] of [["top", 0.08], ["middle", 0.5], ["bottom", 0.9]]) {
      for (const gesture of phone ? ["click", "detached"] : ["click", "right", "double", "detached"]) {
        const at = await place(frac);
        if (!at) { console.log(`${label} ${gesture}: FAIL no flagged word placed`); fails += 1; continue; }
        await page.mouse.move(at.x, at.y);
        if (gesture === "click") await page.mouse.click(at.x, at.y);
        if (gesture === "right") await page.mouse.click(at.x, at.y, { button: "right" });
        if (gesture === "double") await page.mouse.dblclick(at.x, at.y);
        // The engine redrew the line between the press and the menu: the
        // element the gesture started on is detached and measures 0,0,0,0.
        if (gesture === "detached") {
          await page.evaluate(({ x, y }) => {
            const mark = [...document.querySelectorAll("[data-doc-finding]")]
              .find((n) => docProseFound[Number(n.dataset.docFinding)] === window.__finding);
            const ghost = mark.cloneNode(true);
            docOpenSuggestAtPoint(ghost, { x, y });
          }, at);
        }
        await page.waitForTimeout(500);
        const out = await measure();
        const bad = [];
        if (!out.open) bad.push("did not open");
        else {
          if (!out.inView) bad.push("out of the window");
          if (out.overlaps) bad.push("covers the word");
          if (out.gap === null) bad.push("word gone");
          else if (out.gap > 6) bad.push(`gap ${out.gap}px`);
          if (out.xOff > 2) bad.push(`${out.xOff}px off the word's edge`);
        }
        if (bad.length) fails += 1;
        console.log(`${label} ${gesture} (${at.text}): ${JSON.stringify(out)}${bad.length ? "  <<< " + bad.join(", ") : ""}`);
      }
    }

    // The "/" menu at the same three places: an empty line under a paragraph.
    for (const [label, frac] of [["top", 0.08], ["middle", 0.5], ["bottom", 0.9]]) {
      const out = await page.evaluate(async (fraction) => {
        closeDocSuggest();
        const scroller = document.querySelector(".cm-scroller");
        const box = scroller.getBoundingClientRect();
        const visTop = Math.max(box.top, 0);
        const visBottom = Math.min(box.bottom, window.innerHeight);
        const target = visTop + (visBottom - visTop) * fraction;
        const doc = docCmView.state.doc;
        // An empty line near the target.
        let pos = -1;
        for (let n = 3; n < doc.lines; n += 1) {
          const line = doc.line(n);
          if (line.length) continue;
          const block = docCmView.lineBlockAt(line.from);
          scroller.scrollTop = Math.max(0, block.top - (target - box.top));
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const c = docCmView.coordsAtPos(line.from);
          if (c && Math.abs(c.top - target) < 40) { pos = line.from; break; }
        }
        if (pos < 0) return { skip: true };
        docCmView.focus();
        docCmView.dispatch({ selection: { anchor: pos } });
        await new Promise((r) => setTimeout(r, 60));
        return { pos };
      }, frac);
      if (out.skip) { console.log(`/ ${label}: FAIL no empty line placed`); fails += 1; continue; }
      await page.keyboard.type("/");
      await page.waitForTimeout(350);
      const res = await page.evaluate((pos) => {
        const menu = document.getElementById("editor-menu");
        const open = menu && !menu.classList.contains("hidden");
        const c = docCmView.coordsAtPos(pos);
        const m = open ? menu.getBoundingClientRect() : null;
        const r = {
          open,
          menu: m ? [Math.round(m.left), Math.round(m.top), Math.round(m.right), Math.round(m.bottom)] : null,
          caret: c ? [Math.round(c.left), Math.round(c.top), Math.round(c.bottom)] : null,
        };
        if (m && c) {
          r.gap = Math.max(0, Math.round(m.top - c.bottom), Math.round(c.top - m.bottom));
          r.inView = m.top >= 0 && m.bottom <= window.innerHeight + 1 && m.left >= 0 && m.right <= window.innerWidth + 1;
        }
        return r;
      }, out.pos);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Backspace");
      const bad = [];
      if (!res.open) bad.push("did not open");
      else if (!res.inView) bad.push("out of the window");
      else if (res.gap > 8) bad.push(`gap ${res.gap}px`);
      if (bad.length) fails += 1;
      console.log(`/ ${label}: ${JSON.stringify(res)}${bad.length ? "  <<< " + bad.join(", ") : ""}`);
    }

    await page.evaluate(async () => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "" };
      await fetch(`/documents/${window.__probeDoc}`, { method: "DELETE", headers });
    });
    console.log(`page errors: ${errs.length}${errs.length ? " " + errs.join(" | ") : ""}`);
    console.log(fails ? `FAIL: ${fails} case(s)` : "all cases touch their word");
  } finally {
    await browser.close();
  }
  process.exit(fails ? 1 : 0);
})();
