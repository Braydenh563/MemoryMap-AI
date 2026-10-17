// INBOX 904 B24: the "An empty board" card on a new board. Measures its box,
// its rows and their alignment at the given VIEWPORT (default 1440x900).
// Usage: BASE=http://127.0.0.1:8783 [VIEWPORT=390x844] [SHOT=1] node emptyboard904.js
const { boot, openBoardsTab, waitForBoardOpen } = require("./lib.js");
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page, OUT } = await boot({ viewport: { width: vw, height: vh } });
  await page.evaluate(() => { try { localStorage.removeItem("wb-empty-hint-off"); } catch (e) {} });
  await openBoardsTab(page);
  await page.evaluate(() => wbNewUntitledBoard("board"));
  await waitForBoardOpen(page, 0);
  await page.waitForTimeout(1500);
  const pop = () => page.evaluate(() => { const e = document.querySelector(".selection-popup"); const b = e?.getBoundingClientRect(); return e ? { hidden: e.classList.contains("hidden"), box: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], field: !!document.getElementById("wb-name-field"), active: document.activeElement?.id } : null; });
  console.log("selection popup before Escape", JSON.stringify(await pop()));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  console.log("selection popup after Escape", JSON.stringify(await pop()));
  const m = await page.evaluate(() => {
    const r = (e) => { const b = e?.getBoundingClientRect(); return b ? { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) } : null; };
    const hint = document.getElementById("wb-empty-hint");
    const inner = hint?.querySelector(".wb-empty-hint-inner");
    const canvas = document.getElementById("whiteboard-container") || document.getElementById("whiteboard");
    const q = (s) => inner?.querySelector(s);
    const cs = inner && getComputedStyle(inner);
    return {
      visible: !!inner && inner.checkVisibility(),
      canvas: r(canvas), inner: r(inner), pad: cs && cs.padding, gap: cs && cs.gap, radius: cs && cs.borderRadius,
      head: r(q(".wb-help-head")), title: r(q(".wb-empty-hint-title")), close: r(q("#wb-empty-hint-close")),
      lead: r(q(".wb-help-lead")), leadLines: q(".wb-help-lead") ? Math.round(q(".wb-help-lead").getBoundingClientRect().height / parseFloat(getComputedStyle(q(".wb-help-lead")).lineHeight)) : 0,
      actions: r(q("#wb-empty-hint-actions")), keys: r(q("#wb-empty-hint-keys")),
      foot: r(q(".wb-help-foot")), dismiss: r(q("#wb-empty-hint-dismiss")),
      innerScroll: inner ? [inner.scrollWidth, inner.clientWidth, inner.scrollHeight, inner.clientHeight] : null,
      toolbar: r(document.querySelector("#wb-toolbar, .wb-toolbar")),
    };
  });
  const over = await page.evaluate(() => {
    const out = [];
    for (const [x, y] of [[745, 495], [600, 467], [800, 513]]) {
      const e = document.elementFromPoint(x, y);
      const b = e?.getBoundingClientRect();
      out.push({ at: [x, y], el: e ? `${e.tagName}#${e.id}.${String(e.className).slice(0, 60)}` : null, box: b ? [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] : null });
    }
    return out;
  });
  console.log(JSON.stringify(over));
  const pill = await page.evaluate(() => {
    let e = document.elementFromPoint(745, 495);
    const chain = [];
    for (; e && e !== document.body; e = e.parentElement) {
      const c = getComputedStyle(e);
      chain.push(`${e.tagName}#${e.id}.${String(e.className).slice(0, 50)} pos=${c.position} z=${c.zIndex} hidden=${e.hidden || e.classList.contains('hidden')} vis=${c.visibility} op=${c.opacity}`);
    }
    return chain;
  });
  console.log(JSON.stringify(pill, null, 1));
  console.log(JSON.stringify(m, null, 1));
  if (process.env.SHOT) await page.screenshot({ path: `${OUT}/emptyboard904-${vw}.png` });
  ok("the card is on screen", m.visible);
  const narrow = vw < 600;
  ok("no scrollbar inside the card", m.innerScroll[0] <= m.innerScroll[1] + 1 && m.innerScroll[2] <= m.innerScroll[3] + 1, JSON.stringify(m.innerScroll));
  ok("both buttons inside the card", m.keys.l >= m.inner.l && m.dismiss.l + m.dismiss.w <= m.inner.l + m.inner.w);
  ok("one actions row: the two buttons share a top (wide windows)", narrow || m.keys.t === m.dismiss.t, `${m.keys.t} and ${m.dismiss.t}`);
  ok("no second foot row, card 140px or less (wide windows)", narrow || (m.foot === null && m.inner.h <= 140), `${m.inner.h}px`);
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
