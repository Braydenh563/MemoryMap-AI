// The note edit form against INBOX 616's target (the owner: "still needs a
// more modern and professional ui/ux redesign"; then: Attach a link does
// nothing, no padding round the tags, the folded strip is awkward, the
// category select is out of place). Run after noteeditform.js has seeded.
// Prints the numbers and one line per finding; exit 1 on any.
//
//   title      no edge, no band, type at least 18px
//   props      the category chip and the tag chips in one line inside the
//              surface, under the title: no well, no leading '#' icon, the
//              chips one height (22 to 28px at a mouse), padded inside
//   strip      one row, never folded, no drawn separators, no visible words,
//              sticky
//   related    folded by default into one "N suggested links" toggle
//   foot       a word count, Cancel and Save one height (32, 44 at touch)
//   attach     a press opens the bookmark picker dialog
//   edges      how many boxes inside the form draw an edge (reported)
//
//   BASE=http://127.0.0.1:8877 VIEWPORT=390x844 THEME=dark node noteedit616.js
const { boot } = require("./lib.js");

const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const touch = vw < 600;

(async () => {
  const { page, browser, OUT } = await boot({ viewport: { width: vw, height: vh },
    ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  await page.evaluate(async () => {
    const have = await (await api("/bookmarks")).json().catch(() => []);
    if (!have.length) await api("/bookmarks", { method: "POST", body: JSON.stringify({ url: "https://example.org/spaced", title: "Spaced repetition primer" }) });
  });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1200);
  // RELATED=1: no model runs here, so `/related` is empty; stand three other
  // notes in for it so the folded Related line is measured, and opened.
  if (process.env.RELATED) {
    await page.evaluate(async () => {
      for (const n of ["Related probe: spaced repetition", "Related probe: the forgetting curve", "Related probe: interleaving practice"]) {
        if (!allEntries.some((x) => (x.content || "").includes(n))) await api("/entries", { method: "POST", body: JSON.stringify({ content: n }) });
      }
      await loadEntries();
    });
    await page.waitForTimeout(600);
    const others = await page.evaluate(() => allEntries.filter((x) => !(x.content || "").includes("Edit form probe 1")).slice(0, 3));
    await page.route(/\/entries\/\d+\/related/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(others) }));
  }
  await page.evaluate(async () => {
    const e = allEntries.find((x) => (x.content || "").includes("Edit form probe 1"));
    await openNoteEditor(e.id);
  });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const li = document.querySelector("#entry-edit-content")?.closest("li");
    if (!li) return { error: "no edit form" };
    const vis = (e) => e && e.checkVisibility() && e.getBoundingClientRect().width > 1 && e.getBoundingClientRect().height > 1;
    const edged = (e) => { const c = getComputedStyle(e); return ["Top", "Bottom", "Left", "Right"].some((s) => parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== "none" && !/rgba\(\d+, \d+, \d+, 0\)/.test(c[`border${s}Color`])); };
    const h = (e) => Math.round(e.getBoundingClientRect().height * 10) / 10;
    const out = {};
    const title = li.querySelector(".note-edit-title");
    const tc = getComputedStyle(title);
    out.title = { size: parseFloat(tc.fontSize), edge: edged(title), h: h(title) };
    const surface = li.querySelector(".note-edit-surface");
    const meta = li.querySelector(".note-edit-meta");
    out.props = {
      inSurface: !!meta && surface.contains(meta),
      afterTitle: !!meta && meta.previousElementSibling === title,
      well: !!meta && [...meta.querySelectorAll("*")].concat(meta).some((e) => e.matches(".search-field, .tag-field") && edged(e)),
      hashIcon: !!meta && [...meta.querySelectorAll(".ph-hash")].some(vis),
      chipHeights: meta ? [...new Set([...meta.querySelectorAll(".chip")].filter(vis).map(h))] : [],
      chipPadL: meta ? Math.min(...[...meta.querySelectorAll(".chip.tag")].filter(vis).map((c) => parseFloat(getComputedStyle(c).paddingLeft))) : 0,
      category: !!meta && vis(meta.querySelector(".note-edit-category")),
      lines: meta ? new Set([...meta.children].filter(vis).map((c) => Math.round(c.getBoundingClientRect().top / 8))).size : 0,
      h: meta ? h(meta) : 0,
    };
    const strip = li.querySelector(".note-edit-toolbar");
    const shown = [...strip.children].filter(vis);
    out.strip = {
      collapsed: strip.classList.contains("is-collapsed"),
      rows: new Set(shown.filter((c) => !c.matches(".doc-toolbar-sep")).map((c) => Math.round((c.getBoundingClientRect().top + c.getBoundingClientRect().bottom) / 24))).size,
      seps: [...strip.querySelectorAll(".doc-toolbar-sep")].filter((s) => vis(s) && getComputedStyle(s).backgroundColor !== "rgba(0, 0, 0, 0)").length,
      words: [...strip.querySelectorAll(".toolbar-word, .doc-toolbar-collapsed-name")].filter((w) => vis(w) && w.getBoundingClientRect().width > 2).map((w) => w.textContent.trim()),
      glyphs: [...strip.querySelectorAll("button > strong, button > em, button > s")].filter(vis).length,
      tools: shown.filter((c) => c.matches("button, select, details, .select-shell, .select-opener")).length,
      sticky: getComputedStyle(strip).position,
      bg: getComputedStyle(strip).backgroundColor,
      h: h(strip),
    };
    const related = li.querySelector(".note-edit-related, .entry-related-live");
    const toggle = li.querySelector(".note-edit-related-toggle");
    out.related = {
      rowsShown: [...li.querySelectorAll(".entry-related-row")].filter(vis).length,
      toggle: toggle ? toggle.textContent.trim() : null,
      text: related ? related.textContent.trim().slice(0, 60) : null,
    };
    const foot = li.querySelector(".note-edit-foot");
    const btns = [...foot.querySelectorAll(".note-edit-actions button")].filter(vis);
    out.foot = {
      count: (foot.querySelector(".char-count, .note-edit-count")?.textContent || "").trim(),
      heights: [...new Set(btns.map(h))],
      rows: new Set([...foot.querySelectorAll("button, .note-edit-count")].filter(vis).map((b) => Math.round((b.getBoundingClientRect().top + b.getBoundingClientRect().bottom) / 24))).size,
      attach: !!foot.querySelector("button[aria-label='Attach a link']"),
    };
    out.edges = [...li.querySelectorAll("*")].filter((e) => vis(e) && edged(e) && !e.closest(".doc-toolbar")).map((e) => e.className.toString().split(" ")[0] || e.tagName).slice(0, 20);
    out.formH = h(li);
    out.sw = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return out;
  });
  if (m.error) { console.log(m.error); await browser.close(); process.exit(1); }
  const f = [];
  const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  if (m.title.edge) f.push("title has an edge");
  if (m.title.size < 18) f.push(`title type ${m.title.size}px under 18`);
  if (!m.props.inSurface || !m.props.afterTitle) f.push("properties line is not under the title in the surface");
  if (m.props.well) f.push("tags sit in a bordered well");
  if (m.props.hashIcon) f.push("a leading # icon beside #-chips");
  if (!m.props.category) f.push("category chip not in the properties line");
  if (m.props.chipHeights.length > 1) f.push(`chips at ${m.props.chipHeights.join("/")}px`);
  if (!coarse && m.props.chipHeights.some((x) => x < 22 || x > 28)) f.push(`chip height ${m.props.chipHeights} outside 22..28`);
  if (m.props.chipPadL < 6) f.push(`tag chip inner padding ${m.props.chipPadL}px`);
  if (!touch && m.props.lines > 1) f.push(`properties on ${m.props.lines} lines at ${vw}`);
  if (m.strip.collapsed) f.push("strip folded");
  if (m.strip.rows > 1) f.push(`strip on ${m.strip.rows} rows`);
  if (m.strip.seps) f.push(`${m.strip.seps} drawn separators`);
  if (m.strip.words.length) f.push(`strip words ${JSON.stringify(m.strip.words)}`);
  if (m.strip.glyphs) f.push(`${m.strip.glyphs} typed-letter buttons (B I S)`);
  if (m.strip.sticky !== "sticky") f.push(`strip ${m.strip.sticky}, not sticky`);
  if (m.related.rowsShown) f.push(`${m.related.rowsShown} related rows open by default`);
  // A note with nothing similar says so in one line (no model, no suggestions).
  if (!m.related.toggle && !/^(No related notes yet|All related notes are linked)\./.test(m.related.text || "")) f.push(`no related toggle (${m.related.text})`);
  if (!touch && !/\d+ words?/.test(m.foot.count)) f.push("no word count in the foot");
  if (m.foot.rows > 1) f.push(`foot on ${m.foot.rows} rows`);
  if (m.foot.heights.length !== 1 || m.foot.heights[0] !== (coarse ? 44 : 32)) f.push(`foot buttons ${m.foot.heights.join("/")}`);
  if (m.sw > 0) f.push(`page scrolls sideways ${m.sw}px`);
  // The category chip's menu opens under the chip, its own left edge.
  await page.locator(".note-edit-category").click();
  await page.waitForTimeout(400);
  m.categoryMenu = await page.evaluate(() => {
    const chipBox = document.querySelector(".note-edit-category").getBoundingClientRect();
    const menu = [...document.querySelectorAll(".pointer-menu-host [role=menu], .pointer-menu-host .kebab-menu, .pointer-menu-host > *")].find((e) => e.checkVisibility() && e.getBoundingClientRect().height > 10);
    if (!menu) return null;
    const r = menu.getBoundingClientRect();
    return { dx: Math.round(r.left - chipBox.left), dy: Math.round(r.top - chipBox.bottom), w: Math.round(r.width) };
  });
  if (!m.categoryMenu) f.push("category menu did not open");
  else if (Math.abs(m.categoryMenu.dx) > 12 || m.categoryMenu.dy < 0 || m.categoryMenu.dy > 12) f.push(`category menu away from its chip ${JSON.stringify(m.categoryMenu)}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  // Related, opened: compact rows in one wrap, none taller than a chip row.
  if (await page.locator(".note-edit-related-toggle").count()) {
    await page.locator(".note-edit-related-toggle").click();
    await page.waitForTimeout(200);
    m.relatedOpen = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".note-edit-related-list .entry-related-row")].filter((r) => r.checkVisibility());
      const t = document.querySelector(".note-edit-related-toggle");
      return { rows: rows.length, maxH: Math.max(0, ...rows.map((r) => Math.round(r.getBoundingClientRect().height))), expanded: t.getAttribute("aria-expanded"), label: t.textContent.trim() };
    });
    if (!m.relatedOpen.rows || m.relatedOpen.expanded !== "true") f.push(`related did not open ${JSON.stringify(m.relatedOpen)}`);
    if (m.relatedOpen.maxH > (coarse ? 48 : 34)) f.push(`related row ${m.relatedOpen.maxH}px tall`);
  }
  // Attach a link, pressed.
  const attach = page.locator(".note-edit-foot button[aria-label='Attach a link']");
  if (await attach.count()) {
    await attach.click();
    await page.waitForTimeout(800);
    const opened = await page.evaluate(() => {
      const card = [...document.querySelectorAll(".entry-pick-card, .bookmark-attach-picker")].find((e) => e.checkVisibility());
      return card ? card.className : null;
    });
    if (!opened) f.push("Attach a link opened nothing visible");
    m.attachOpened = opened;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } else f.push("no Attach a link button");
  if (errs.length) f.push(`page errors ${JSON.stringify(errs)}`);
  console.log(JSON.stringify({ viewport: `${vw}x${vh}`, theme: process.env.THEME || "light", ...m }));
  console.log(`noteedit616 ${vw} ${process.env.THEME || "light"}: ${f.length} findings${f.length ? "\n  " + f.join("\n  ") : ""}`);
  if (process.env.SHOT) {
    const clip = await page.evaluate(() => { const li = document.querySelector("#entry-edit-content")?.closest("li"); if (!li) return null; li.scrollIntoView({ block: "start" }); const r = li.getBoundingClientRect(); return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8), width: Math.min(innerWidth, r.width + 16), height: Math.min(innerHeight - Math.max(0, r.top - 8), r.height + 16) }; });
    if (clip) await page.screenshot({ path: `${OUT}/noteedit616-${vw}-${process.env.THEME || "light"}.png`, clip });
  }
  await browser.close();
  process.exit(f.length ? 1 : 0);
})();
