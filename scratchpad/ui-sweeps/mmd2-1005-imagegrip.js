// The audit's D5 (DOCUMENTS_PLAN decision 8): a picture in Live has a grip
// on its corner and an align button, and both write the size and alignment
// back into the markdown (`![A river|300|center](…)`).
//
//   BASE=http://127.0.0.1:8858 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmd2-1005-imagegrip.js   (THEME=dark, W=390)
const { boot, OUT } = require("./lib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 240;
    const g = canvas.getContext("2d");
    g.fillStyle = "#3a7bd5";
    g.fillRect(0, 0, 400, 240);
    g.fillStyle = "#ffd166";
    g.fillRect(40, 40, 120, 80);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const fd = new FormData();
    fd.append("file", new File([blob], "river.png", { type: "image/png" }));
    fd.append("direct", "true");
    const up = await (await fetch("/media/upload", { method: "POST", body: fd, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } })).json();
    const doc = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Pictures", content: `# Pictures\n\nText before.\n\n![A river](${up.url})\n\nText after.` }) });
    switchTab("documents");
    await openDocument(doc.id);
    setDocView("live");
    docCmView.dispatch({ selection: { anchor: 0 } });
  });
  await page.waitForTimeout(1500);
  const frame = await page.evaluate(() => {
    const f = document.querySelector("#doc-editor .cm-md-image-frame");
    f?.scrollIntoView({ block: "center" });
    const r = f?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
  });
  if (!frame) {
    console.log("FAIL  no picture frame in Live");
    await browser.close();
    return;
  }
  await page.mouse.move(frame.x + frame.w / 2, frame.y + frame.h / 2);
  await page.waitForTimeout(250);
  const hover = await page.evaluate(() => {
    const f = document.querySelector("#doc-editor .cm-md-image-frame");
    const img = f.querySelector("img").getBoundingClientRect();
    const grip = f.querySelector(".cm-md-image-grip");
    const g = grip.getBoundingClientRect();
    return {
      gripShown: getComputedStyle(grip).opacity, alignShown: getComputedStyle(f.querySelector(".cm-md-image-align")).opacity,
      corner: [Math.round(g.left + g.width / 2 - img.right), Math.round(g.top + g.height / 2 - img.bottom)],
      role: grip.getAttribute("role"), now: grip.getAttribute("aria-valuenow"),
    };
  });
  check("pointing at the picture shows a grip on its corner and an align button",
    hover.gripShown === "1" && hover.alignShown === "1" && Math.abs(hover.corner[0]) <= 2 && Math.abs(hover.corner[1]) <= 2 && hover.role === "slider",
    JSON.stringify(hover));
  const g = await page.evaluate(() => {
    const r = document.querySelector("#doc-editor .cm-md-image-grip").getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const startW = Math.round(frame.w);
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.mouse.move(g.x - 60, g.y, { steps: 4 });
  await page.mouse.move(g.x - 150, g.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const dragged = await page.evaluate(() => {
    const m = /!\[A river\|(\d+)\]\(/.exec(docText());
    const f = document.querySelector("#doc-editor .cm-md-image-frame");
    return { width: m ? Number(m[1]) : null, shown: Math.round(f.getBoundingClientRect().width), text: docText().split("\n")[4] };
  });
  check("dragging the grip resizes it and writes the width into the markdown",
    dragged.width !== null && Math.abs(dragged.width - (startW - 150)) <= 3 && Math.abs(dragged.shown - dragged.width) <= 2,
    JSON.stringify({ startW, ...dragged }));
  await page.evaluate(() => document.querySelector("#doc-editor .cm-md-image-grip").focus());
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  const keyed = await page.evaluate(() => ({
    width: Number((/!\[A river\|(\d+)\]/.exec(docText()) || [])[1]),
    focus: document.activeElement?.className,
    now: document.activeElement?.getAttribute("aria-valuenow"),
  }));
  check("the arrow keys step it by 10px and the grip keeps the keys", keyed.width === dragged.width + 10 && /cm-md-image-grip/.test(keyed.focus || "") && Number(keyed.now) === keyed.width,
    JSON.stringify(keyed));
  await page.evaluate(() => document.querySelector("#doc-editor .cm-md-image-align").click());
  await page.waitForTimeout(400);
  const items = await page.evaluate(() => [...document.querySelectorAll(".pointer-menu-host [role=menuitem], .action-menu:not(.hidden) [role=menuitem]")].map((b) => b.textContent.trim()));
  await page.evaluate(() => [...document.querySelectorAll(".pointer-menu-host [role=menuitem], .action-menu:not(.hidden) [role=menuitem]")].find((b) => /Centre/.test(b.textContent)).click());
  await page.waitForTimeout(600);
  const aligned = await page.evaluate(() => {
    const fig = document.querySelector("#doc-editor .cm-md-figure");
    const f = document.querySelector("#doc-editor .cm-md-image-frame").getBoundingClientRect();
    const col = document.querySelector("#doc-editor .cm-content").getBoundingClientRect();
    return {
      line: docText().split("\n")[4], centred: fig?.classList.contains("cm-md-figure-center"),
      offset: Math.round((f.left + f.right) / 2 - (col.left + col.right) / 2),
    };
  });
  check("the align menu offers left, centre, right and inline, and centres it",
    items.join(",") === "Left,Centre,Right,Inline" && /!\[A river\|\d+\|center\]/.test(aligned.line) && aligned.centred && Math.abs(aligned.offset) <= 30,
    JSON.stringify({ items, ...aligned }));
  const read = await page.evaluate(async () => {
    setDocView("rendered");
    renderDocPreview();
    await new Promise((r) => setTimeout(r, 500));
    const img = document.querySelector("#doc-preview img");
    return { width: Math.round(img.getBoundingClientRect().width), css: img.style.width };
  });
  check("Read draws it at the same width", Math.abs(read.width - keyed.width) <= 2, JSON.stringify(read));
  const undo = await page.evaluate(async () => {
    setDocView("live");
    await new Promise((r) => setTimeout(r, 500));
    docCmView.focus();
    return true;
  });
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(400);
  const back = await page.evaluate(() => docText().split("\n")[4]);
  check("Ctrl+Z takes back the alignment as one step", undo && !/\|center\]/.test(back) && /!\[A river\|\d+\]/.test(back), back);
  const shot = `${OUT}/mmd2-imagegrip-${W}-${process.env.THEME || "light"}.png`;
  await page.screenshot({ path: shot });
  console.log("shot", shot);
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
