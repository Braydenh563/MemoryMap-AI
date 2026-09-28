// View > Size on the graph (INBOX 430: "node size by a toggle in View:
// connections (the default), length, recency, or none"). For each rule, set
// the way a person sets it (the select, its change event), the drawn radii:
// the spread, and how the biggest node relates to the rule (the most linked,
// the longest, the most recently edited). And that the choice survives a
// return to the tab.
const { boot } = require("./lib.js");
(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + detail : ""}`);
  };
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab("graph"));
  await page.waitForTimeout(4000);
  const read = (mode) => page.evaluate(async (m) => {
    const select = document.getElementById("graph-size");
    select.value = m;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 2500));
    const nodes = gcTab.nodes.filter((n) => !n.isGroup);
    const radii = nodes.map((n) => n.r);
    const top = nodes.reduce((a, b) => (b.r > a.r ? b : a));
    const degree = (n) => (gcTab.adj.get(n.id) || { size: 0 }).size;
    const maxDegree = Math.max(...nodes.map(degree));
    const maxWords = Math.max(...nodes.map((n) => n.words || 0));
    const newest = Math.max(...nodes.map((n) => Date.parse(n.updated_at || n.created_at)));
    return {
      n: nodes.length,
      min: Number(Math.min(...radii).toFixed(1)),
      max: Number(Math.max(...radii).toFixed(1)),
      distinct: new Set(radii.map((r) => r.toFixed(1))).size,
      topIs: {
        linked: degree(top) === maxDegree,
        longest: (top.words || 0) === maxWords,
        newest: Date.parse(top.updated_at || top.created_at) === newest,
      },
      saved: localStorage.getItem("graph-size"),
    };
  }, mode);
  const c = await read("connections");
  console.log("     connections", JSON.stringify(c));
  check("connections: the biggest dot is the most linked note", c.topIs.linked && c.distinct > 1);
  const l = await read("length");
  console.log("     length", JSON.stringify(l));
  check("length: the biggest dot is the longest note", l.topIs.longest && l.distinct > 1);
  const r = await read("recency");
  console.log("     recency", JSON.stringify(r));
  check("recency: the biggest dot is the newest edit", r.topIs.newest);
  const none = await read("none");
  console.log("     none", JSON.stringify(none));
  check("none: one size for every note", none.distinct === 1);
  check("the rule is remembered", none.saved === "none");
  await page.evaluate(async () => {
    switchTab("notes");
    await new Promise((r) => setTimeout(r, 500));
    switchTab("graph");
    await new Promise((r) => setTimeout(r, 3000));
  });
  const back = await page.evaluate(() => ({ value: document.getElementById("graph-size").value, distinct: new Set(gcTab.nodes.filter((n) => !n.isGroup).map((n) => n.r.toFixed(1))).size }));
  check("a return to the tab keeps it", back.value === "none" && back.distinct === 1, JSON.stringify(back));
  await page.evaluate(() => {
    const select = document.getElementById("graph-size");
    select.value = "connections";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "the size rule holds");
  process.exit(fails ? 1 : 0);
})();
