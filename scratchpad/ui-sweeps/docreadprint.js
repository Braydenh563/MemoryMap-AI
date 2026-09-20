// Probe: Read view's typography and what the app puts on paper
// (DOCUMENTS_PLAN Phase 5 item 4's remainder). Measured rather than reasoned:
// the measure in characters, the leading, and then the same page under
// `emulateMedia({ media: "print" })`, which is the only way to see a print
// stylesheet without a printer.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };

const BODY = [
  "# A paper about something",
  "",
  "The quick brown fox jumps over the lazy dog, and then it does so again, at",
  "rather more length than the first time, so that this paragraph wraps across",
  "several lines and the measure can be counted from the box it wraps inside.",
  "",
  "## A second section",
  "",
  "More words, enough of them that the reading column has to make a decision",
  "about how wide a line of this document is allowed to be before it becomes",
  "tiring to read, which is the whole of what a measure is.",
  "",
  "- a list item",
  "- another list item",
  "",
  "> a quotation, which reads as its own block",
  "",
  "```",
  "code(that, is, not, prose);",
  "```",
].join("\n");

//: Characters per line, the way typography means it: the column's own width
//: divided by the width of one average character in the face actually drawn.
const measure = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const p = el.querySelector("p");
  const cs = getComputedStyle(p || el);
  const probe = document.createElement("span");
  probe.textContent = "abcdefghijklmnopqrstuvwxyz";
  probe.style.font = cs.font;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.whiteSpace = "pre";
  (p || el).appendChild(probe);
  const charW = probe.getBoundingClientRect().width / 26;
  probe.remove();
  const box = (p || el).getBoundingClientRect();
  return {
    width: Math.round(box.width),
    chars: Math.round(box.width / charW),
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    leading: +(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2),
    family: cs.fontFamily.split(",")[0].replace(/"/g, ""),
  };
}, selector);

