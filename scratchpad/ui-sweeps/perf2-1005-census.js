// perf2-1005 (audit FE-15): the design census as a sweep that fails. Every
// visible button on the eight tabs, the shell and every Settings pane is
// given a role (DESIGN.md's role table: icon-only, ghost, filled, segment,
// tab, chip, menu item, link, plain; "@dock" when it sits in a dock) and its
// height measured. The heights each role takes are held in
// perf2-1005-census-baseline.json; a role that gains a height it did not
// have is a finding, and the sweep exits 1 naming the control.
//   BASE=http://127.0.0.1:8859 [W=1440] [THEME=dark] node perf2-1005-census.js
//   UPDATE=1 ... rewrites the baseline (only after deciding the new height is right).
const fs = require("fs");
const path = require("path");
const { boot } = require("./lib.js");
const W = Number(process.env.W || 1440);
const H = Number(process.env.H || 900);
const TABS = ["dashboard", "notes", "chat", "graph", "library", "timeline", "reminders", "documents"];
const BASELINE = path.join(__dirname, `perf2-1005-census-baseline-${W}.json`);

const COLLECT = (rootSel) => {
  const root = document.querySelector(rootSel);
  if (!root) return {};
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity) > 0.05 && el.closest(".hidden") === null;
  };
  const desc = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    const c = [...el.classList].slice(0, 3).join(".");
    if (c) s += "." + c;
    return s;
  };
  const out = {};
  const sel = "button, [role=button], a.btn, .btn, input[type=button], input[type=submit]";
  for (const b of root.querySelectorAll(sel)) {
    if (!vis(b)) continue;
    const cs = getComputedStyle(b);
    const text = (b.innerText || "").trim();
    let role;
    if (b.getAttribute("role") === "tab" || b.closest("[role=tablist]")) role = "tab";
    else if (b.closest(".seg, .segmented-control")) role = "segment";
    else if (b.closest(".menu, [role=menu], .kebab-menu, .dropdown-menu")) role = "menu-item";
    else if (!text) role = "icon-only";
    else if (b.classList.contains("chip") || b.closest(".chip-row")) role = "chip";
    else if (b.classList.contains("linklike")) role = "link";
    else {
      const bg = cs.backgroundColor;
      const clear = bg === "rgba(0, 0, 0, 0)" || bg === "transparent";
      role = b.classList.contains("ghost") ? "ghost" : clear ? "plain" : "filled";
    }
    const key = role + (b.closest(".dock, [data-dock-name]") ? "@dock" : "");
    const h = String(Math.round(b.getBoundingClientRect().height * 2) / 2);
    const slot = (out[key] ||= {});
    (slot[h] ||= []).length < 3 && slot[h].push(desc(b) + (text ? ` "${text.slice(0, 18)}"` : ""));
  }
  return out;
};

function merge(into, view, part) {
  for (const [role, heights] of Object.entries(part)) {
    for (const [h, examples] of Object.entries(heights)) {
      const slot = ((into[role] ||= {})[h] ||= []);
      for (const ex of examples) if (slot.length < 3) slot.push(`${view}: ${ex}`);
    }
  }
}

(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: H } });
  const seen = {};
  for (const t of TABS) {
    await page.evaluate((t) => switchTab(t), t);
    await page.waitForTimeout(t === "library" || t === "graph" ? 3500 : 1800);
    merge(seen, `tab:${t}`, await page.evaluate(COLLECT, "#tab-" + t));
  }
  merge(seen, "shell", await page.evaluate(COLLECT, "header, .app-header, #app-header"));
  await page.evaluate(() => openSettingsModal("models"));
  await page.waitForTimeout(2000);
  const sections = await page.evaluate(() => [...document.querySelectorAll("#settings-nav button[data-section]")].map((b) => b.dataset.section));
  for (const s of sections) {
    await page.evaluate((s) => showSettingsSection(s), s);
    await page.waitForTimeout(700);
    merge(seen, `settings:${s}`, await page.evaluate(COLLECT, "#settings-" + s));
  }
  await browser.close();
  const summary = Object.fromEntries(Object.entries(seen).map(([role, hs]) => [role, Object.keys(hs).map(Number).sort((a, b) => a - b)]));
  if (process.env.UPDATE || !fs.existsSync(BASELINE)) {
    fs.writeFileSync(BASELINE, JSON.stringify(summary, null, 1) + "\n");
    console.log("baseline written", BASELINE, JSON.stringify(summary));
    return;
  }
  const base = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  const gained = [];
  for (const [role, hs] of Object.entries(summary)) {
    for (const h of hs) {
      if (!(base[role] || []).includes(h)) gained.push(`${role} gained ${h}px: ${(seen[role][String(h)] || []).join("; ")}`);
    }
  }
  const lost = [];
  for (const [role, hs] of Object.entries(base)) {
    for (const h of hs) if (!(summary[role] || []).includes(h)) lost.push(`${role} no longer ${h}px`);
  }
  console.log(JSON.stringify({ roles: summary, gained, lost }, null, 1));
  process.exit(gained.length ? 1 : 0);
})();
