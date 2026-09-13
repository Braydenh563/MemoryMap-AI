// The note edit form's formatting bar, while the note is scrolled.
//
// Reported: "when I open the edit form for a note and scroll down, only the
// bottom of the formatting bar sticks to the top of the screen and the bar is
// clear so it is hard to see", with a screenshot of the bar's icons and the
// note's own text legible through each other.
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
  await page.click('[data-tab="notes"]').catch(() => {});
  await page.waitForTimeout(1500);
  // Open the edit form on the long note.
  const opened = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#entry-list li")];
    // Any note will do: the bar is the same markup on every one. The named
    // note was a seeded fixture that does not survive a fresh data dir.
    const card = cards.find((li) => /sticky toolbar/i.test(li.textContent || "")) || cards[0];
    if (!card) return "no card";
    const edit = [...card.querySelectorAll("button")].find((b) => /edit/i.test(b.textContent + (b.title || "")));
    if (!edit) return "no edit button";
    edit.click();
    return "opened";
  });
  console.log("open: " + opened);
  await page.waitForTimeout(1800);
  console.log(await page.evaluate(() => {
    const bar = document.querySelector(".note-edit-toolbar") || document.querySelector("#entry-list .doc-toolbar");
    if (!bar) return "no toolbar";
    const cs = getComputedStyle(bar);
    const r = bar.getBoundingClientRect();
    return JSON.stringify({
      position: cs.position, top: cs.top, zIndex: cs.zIndex,
      // Both layers: with the tint stacked over an opaque base the colour
      // layer is the base and the tint lives in background-image, so reading
      // backgroundColor alone would report the wrong thing either way.
      background: cs.backgroundColor,
      backgroundImage: cs.backgroundImage,
      opaque: !/rgba\([^)]*,\s*0?\.\d+\s*\)/.test(cs.backgroundColor),
      backdrop: cs.backdropFilter,
      rows: new Set([...bar.children].filter((c) => c.getBoundingClientRect().height > 4)
        .map((c) => Math.round(c.getBoundingClientRect().top / 12))).size,
      box: { top: Math.round(r.top), h: Math.round(r.height) },
    });
  }));
  // The other half of the same report: "only the bottom of the formatting bar
  // sticks to the top of the screen". Scroll the form and ask what is actually
  // painted over the bar's own top edge.
  console.log(await page.evaluate(async () => {
    const bar = document.querySelector(".note-edit-toolbar") || document.querySelector("#entry-list .doc-toolbar");
    if (!bar) return "no toolbar";
    // Whatever actually scrolls: walk up from the bar until an ancestor has
    // more content than box. The sticky parent is the one that matters, and
    // guessing at #entry-list would have been guessing.
    let scroller = bar.parentElement;
    while (scroller && scroller.scrollHeight <= scroller.clientHeight + 4) scroller = scroller.parentElement;
    const before = bar.getBoundingClientRect().top;
    // **Scrolled to where the bar is actually stuck, not past it.** A sticky
    // box is clamped by its own parent, and the parent here is one note's
    // `<li>`: once the card has scrolled by, the bar goes with it, which is
    // correct and is not what the report is about. Measuring at a fixed 400px
    // read the bar mid-flight and made the offset below look like it had done
    // nothing. Scroll until the bar stops moving instead.
    const scroll = scroller || document.scrollingElement;
    let last = before;
    for (let i = 0; i < 30; i += 1) {
      scroll.scrollTop += 20;
      await new Promise((r) => setTimeout(r, 40));
      const now = bar.getBoundingClientRect().top;
      if (Math.abs(now - last) < 0.5) break;
      last = now;
    }
    await new Promise((r) => setTimeout(r, 300));
    const r = bar.getBoundingClientRect();
    const cs = getComputedStyle(bar);
    // Three points down the bar's own height: is each one reached by the bar,
    // or by something painted over it?
    const probe = (frac) => {
      const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height * frac);
      const i = stack.indexOf(bar);
      return {
        at: Math.round(r.top + r.height * frac),
        // Everything above the bar in the paint order at that point.
        over: (i < 0 ? stack : stack.slice(0, i))
          .filter((el) => el !== bar && !bar.contains(el))
          .map((el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""}`)
          .slice(0, 3),
      };
    };
    const strip = document.getElementById("notes-subtabs");
    const st = strip ? strip.getBoundingClientRect() : null;
    const sc = scroll.getBoundingClientRect();
    return JSON.stringify({
      scroller: scroller ? (scroller.id || scroller.className || scroller.tagName) : "page",
      scrollerTop: Math.round(sc.top),
      // The thing the bar was hiding behind, and the token that now clears it.
      strip: st ? { top: Math.round(st.top), bottom: Math.round(st.bottom), h: Math.round(st.height) } : null,
      token: getComputedStyle(document.getElementById("tab-notes")).getPropertyValue("--notes-sticky-top").trim(),
      // The number the report is about: the bar's top must not be above the
      // strip's bottom while both are parked.
      clearsStrip: st ? Math.round(r.top - st.bottom) : null,
      scrolled: Math.round(scroll.scrollTop),
      movedBy: Math.round(before - r.top),
      stuckTop: Math.round(r.top),
      h: Math.round(r.height),
      zIndex: cs.zIndex,
      top: probe(0.05),
      mid: probe(0.5),
      bottom: probe(0.95),
    });
  }));
  await browser.close();
})().catch((e) => { console.log("ERR " + e.message); process.exit(1); });
