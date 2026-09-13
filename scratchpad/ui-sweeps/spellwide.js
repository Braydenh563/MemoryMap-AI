// Where the word menu opens, across the conditions `spellanchor.js` never
// tried: a flagged word at the end of a long line, on the last line, with the
// editor scrolled, in split view, a second occurrence of the same word, a
// narrow window, and Large text + Spacious.
//
// Reported (INBOX 142, 128): "the popup edit suggestions menu screws upn the
// screen and make sit go out of bounds", "the popup didnt appear right next to
// it but off to the side with a wide gap".
const { boot } = require("./lib.js");

// One long line so a flagged word lands near the right edge of the card, one
// with the same word twice, filler so the editor really scrolls, and a flagged
// word on the very last line.
const FILL = "The quick brown fox jumped over the lazy dog and then went home again. ";
const CONTENT = [
  "Draft notes",
  "",
  "A short line with teh first typo in it.",
  `${FILL}${FILL}Then at the end of this one sits idk`,
  "",
  `Another paragraph that mentions idk twice, and again idk near the end of ${FILL}`,
  "",
  ...Array.from({ length: 40 }, (_, i) => `Filler paragraph ${i + 1}. ${FILL}`),
  "",
  "The last line of all ends with seperate",
].join("\n");

(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await page.click('[data-tab="library"]').catch(() => {});
  await page.waitForTimeout(900);
  await page.click('[data-target="library-view-documents"]').catch(() => {});
  await page.waitForTimeout(1200);
  const made = await page.evaluate(async (content) => {
    const r = await fetch("/documents", {
      method: "POST",
      headers: { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Anchor probe", content }),
    });
    const doc = await r.json();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 400));
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 2500));
    return { id: doc.id, findings: docProseFound.length, view: docView };
  }, CONTENT);
  console.log("seeded: " + JSON.stringify(made));

  // One case: pick a mark by a matcher, press the fragment a reader would
  // press, and report both boxes. Everything is measured, nothing is looked at.
  const one = async (name, setup, pick, opts = {}) => {
    // A live selection makes the plain-click route bail out (it reads as a
    // drag), and a previous case's jump leaves one; a previous case's scroll
    // leaves the rest of the document unrendered.
    await page.evaluate(() => {
      closeDocSuggest();
      const box = docSurface();
      if (box) box.setSelection(0, 0);
      const s = document.querySelector(".cm-scroller");
      if (s) s.scrollTop = 0;
    });
    await page.waitForTimeout(400);
    if (setup) { await page.evaluate(setup); await page.waitForTimeout(700); }
    const out = await page.evaluate(async (pickSrc) => {
      /* eslint no-new-func: 0 */
      const choose = new Function("return " + pickSrc)();
      const marks = [...document.querySelectorAll("[data-doc-finding]")];
      const el = choose(marks);
      if (!el) return { skip: "no mark", marks: marks.length };
      const rects = [...el.getClientRects()];
      const f = rects[0] || el.getBoundingClientRect();
      const at = { x: f.left + f.width / 2, y: f.top + f.height / 2 };
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: at.x, clientY: at.y }));
      await new Promise((r) => setTimeout(r, 700));
      const menu = document.getElementById("doc-suggest-menu");
      const open = menu && !menu.classList.contains("hidden");
      const m = open ? menu.getBoundingClientRect() : null;
      const card = document.querySelector(".cm-editor")?.getBoundingClientRect();
      // What frame is this fixed menu actually laid out against? A filter,
      // transform or backdrop-filter on any ancestor takes it off the viewport
      // (INBOX 168), so the sweep names the trapping ancestor rather than
      // leaving a stray 45px to be explained later.
      let trap = null;
      for (let node = menu?.parentElement; node && node !== document.documentElement; node = node.parentElement) {
        const cs = getComputedStyle(node);
        if (cs.transform !== "none" || cs.filter !== "none" ||
            (cs.backdropFilter && cs.backdropFilter !== "none") || cs.perspective !== "none") {
          trap = (node.id || node.className || node.tagName).toString().slice(0, 40);
          break;
        }
      }
      // The word's box as it is now: a reveal may have scrolled it.
      const live = [...document.querySelectorAll("[data-doc-finding]")]
        .find((n) => n.dataset.docFinding === el.dataset.docFinding);
      const w = live ? (([...live.getClientRects()][0]) || live.getBoundingClientRect()) : f;
      const box = (r) => ({ left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) });
      return {
        word: { text: el.textContent, ...box(w) },
        menu: m ? box(m) : "closed",
        editor: card ? { left: Math.round(card.left), right: Math.round(card.right) } : null,
        win: { w: window.innerWidth, h: window.innerHeight },
        gapX: m ? Math.max(0, Math.round(w.left - m.right), Math.round(m.left - w.right)) : null,
        gapY: m ? Math.max(0, Math.round(w.top - m.bottom), Math.round(m.top - w.bottom)) : null,
        pastCard: m && card ? Math.max(0, Math.round(m.right - card.right)) : null,
        inView: m ? (m.left >= 0 && m.top >= 0 && m.right <= window.innerWidth + 1 && m.bottom <= window.innerHeight + 1) : null,
        parent: menu?.parentElement?.tagName || null,
        trap,
      };
    }, pick.toString());
    const bad = [];
    if (out.menu && out.menu !== "closed") {
      // The menu must have left the card: a viewport popup inside a surface
      // that can be blurred is INBOX 168 waiting to happen again, whatever the
      // numbers read on the day.
      if (out.parent !== "BODY") bad.push(`parent is ${out.parent}, not body`);
      if (out.trap && !opts.trapOk) bad.push(`laid out against ${out.trap}, not the viewport`);
      if (!out.inView) bad.push("OUT OF BOUNDS");
      if (out.pastCard) bad.push(`${out.pastCard}px past the card`);
      if (out.gapX > 0) bad.push(`gapX ${out.gapX}`);
      if (out.gapY > 6) bad.push(`gapY ${out.gapY}`);
    } else if (!out.skip) bad.push("menu did not open");
    console.log(`${name}: ${JSON.stringify(out)} ${bad.length ? "  <<< " + bad.join(", ") : ""}`);
    return bad.length ? 1 : 0;
  };

  let bad = 0;
  bad += await one("mid-line (the old probe's case)", null, (m) => m.find((n) => /teh/.test(n.textContent)));
  bad += await one("end of a long line", null, (m) => m.find((n) => /idk/.test(n.textContent)));
  bad += await one("second occurrence of the same word", null,
    (m) => m.filter((n) => /idk/.test(n.textContent))[2] || m.filter((n) => /idk/.test(n.textContent))[1]);
  bad += await one("last line, editor scrolled to the end",
    () => { const s = document.querySelector(".cm-scroller"); if (s) s.scrollTop = s.scrollHeight; },
    (m) => m.find((n) => /seperate/.test(n.textContent)));
  bad += await one("split view, end of a long line",
    () => setDocView("split"),
    (m) => m.find((n) => /idk/.test(n.textContent)));
  bad += await one("source view, end of a long line",
    () => setDocView("source"),
    (m) => m.find((n) => /idk/.test(n.textContent)));
  bad += await one("live view again", () => setDocView("live"), (m) => m.find((n) => /idk/.test(n.textContent)));

  await page.setViewportSize({ width: 1100, height: 760 });
  await page.waitForTimeout(700);
  bad += await one("1100x760, end of a long line", null, (m) => m.find((n) => /idk/.test(n.textContent)));
  await page.setViewportSize({ width: 820, height: 700 });
  await page.waitForTimeout(700);
  bad += await one("820x700, end of a long line", null, (m) => m.find((n) => /idk/.test(n.textContent)));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(700);
  bad += await one("large text + spacious", () => {
    document.documentElement.setAttribute("data-fontsize", "large");
    document.documentElement.setAttribute("data-density", "spacious");
  }, (m) => m.find((n) => /idk/.test(n.textContent)));
  bad += await one("large text + spacious, last line",
    () => { const s = document.querySelector(".cm-scroller"); if (s) s.scrollTop = s.scrollHeight; },
    (m) => m.find((n) => /seperate/.test(n.textContent)));
  await page.evaluate(() => {
    document.documentElement.removeAttribute("data-fontsize");
    document.documentElement.removeAttribute("data-density");
  });
  // **The background art on, which is what INBOX 168 turned out to be.** With
  // `data-bg-art="on"` the app's own rule puts a backdrop-filter on every
  // `.card`, and a `position: fixed` menu inside one is laid out against the
  // card rather than against the window: measured before the fix, this case
  // asked for `left 952, top 322` and drew at `1245..1485, 399`, 45px past the
  // right edge of a 1440px window, 53px from the word, with the card's own
  // stacking context holding it under the bars. Every case below is the same
  // geometry as the cases above it, with the art on.
  await page.evaluate(() => document.documentElement.setAttribute("data-bg-art", "on"));
  await page.waitForTimeout(500);
  bad += await one("background art on, end of a long line", null, (m) => m.find((n) => /idk/.test(n.textContent)));
  bad += await one("background art on, last line scrolled",
    () => { const s = document.querySelector(".cm-scroller"); if (s) s.scrollTop = s.scrollHeight; },
    (m) => m.find((n) => /seperate/.test(n.textContent)));
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.waitForTimeout(500);
  bad += await one("background art on, 1100x760", null, (m) => m.find((n) => /idk/.test(n.textContent)));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  // The belt to that fix: a transform on body traps a body-level fixed popup
  // the same way the card did, and `docPlaceFixed` has to measure its way out
  // of it. Nothing in the app does this today, which is the point: the next
  // thing that does must not take the menu with it.
  await page.evaluate(() => { document.body.style.transform = "translate(31px, 17px)"; });
  await page.waitForTimeout(400);
  bad += await one("a transformed body, end of a long line", null,
    (m) => m.find((n) => /idk/.test(n.textContent)), { trapOk: true });
  await page.evaluate(() => {
    document.body.style.transform = "";
    document.documentElement.setAttribute("data-bg-art", "off");
  });
  await page.waitForTimeout(400);

  // The panel's row route, which the owner also reported. Since
  // DOCUMENTS_PLAN 12 D3 a row answers inside the panel and opens nothing over
  // the text, so that is what this asserts; prosepanel.js is the full probe.
  const rowCase = await page.evaluate(async () => {
    // The previous case left a menu open on a word; this one is about what a
    // row does, not about what is already on screen.
    closeDocSuggest();
    document.querySelector("[aria-controls='doc-prose-panel']")?.click();
    await new Promise((r) => setTimeout(r, 700));
    const row = document.querySelector("#doc-prose-panel .doc-prose-jump");
    if (!row) return "no row";
    row.click();
    await new Promise((r) => setTimeout(r, 800));
    const menu = document.getElementById("doc-suggest-menu");
    const answers = row.closest(".doc-prose-row").querySelector(".doc-prose-answers");
    const sel = document.querySelector(".cm-selectionBackground")?.getBoundingClientRect();
    const ed = document.querySelector(".cm-editor").getBoundingClientRect();
    return JSON.stringify({
      floatingOpen: menu ? !menu.classList.contains("hidden") : false,
      answerRows: answers.querySelectorAll("button").length,
      wordVisible: sel ? sel.top >= ed.top && sel.bottom <= ed.bottom : null,
    });
  });
  console.log("panel row -> " + rowCase);
  if (/"floatingOpen":true/.test(rowCase)) bad += 1;
  console.log("console errors: " + (errs.length ? errs.join(" | ") : "0"));
  console.log(bad ? `FAIL: ${bad} case(s) off` : "all cases flush");
  await browser.close();
})().catch((e) => { console.log("ERR " + e.message); process.exit(1); });
