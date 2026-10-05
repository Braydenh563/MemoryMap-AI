// FEAT-02 probe: what one appended topic costs in style and layout at N
// topics, with and without CSS containment on the topics. Runs each trial
// five times and prints the medians.
const { boot } = require("./lib.js");
const N = Number(process.env.N || 301);
function outline(n) {
  const lines = ["# Layout " + n, "", "- Centre"];
  let made = 1, b = 0;
  while (made < n) {
    lines.push(`  - Branch ${b}`); made++;
    for (let k = 0; k < 9 && made < n; k++, made++) lines.push(`    - Leaf ${b}.${k}`);
    b++;
  }
  return lines.join("\n");
}
(async () => {
  const { page, browser } = await boot();
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async (content) => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content }) });
    await openWhiteboardBoard(b.id);
    await wbMapTidyFresh();
  }, outline(N));
  await page.waitForTimeout(1500);
  const run = (contain) => page.evaluate((contain) => {
    const layer = document.getElementById("wb-html-layer");
    for (const o of layer.querySelectorAll(":scope > .wb-object")) o.style.contain = contain;
    void layer.offsetHeight;
    const med = (xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const append = [], cls = [], editable = [];
    for (let k = 0; k < 5; k++) {
      const src = layer.querySelector(":scope > .wb-object");
      const clone = src.cloneNode(true);
      clone.style.transform = "translate(9000px, 9000px)";
      let t = performance.now();
      layer.appendChild(clone);
      void clone.offsetHeight;
      append.push(performance.now() - t);
      t = performance.now();
      clone.classList.toggle("wb-selected");
      void clone.getBoundingClientRect();
      cls.push(performance.now() - t);
      const text = clone.querySelector(".wb-map-text");
      t = performance.now();
      text.setAttribute("contenteditable", "plaintext-only");
      void text.getBoundingClientRect();
      editable.push(performance.now() - t);
      clone.remove();
      void layer.offsetHeight;
    }
    return { contain: contain || "none", append: med(append).toFixed(1), selectClass: med(cls).toFixed(1), editable: med(editable).toFixed(1) };
  }, contain);
  console.log(JSON.stringify(await run("")));
  if (process.env.TRACE) {
    const cdp = await page.context().newCDPSession(page);
    const events = [];
    cdp.on("Tracing.dataCollected", (e) => events.push(...e.value));
    const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
    await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline", transferMode: "ReportEvents" });
    await page.evaluate(() => {
      const layer = document.getElementById("wb-html-layer");
      const mark = (name) => performance.mark(name);
      const step = (name, fn) => { console.timeStamp("probe:" + name); fn(); void layer.offsetHeight; };
      const node = layer.querySelector(":scope > .wb-object");
      const text = node.querySelector(".wb-map-text");
      step("plain-div", () => { const d = document.createElement("div"); d.id = "probe-div"; layer.appendChild(d); });
      step("remove-div", () => document.getElementById("probe-div").remove());
      step("data-attr", () => text.setAttribute("data-probe", "1"));
      step("contenteditable", () => text.setAttribute("contenteditable", "plaintext-only"));
      step("contenteditable-off", () => text.setAttribute("contenteditable", "false"));
      step("class-on-node", () => node.classList.toggle("probe-c"));
      step("append-into-node", () => node.appendChild(document.createElement("span")));
      step("div-elsewhere", () => document.body.appendChild(document.createElement("div")));
    });
    await cdp.send("Tracing.end");
    await done;
    const sum = {};
    for (const e of events) {
      if (e.ph !== "X" || !e.dur) continue;
      const k = e.name;
      sum[k] = sum[k] || { ms: 0, n: 0 };
      sum[k].ms += e.dur / 1000;
      sum[k].n += 1;
    }
    const rows = Object.entries(sum).sort((a, b) => b[1].ms - a[1].ms).slice(0, 12);
    for (const [k, v] of rows) console.log(v.ms.toFixed(1).padStart(8), String(v.n).padStart(5), k);
    const ordered = events.filter((e) => (e.name === "UpdateLayoutTree" && e.ph === "X") || e.name === "TimeStamp").sort((a, b) => a.ts - b.ts);
    let label = "";
    for (const e of ordered) {
      if (e.name === "TimeStamp") label = e.args?.data?.message || "";
      else if (label.startsWith("probe:")) { console.log(label, "recalc", e.args?.elementCount, (e.dur / 1000).toFixed(1) + "ms"); label = ""; }
    }
    const recalc = events.filter((e) => e.name === "UpdateLayoutTree" && e.ph === "X");
    console.log("UpdateLayoutTree elementCounts", recalc.map((e) => e.args?.elementCount).slice(0, 20).join(","));
    const lay = events.filter((e) => e.name === "Layout" && e.ph === "X");
    console.log("Layout dirty/total", lay.map((e) => `${e.args?.beginData?.dirtyObjects}/${e.args?.beginData?.totalObjects}`).slice(0, 20).join(","));
  }
  await browser.close();
})();
