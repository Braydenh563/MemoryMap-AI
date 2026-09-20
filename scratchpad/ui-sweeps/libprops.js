// Probe: the Library's Documents sub-tab filters by a frontmatter property
// (DOCUMENTS_PLAN Phase 3 item 4's second clause). The properties come down on
// the row (core/docmeta.py) and the narrowing is client-side, so what is
// measured here is: the control only offers pairs some document has, the
// counts are right, the list narrows, the empty state says which half of the
// narrowing emptied it, and the control hides when nothing has a property.
//
// Needs a fresh data dir: it counts documents, so a second run against the
// same server counts the first run's as well.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };

const DOCS = [
  ["Draft one", "---\nstatus: draft\ntags: [alpha, beta]\n---\n\n# One\n"],
  ["Draft two", "---\nstatus: draft\n---\n\n# Two\n"],
  ["Done three", "---\nstatus: done\ntags: [alpha]\n---\n\n# Three\n"],
  ["Plain four", "# Four, no properties at all\n"],
];

const rows = (page) => page.evaluate(() =>
  [...document.querySelectorAll("#library-docs-list > li")].length);

(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  // Before anything has a property: the control is not drawn.
  await page.evaluate(async () => {
    await api("/documents", { method: "POST", body: JSON.stringify({ title: "Bare", content: "# Bare\n" }) });
    switchTab("library");
  });
  await page.waitForTimeout(1200);
  await page.click('[data-target="library-view-docs"]').catch(() => {});
  await page.waitForTimeout(1500);
  let state = await page.evaluate(() => {
    const el = document.getElementById("library-docs-property");
    if (!el) return null;
    const shell = el.closest(".select-shell") || el;
    return {
      hidden: el.classList.contains("hidden"),
      //: The opener is what a reader sees, so it is what "hidden" has to mean.
      shellHidden: shell.classList.contains("hidden"),
      shellWidth: Math.round(shell.getBoundingClientRect().width),
      options: el.options.length,
    };
  });
  ok("with no properties anywhere the control is hidden",
    state && state.hidden && state.shellHidden, JSON.stringify(state));

  await page.evaluate(async (docs) => {
    for (const [title, content] of docs) {
      await api("/documents", { method: "POST", body: JSON.stringify({ title, content }) });
    }
    await renderLibraryDocuments();
  }, DOCS);
  await page.waitForTimeout(1500);

  const offered = await page.evaluate(() => {
    const el = document.getElementById("library-docs-property");
    return {
      hidden: el.classList.contains("hidden"),
      // What the reader actually sees: `enhanceSelect` builds its menu from
      // `select.options`, so that is the list under test.
      options: [...el.options].map((o) => o.textContent),
      shellHidden: (el.closest(".select-shell") || el).classList.contains("hidden"),
      // The native select is hidden behind the app's own opener button
      // (`.select-shell > .select-opener`, app.js), so the box worth measuring
      // is the shell's, not the select's own 1px stand-in.
      classes: el.className,
      opener: (() => {
        const shell = el.closest(".select-shell");
        const box = (shell || el).getBoundingClientRect();
        const label = shell ? shell.querySelector(".select-opener") : null;
        return {
          w: Math.round(box.width),
          h: Math.round(box.height),
          text: label ? label.textContent.trim() : null,
        };
      })(),
    };
  });
  console.log("      offered:", JSON.stringify(offered));
  ok("the control is drawn now", !offered.hidden && offered.opener.w > 60,
    `${offered.opener.w}x${offered.opener.h}, reading “${offered.opener.text}”`);
  ok("every option names its key and its count",
    offered.options.join("|") === "Any property|status: done (1)|status: draft (2)|tags: alpha (2)|tags: beta (1)",
    offered.options.join("|"));

  const before = await rows(page);
  await page.evaluate(() => {
    const el = document.getElementById("library-docs-property");
    el.value = [...el.options].find((o) => o.textContent === "status: draft (2)").value;
    el.dispatchEvent(new Event("change"));
  });
  await page.waitForTimeout(1200);
  const after = await rows(page);
  ok("choosing a value narrows the list", after === 2, `${before} rows before, ${after} after`);
  const titles = await page.evaluate(() =>
    [...document.querySelectorAll("#library-docs-list > li")].map((li) => li.textContent.slice(0, 20)));
  ok("and the two it keeps are the drafts", titles.every((t) => /Draft/.test(t)), JSON.stringify(titles));

  // A property and a search that cannot both be true: the empty state says so.
  await page.fill("#library-docs-search", "three");
  await page.waitForTimeout(1600);
  const noMatch = await page.evaluate(() => {
    const el = document.getElementById("library-docs-no-match");
    return { hidden: el.classList.contains("hidden"), text: el.textContent };
  });
  ok("the empty state names both narrowings",
    !noMatch.hidden && /three/.test(noMatch.text) && /status/.test(noMatch.text), JSON.stringify(noMatch));

  await page.fill("#library-docs-search", "");
  await page.waitForTimeout(1600);
  const restored = await rows(page);
  ok("clearing the search leaves the property filter on", restored === 2, `${restored} rows`);

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
