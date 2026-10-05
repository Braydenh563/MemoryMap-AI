// The top bar and the status bar against INBOX 618's decision (the owner:
// "do the top bar and bottom bar need a more modern and professional ui/ux
// redesign or adjustments at all or are they fine??"). Prints the numbers and
// one line per finding; exit 1 on any. SHOT=1 writes both bars.
//
//   top     the space picker a ghost the tab pills' height, no edge; the
//           active tab no bolder than the rest; the logo tile at most 28px;
//           Quit (power) quieter than the other header icons
//   bottom  the counts quiet (muted, no edge, no fill); Agent, Guide and
//           Find icon-only with a title and an aria-label; Commands the one
//           worded doorway; the AI mark explained (a title); back, forward,
//           history, undo and redo one group, no divider inside it, a step of
//           at most 16px between the pairs
//
//   BASE=http://127.0.0.1:8794 VIEWPORT=390x844 THEME=dark node bars618.js
const { boot } = require("./lib.js");
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const touch = vw < 600;
(async () => {
  const { page, browser, OUT } = await boot({ viewport: { width: vw, height: vh }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => {
    const vis = (e) => e && e.checkVisibility() && e.getBoundingClientRect().width > 1;
    const r = (e) => e.getBoundingClientRect();
    const cs = (e) => getComputedStyle(e);
    const edged = (e) => ["Top", "Bottom", "Left", "Right"].some((s) => parseFloat(cs(e)[`border${s}Width`]) > 0 && cs(e)[`border${s}Style`] !== "none" && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(cs(e)[`border${s}Color`]));
    const filled = (e) => !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(cs(e).backgroundColor);
    const out = { top: {}, bottom: {} };
    const logo = document.getElementById("brand-logo");
    out.top.logo = vis(logo) ? Math.round(r(logo).height) : 0;
    const sp = document.getElementById("space-switcher-btn");
    const tab = [...document.querySelectorAll("#tab-bar [role=tab]")].find((t) => vis(t) && t.getAttribute("aria-selected") !== "true");
    const active = document.querySelector("#tab-bar [role=tab][aria-selected=true]");
    out.top.space = vis(sp) ? { h: Math.round(r(sp).height), edge: edged(sp), radius: cs(sp).borderRadius, weight: cs(sp.querySelector(".space-switcher-name") || sp).fontWeight } : null;
    out.top.tab = tab ? { h: Math.round(r(tab).height), radius: cs(tab).borderRadius, weight: cs(tab.querySelector(".tab-label") || tab).fontWeight } : null;
    out.top.active = active ? { weight: cs(active.querySelector(".tab-label") || active).fontWeight, stroke: cs(active.querySelector(".tab-label") || active).webkitTextStrokeWidth } : null;
    const quit = document.getElementById("quit-btn");
    const gear = document.getElementById("settings-btn");
    out.top.quit = vis(quit) ? { color: cs(quit).color, opacity: cs(quit).opacity } : null;
    out.top.gear = vis(gear) ? { color: cs(gear).color, opacity: cs(gear).opacity } : null;
    out.top.h = Math.round(r(document.getElementById("top-bar")).height);
    const bar = document.getElementById("status-bar");
    out.bottom.h = Math.round(r(bar).height);
    const count = (id) => { const e = document.getElementById(id); if (!vis(e)) return null; return { edge: edged(e), fill: filled(e), color: cs(e).color, text: e.textContent.trim() }; };
    out.bottom.notes = count("status-notes");
    out.bottom.reminders = count("status-reminders");
    out.bottom.muted = cs(document.body).getPropertyValue("--muted").trim();
    const door = (id) => { const e = document.getElementById(id); if (!vis(e)) return null; const words = [...e.childNodes].map((n) => n.nodeType === 3 ? n.textContent : (n.matches && !n.matches(".ph, .visually-hidden, kbd, .kbd") && n.checkVisibility() && n.getBoundingClientRect().width > 2 ? n.textContent : "")).join("").trim(); return { words, title: e.title || "", label: e.getAttribute("aria-label") || "", w: Math.round(r(e).width) }; };
    out.bottom.command = door("status-command");
    out.bottom.agent = door("status-agent");
    out.bottom.guide = door("status-guide");
    out.bottom.find = door("status-find");
    const mark = document.getElementById("ai-mark");
    out.bottom.mark = vis(mark) ? { title: mark.title || mark.getAttribute("aria-label") || "", w: Math.round(r(mark).width) } : null;
    const ctl = ["status-back", "status-forward", "status-nav-history", "status-undo", "status-redo"].map((id) => document.getElementById(id)).filter(vis);
    const gaps = [];
    for (let i = 1; i < ctl.length; i++) gaps.push(Math.round(r(ctl[i]).left - r(ctl[i - 1]).right));
    const nav = document.querySelector(".status-nav");
    const divider = nav && (parseFloat(cs(nav).borderRightWidth) > 0 || parseFloat(cs(nav).borderLeftWidth) > 0 || cs(nav, "::after"));
    out.bottom.control = { n: ctl.length, gaps, navEdge: nav ? (parseFloat(cs(nav).borderRightWidth) + parseFloat(cs(nav).borderLeftWidth)) : 0, after: nav ? getComputedStyle(nav, "::after").content + "/" + getComputedStyle(nav, "::after").width : "" };
    out.bottom.items = [...bar.querySelectorAll("button, .chip, .emblem")].filter(vis).length;
    out.sw = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return out;
  });
  const f = [];
  const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  if (m.top.logo > 28) f.push(`logo ${m.top.logo}px`);
  if (m.top.space && m.top.space.edge) f.push("space picker has an edge");
  // A phone's tabs are the bottom tab bar, and its controls the 44px floor.
  if (!touch && m.top.space && m.top.tab && Math.abs(m.top.space.h - m.top.tab.h) > 1) f.push(`space picker ${m.top.space.h}px beside tabs ${m.top.tab.h}px`);
  if (m.top.active && m.top.tab && +m.top.active.weight > +m.top.tab.weight) f.push(`active tab weight ${m.top.active.weight} over ${m.top.tab.weight}`);
  if (m.top.active && parseFloat(m.top.active.stroke) > 0) f.push(`active tab stroked ${m.top.active.stroke}`);
  if (m.top.quit && m.top.gear && m.top.quit.color === m.top.gear.color && m.top.quit.opacity === m.top.gear.opacity) f.push("Quit as loud as Settings");
  for (const k of ["notes", "reminders"]) { const c = m.bottom[k]; if (c && (c.edge || c.fill)) f.push(`${k} count boxed`); }
  for (const k of ["agent", "guide", "find"]) { const d = m.bottom[k]; if (!d) continue; if (d.words) f.push(`${k} worded "${d.words}"`); if (!d.title || !d.label) f.push(`${k} without title/label`); }
  if (!touch && m.bottom.command && !m.bottom.command.words) f.push("Commands has no word");
  if (m.bottom.mark && !m.bottom.mark.title) f.push("AI mark unexplained");
  // One group: no drawn divider, and the step between the pairs at most 16.
  if (m.bottom.control.navEdge > 0 || m.bottom.control.gaps.some((g) => g > 16)) f.push(`control group divided: edge ${m.bottom.control.navEdge}, gaps ${m.bottom.control.gaps}`);
  if (m.sw > 0) f.push(`page scrolls sideways ${m.sw}px`);
  console.log(JSON.stringify({ viewport: `${vw}x${vh}`, theme: process.env.THEME || "light", ...m }));
  console.log(`bars618 ${vw} ${process.env.THEME || "light"}: ${f.length} findings${f.length ? "\n  " + f.join("\n  ") : ""}`);
  if (process.env.SHOT) {
    await page.locator("#top-bar").screenshot({ path: `${OUT}/bars618-top-${vw}-${process.env.THEME || "light"}.png` });
    if (await page.locator("#status-bar").isVisible()) await page.locator("#status-bar").screenshot({ path: `${OUT}/bars618-bottom-${vw}-${process.env.THEME || "light"}.png` });
  }
  await browser.close();
  process.exit(f.length ? 1 : 0);
})();
