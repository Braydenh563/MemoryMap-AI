// The live view's task box: drawn at the text's size, pressed at the floor's
// (documents.js `DocTaskWidget`, 09-editor.css `.cm-md-task-hit`). At 1440 and
// 820 (mouse) and 390x844 (touch): the box's size, the task line against a
// plain list line, the press strip's width, that two task lines' strips do not
// overlap, and that a press on the box and a press on the strip beside it
// each toggle the source once. THEME=dark for dark; shots to $SCRATCH/shots.
//   node scratchpad/ui-sweeps/doctaskbox.js
const { boot } = require("./lib.js");
const THEME = process.env.THEME || "light";
const SHOTS = (process.env.SCRATCH || ".") + "/shots";

(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + JSON.stringify(detail) : ""}`);
  };
  for (const [W, H, touch] of [[1440, 900, false], [820, 1000, false], [390, 844, true]]) {
    const { page, browser } = await boot({ viewport: { width: W, height: H }, hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.evaluate(async () => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" };
      const d = await (await fetch("/documents", { method: "POST", headers, body: JSON.stringify({ title: "Tasks", content: "# Tasks\n\n- [ ] first task\n- [x] second task\n- plain item\n\nAfter the list.\n" }) })).json();
      switchTab("documents"); await new Promise((r) => setTimeout(r, 800));
      await openDocument(d.id); await new Promise((r) => setTimeout(r, 2000));
      setDocView("live"); await new Promise((r) => setTimeout(r, 800));
    });
    const m = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll("#doc-editor input.cm-md-task")];
      const lineOf = (el) => el.closest(".cm-line").getBoundingClientRect();
      const plain = [...document.querySelectorAll("#doc-editor .cm-line")].find((l) => l.textContent.includes("plain item"));
      const strip = (el) => { const s = getComputedStyle(el.parentElement, "::before"); const r = el.parentElement.getBoundingClientRect(); return { w: parseFloat(s.width), h: parseFloat(s.height), right: r.right + parseFloat(getComputedStyle(el.parentElement).marginRight) }; };
      const b0 = boxes[0].getBoundingClientRect();
      const s0 = strip(boxes[0]);
      return {
        count: boxes.length,
        box: [Math.round(b0.width), Math.round(b0.height)],
        font: parseFloat(getComputedStyle(boxes[0].closest(".cm-line")).fontSize),
        taskLine: Math.round(lineOf(boxes[0]).height),
        plainLine: Math.round(plain.getBoundingClientRect().height),
        strip: s0,
        stripsMeet: boxes.length > 1 ? (() => { const a = boxes[0].parentElement.getBoundingClientRect(), b = boxes[1].parentElement.getBoundingClientRect(); const ca = (a.top + a.bottom) / 2, cb = (b.top + b.bottom) / 2; return Math.round(cb - ca - s0.h); })() : null,
        // a point on the strip, left of the box and clear of it
        stripPoint: { x: b0.left - 3, y: (b0.top + b0.bottom) / 2 },
        boxPoint: { x: (b0.left + b0.right) / 2, y: (b0.top + b0.bottom) / 2 },
        hitAtStrip: (() => { const e = document.elementFromPoint(b0.left - 3, (b0.top + b0.bottom) / 2); return e && (e.className || e.tagName); })(),
        targetMin: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--target-min")) * (getComputedStyle(document.documentElement).getPropertyValue("--target-min").includes("rem") ? 16 : 1),
      };
    });
    console.log(W, JSON.stringify(m));
    check(`${W}: two task boxes drawn`, m.count === 2);
    check(`${W}: the box is about the text's size (<= 1.25em)`, m.box[0] <= m.font * 1.25 + 0.5 && m.box[1] <= m.font * 1.25 + 0.5, { box: m.box, font: m.font });
    check(`${W}: a task line is as tall as a plain list line`, Math.abs(m.taskLine - m.plainLine) <= 1, { task: m.taskLine, plain: m.plainLine });
    check(`${W}: the press strip is at least the floor wide`, m.strip.w >= 28 - 0.5, m.strip);
    check(`${W}: two task lines' strips do not overlap`, m.stripsMeet >= -1, m.stripsMeet);
    check(`${W}: the strip beside the box is the task's`, /cm-md-task-hit/.test(String(m.hitAtStrip)), m.hitAtStrip);
    const src = () => page.evaluate(() => docSurface().text.split("\n")[2]);
    const before = await src();
    if (touch) await page.touchscreen.tap(m.boxPoint.x, m.boxPoint.y); else await page.mouse.click(m.boxPoint.x, m.boxPoint.y);
    await page.waitForTimeout(300);
    const afterBox = await src();
    check(`${W}: a press on the box toggles it`, before === "- [ ] first task" && afterBox === "- [x] first task", afterBox);
    if (touch) await page.touchscreen.tap(m.stripPoint.x, m.stripPoint.y); else await page.mouse.click(m.stripPoint.x, m.stripPoint.y);
    await page.waitForTimeout(300);
    const afterStrip = await src();
    check(`${W}: a press on the strip beside it toggles it back`, afterStrip === "- [ ] first task", afterStrip);
    const line = await page.evaluate(() => { const r = document.querySelector("#doc-editor .cm-line:nth-child(3)").getBoundingClientRect(); return { y: r.top - 40, h: 160 }; });
    await page.screenshot({ path: `${SHOTS}/doctaskbox-${THEME}-${W}.png`, clip: { x: 0, y: Math.max(0, line.y), width: W, height: line.h } });
    // Read: the rendered box is disabled, so a mark at the text's size.
    const read = await page.evaluate(async () => {
      setDocView("rendered"); await new Promise((r) => setTimeout(r, 800));
      const box = document.querySelector("#doc-preview .md-task input");
      if (!box) return null;
      const b = box.getBoundingClientRect();
      const plain = [...document.querySelectorAll("#doc-preview li")].find((l) => l.textContent.includes("plain"));
      return { box: [Math.round(b.width), Math.round(b.height)], li: Math.round(box.closest("li").getBoundingClientRect().height), plain: Math.round(plain.getBoundingClientRect().height), font: parseFloat(getComputedStyle(box.closest("li")).fontSize) };
    });
    check(`${W}: Read draws the box at the text's size`, read && read.box[0] <= read.font * 1.25 + 0.5, read);
    check(`${W}: Read's task line is as tall as a plain item`, read && Math.abs(read.li - read.plain) <= 1, read);
    check(`${W}: no console errors`, errors.length === 0, errors.slice(0, 2));
    await browser.close();
  }
  console.log(fails ? `${fails} FAIL` : "ALL PASS");
  process.exit(fails ? 1 : 0);
})();