(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.evaluate(async (content) => {
    const r = await api("/documents", { method: "POST",
      body: JSON.stringify({ title: "Reading probe", content }) });
    const doc = await r.json();
    switchTab("documents");
    await openDocument(doc.id);
  }, BODY);
  await page.waitForTimeout(2400);
  await page.evaluate(() => setDocView("rendered"));
  await page.waitForTimeout(900);

  const read = await measure(page, "#doc-preview");
  console.log("      read view:", JSON.stringify(read));
  ok("Read view is on screen", read && read.width > 100, JSON.stringify(read));
  //: 45 to 90 characters is the range every typography reference gives, and
  //: the plan asks for a measure by name.
  ok("the measure is in the readable range", read.chars >= 45 && read.chars <= 90, `${read.chars} characters`);
  ok("the leading is at least 1.5", read.leading >= 1.5, `${read.leading}`);

  await page.evaluate(() => document.getElementById("doc-serif").click());
  await page.waitForTimeout(600);
  const serif = await measure(page, "#doc-preview");
  const caps = await page.evaluate(() => {
    const el = document.getElementById("doc-preview");
    const cs = getComputedStyle(el);
    return {
      maxWidth: cs.maxWidth,
      width: Math.round(el.getBoundingClientRect().width),
      pane: Math.round(el.parentElement.getBoundingClientRect().width),
      wide: document.querySelector(".doc-wide") ? "on" : "off",
    };
  });
  console.log("      serif:", JSON.stringify(serif), "caps:", JSON.stringify(caps));
  ok("the serif option changes the face", serif.family !== read.family, `${read.family} then ${serif.family}`);
  ok("and gives it more leading", serif.leading > read.leading, `${read.leading} then ${serif.leading}`);
  ok("and keeps its measure in the readable range too",
    serif.chars >= 45 && serif.chars <= 90, `${serif.chars} characters`);
  const wide = await page.evaluate(() => {
    document.getElementById("doc-width-toggle").click();
    return new Promise((res) => setTimeout(() => {
      const el = document.getElementById("doc-preview");
      // Read both *before* toggling back: the object literal below is
      // evaluated after its statements, so putting the click first measured
      // the cap of the state that had just been restored.
      const seen = { w: Math.round(el.getBoundingClientRect().width), cap: getComputedStyle(el).maxWidth };
      document.getElementById("doc-width-toggle").click();
      res(seen);
    }, 400));
  });
  ok("the width toggle still releases the cap for a serif reader",
    wide.cap === "none" && wide.w > serif.width, JSON.stringify(wide));
  await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById("doc-serif").click());
  await page.waitForTimeout(400);

  // What a plain Ctrl+P puts on paper, with no export path involved. The
  // `beforeprint` listener is what the browser raises before it paints the
  // page, and dispatching it is how that path is driven without a printer.
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(600);
  const printed = await page.evaluate(() => {
    const shown = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return "absent";
      const cs = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return cs.display === "none" || cs.visibility === "hidden" || (box.width === 0 && box.height === 0)
        ? "hidden" : `${Math.round(box.width)}x${Math.round(box.height)}`;
    };
    const preview = document.getElementById("doc-preview");
    const cs = preview ? getComputedStyle(preview) : null;
    return {
      tabBar: shown("#tab-bar"),
      sidebar: shown("#doc-sidebar"),
      dock: shown(".doc-dock"),
      toolbar: shown("#doc-toolbar"),
      statusbar: shown("#doc-statusbar"),
      bgArt: shown("#bg-art"),
      crumbs: shown("#doc-crumbs"),
      preview: shown("#doc-preview"),
      ink: cs ? cs.color : null,
      paper: cs ? cs.backgroundColor : null,
      measure: cs ? cs.maxWidth : null,
      leading: cs ? cs.lineHeight : null,
      printingClass: document.body.classList.contains("printing-doc"),
    };
  });
  console.log("      print:", JSON.stringify(printed));
  ok("a plain print is treated as a document print", printed.printingClass);
  for (const [name, value] of Object.entries(printed)) {
    if (["preview", "ink", "paper", "measure", "leading", "printingClass"].includes(name)) continue;
    ok(`${name} is off the page`, value === "hidden" || value === "absent", value);
  }
  ok("the document itself is on it", /^\d+x\d+$/.test(printed.preview), printed.preview);
  ok("the ink is black", printed.ink === "rgb(0, 0, 0)", printed.ink);
  ok("the paper is not painted", /rgba\(0, 0, 0, 0\)|transparent|none/.test(printed.paper), printed.paper);
  //: In `ch`, so the column narrows with a narrower face rather than holding
  //: a pixel width that means a different number of characters per face.
  const printMeasure = await measure(page, "#doc-preview");
  console.log("      printed column:", JSON.stringify(printMeasure));
  ok("the printed column is inside the readable range",
    printMeasure.chars >= 45 && printMeasure.chars <= 90, `${printMeasure.chars} characters, cap ${printed.measure}`);

  // And the page breaks a printed document is told not to make.
  const breaks = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(`#doc-preview ${sel}`);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { after: cs.breakAfter, inside: cs.breakInside };
    };
    const tags = [...document.querySelectorAll("#doc-preview *")]
      .map((el) => el.tagName.toLowerCase());
    //: The renderer shifts the document's own levels down (a `#` comes out as
    //: `h3`), because the page around it already carries the title, so these
    //: are the tags a printed document actually has in it.
    return { h3: pick("h3"), pre: pick("pre"), quote: pick("blockquote"), tags: [...new Set(tags)] };
  });
  console.log("      breaks:", JSON.stringify(breaks));
  ok("a heading stays with the text it names", breaks.h3 && breaks.h3.after === "avoid", JSON.stringify(breaks.h3));
  ok("a code block is not split", breaks.pre && breaks.pre.inside === "avoid", JSON.stringify(breaks.pre));
  ok("a quotation is not split", breaks.quote && breaks.quote.inside === "avoid", JSON.stringify(breaks.quote));

  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await page.waitForTimeout(400);
  const back = await page.evaluate(() => ({
    printing: document.body.classList.contains("printing-doc"),
    chrome: !document.getElementById("tab-bar").classList.contains("hidden"),
  }));
  ok("the app comes back afterwards", !back.printing && back.chrome, JSON.stringify(back));
  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
