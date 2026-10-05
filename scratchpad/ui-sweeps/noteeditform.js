// The note edit form as one composition (INBOX 606, the owner: "something
// about the design, ui/ux of the note edit form still feels off..."). Seeds
// three notes on one subject (so Related has rows), opens the first for
// editing in the Notes list and measures, top to bottom: the title and the
// body (one surface or two boxes), the formatting strip (a label word? the
// Source toggle's border and fill), tags and category (field kinds), the foot
// (button order, heights, alignment to the form's right edge), the Related
// rows (boxed buttons) and where "Attach a link" sits. SHOT=1 writes a
// picture of the form.
//   BASE=http://127.0.0.1:8798 VIEWPORT=390x844 THEME=dark node noteeditform.js
const { boot } = require("./lib.js");

const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const theme = process.env.THEME || "light";

(async () => {
  const { page, browser, OUT } = await boot({ viewport: { width: vw, height: vh } });
  await page.evaluate(async () => {
    const have = await (await api("/entries?limit=200")).json();
    const list = Array.isArray(have) ? have : have.entries || have.items || [];
    if (list.some((e) => (e.content || "").includes("Edit form probe"))) return;
    const body = (n) => `# Edit form probe ${n}\n\nSpaced repetition helps memory: review cards at growing intervals, recall before re-reading, and keep sessions short.`;
    for (let i = 1; i <= 3; i++) {
      await api("/entries", { method: "POST", body: JSON.stringify({ content: body(i), tags: ["memory", "study"], category: "Core Concepts" }) });
    }
  });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1200);
  const opened = await page.evaluate(async () => {
    const e = allEntries.find((x) => (x.content || "").includes("Edit form probe 1"));
    if (!e) return false;
    await openNoteEditor(e.id);
    return true;
  }).catch((err) => String(err));
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const li = document.querySelector("#entry-edit-content")?.closest("li");
    if (!li) return { error: "no edit form" };
    const vis = (e) => e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    const box = (e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height) }; };
    const edge = (e) => { const c = getComputedStyle(e); return c.borderTopWidth === "0px" || c.borderTopStyle === "none" || c.borderTopColor === "rgba(0, 0, 0, 0)" ? "none" : `${c.borderTopWidth} ${c.borderTopColor}`; };
    const lr = li.getBoundingClientRect();
    const out = { form: box(li) };
    const title = li.querySelector(".note-edit-title");
    const body = li.querySelector(".cm-editor") || li.querySelector("#entry-edit-content");
    const surface = li.querySelector(".note-edit-surface");
    out.title = title ? { ...box(title), edge: edge(title), bg: getComputedStyle(title).backgroundColor } : null;
    out.body = body ? { ...box(body), edge: edge(body) } : null;
    out.surface = surface ? { ...box(surface), edge: edge(surface) } : null;
    const strip = li.querySelector(".note-edit-toolbar");
    if (strip) {
      const words = [...strip.querySelectorAll(".doc-toolbar-label, .toolbar-label, .md-toolbar-label")].filter(vis).map((e) => e.textContent.trim());
      const src = strip.querySelector("[data-note-preview]");
      out.strip = { ...box(strip), labelWords: words, sourceEdge: src ? edge(src) : null, sourceBg: src ? getComputedStyle(src).backgroundColor : null, sourceH: src ? Math.round(src.getBoundingClientRect().height) : null };
    }
    const tags = li.querySelector(".note-edit-tags");
    out.tags = tags ? { kind: tags.classList.contains("tag-field") ? "chips" : tags.tagName.toLowerCase(), chips: li.querySelectorAll(".tag-field .tag-chip").length, h: Math.round(tags.getBoundingClientRect().height) } : null;
    const cat = li.querySelector(".note-edit-category, .note-edit-meta .select-shell, .note-edit-meta select");
    out.category = cat ? { kind: cat.classList.contains("note-edit-category") ? "chip" : "select", h: Math.round(cat.getBoundingClientRect().height) } : null;
    const actions = li.querySelector(".note-edit-actions");
    if (actions) {
      const btns = [...actions.querySelectorAll("button")].filter(vis);
      out.foot = {
        order: btns.map((b) => (/\bghost\b|icon-only/.test(b.className) ? "g" : "F") + ":" + (b.getAttribute("aria-label") || b.textContent.trim()).slice(0, 14)).join(" "),
        heights: [...new Set(btns.map((b) => Math.round(b.getBoundingClientRect().height)))].join("/"),
        rightGap: btns.length ? Math.round(lr.right - parseFloat(getComputedStyle(li).paddingRight) - btns[btns.length - 1].getBoundingClientRect().right) : null,
        top: Math.round(actions.getBoundingClientRect().top),
      };
    }
    const rel = [...li.querySelectorAll(".entry-related-row")].filter(vis);
    out.related = {
      rows: rel.length,
      boxedButtons: rel.flatMap((r) => [...r.querySelectorAll("button")]).filter((b) => edge(b) !== "none").length,
      label: [...li.querySelectorAll(".entry-related-live > span")].map((s) => s.textContent.trim()).filter(Boolean)[0] || "",
      h: rel.length ? Math.round(rel[rel.length - 1].getBoundingClientRect().bottom - rel[0].getBoundingClientRect().top) : 0,
    };
    const attach = [...li.querySelectorAll("button")].find((b) => /attach a link/i.test(b.textContent + " " + (b.getAttribute("aria-label") || "")));
    out.attach = attach ? { inFoot: !!attach.closest(".note-edit-foot"), edge: edge(attach), h: Math.round(attach.getBoundingClientRect().height) } : null;
    out.formH = Math.round(li.getBoundingClientRect().height);
    return out;
  });
  console.log(JSON.stringify({ viewport: `${vw}x${vh}`, theme, opened, ...m }, null, 1));
  if (process.env.SHOT) {
    const clip = await page.evaluate(() => { const li = document.querySelector("#entry-edit-content")?.closest("li"); if (!li) return null; li.scrollIntoView({ block: "start" }); const r = li.getBoundingClientRect(); return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8), width: Math.min(innerWidth, r.width + 16), height: Math.min(innerHeight - Math.max(0, r.top - 8), r.height + 16) }; });
    if (clip) await page.screenshot({ path: `${OUT}/noteedit-${vw}-${theme}.png`, clip });
  }
  await browser.close();
})();
