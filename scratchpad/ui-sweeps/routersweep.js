// The hash router (WORLD_CLASS_PLAN 22.1 item 1, frontend/router.js): every
// view has an address, the title names it, the browser's Back and Forward and
// the app's own walk the same list, reload keeps the view and a deep link
// opens the thing it names. At 1093x614@1.25 (the owner's laptop) unless VIEW.
//   node scratchpad/ui-sweeps/routersweep.js
const { boot, BASE, PW } = require("./lib.js");
const W = Number(process.env.VIEW || 1093);
const H = Number(process.env.HEIGHT || 614);
(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + detail : ""}`);
  };
  const { page, browser } = await boot({ viewport: { width: W, height: H }, deviceScaleFactor: W === 1093 ? 1.25 : 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const where = () => page.evaluate(() => ({
    hash: location.hash,
    title: document.title,
    tab: localStorage.getItem("activeTab"),
    shown: document.querySelector(".tab-page:not(.hidden)")?.id || "",
  }));
  const settle = (ms = 900) => page.waitForTimeout(ms);
  const tab = async (name) => {
    await page.click(`#tab-bar button[data-tab="${name}"]`);
    await settle();
  };

  let w = await where();
  check("the boot names the Dashboard", w.hash === "#/dashboard" && /Dashboard · MemoryMap AI/.test(w.title), `${w.hash} "${w.title}"`);
  await tab("notes");
  w = await where();
  check("a tab has an address and a title", w.hash === "#/notes" && /Notes · MemoryMap AI/.test(w.title), `${w.hash} "${w.title}"`);
  await tab("chat");
  await tab("graph");
  w = await where();
  check("Graph", w.hash === "#/graph", w.hash);

  await page.goBack();
  await settle(1200);
  w = await where();
  check("the browser's Back walks to the last view", w.hash === "#/chat" && w.tab === "chat", `${w.hash} tab ${w.tab}`);
  await page.goBack();
  await settle(1200);
  w = await where();
  check("and again", w.hash === "#/notes" && w.tab === "notes", `${w.hash} tab ${w.tab}`);
  await page.goForward();
  await settle(1200);
  w = await where();
  check("the browser's Forward walks back", w.hash === "#/chat" && w.tab === "chat", `${w.hash} tab ${w.tab}`);

  await page.evaluate(() => document.getElementById("status-back")?.click());
  await settle(1200);
  w = await where();
  check("the app's own Back walks the same list", w.hash === "#/notes" && w.tab === "notes", `${w.hash} tab ${w.tab}`);
  await page.evaluate(() => document.getElementById("status-forward")?.click());
  await settle(1200);
  w = await where();
  check("the app's own Forward too", w.hash === "#/chat" && w.tab === "chat", `${w.hash} tab ${w.tab}`);

  //: A note: its address, and its words in the title.
  const note = await page.evaluate(() => {
    const e = allEntries.find((x) => !x.is_private && !x.is_draft);
    flashEntry(e.id);
    return { id: e.id, words: noteLabel(e, 60) };
  });
  await settle(1200);
  w = await where();
  check("an opened note has an address", w.hash === `#/notes/${note.id}`, w.hash);
  check("and the title names it", w.title.startsWith(`${note.words} · Notes`), `"${w.title}"`);

  //: Reload keeps the view (the lock asks again: it is a new page load).
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  if (await page.$("#lock-password") && await page.isVisible("#lock-password")) {
    await page.fill("#lock-password", PW);
    await page.click("#lock-submit");
  }
  await page.waitForTimeout(3500);
  w = await where();
  check("reload keeps the view", w.hash === `#/notes/${note.id}` && w.tab === "notes", `${w.hash} tab ${w.tab}`);
  const lit = await page.evaluate((id) => Boolean(document.querySelector(`#entry-list li[data-id="${id}"]`)), note.id);
  check("and the note is on screen", lit);

  //: A deep link to a document and to a Library sub-tab.
  const doc = await page.evaluate(async () => {
    const headers = { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" };
    return (await fetch("/documents", { method: "POST", headers, body: JSON.stringify({ title: "Router probe", content: "Router probe\\n\\nHello." }) })).json();
  });
  for (const [hash, test] of [
    [`#/docs/${doc.id}`, (x) => x.tab === "documents" && /Router probe · Documents/.test(x.title)],
    ["#/library/images", (x) => x.tab === "library" && /Images · Library/.test(x.title)],
    ["#/settings/appearance", (x) => /Appearance · Settings/.test(x.title)],
  ]) {
    await page.goto(`${BASE}/${hash}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    if (await page.$("#lock-password") && await page.isVisible("#lock-password")) {
      await page.fill("#lock-password", PW);
      await page.click("#lock-submit");
    }
    await page.waitForTimeout(4000);
    w = await where();
    check(`a deep link opens ${hash}`, w.hash === hash && test(w), `${w.hash} tab ${w.tab} "${w.title}"`);
  }
  const settingsOpen = await page.evaluate(() => settingsModalOpen());
  check("the settings link opened Settings", settingsOpen);
  await page.evaluate(() => closeSettingsModal());
  await settle(400);
  w = await where();
  check("closing Settings gives the tab its address back", !w.hash.startsWith("#/settings"), w.hash);

  //: An in-page anchor is not a route.
  const before = await where();
  await page.evaluate(() => { location.hash = "#some-heading"; });
  await settle(600);
  w = await where();
  check("an anchor does not navigate", w.tab === before.tab, `${before.tab} -> ${w.tab}`);

  await page.evaluate(async (id) => {
    const headers = { "X-Auth-Token": localStorage.getItem("token") || "" };
    await fetch(`/documents/${id}`, { method: "DELETE", headers });
  }, doc.id);
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "every view has an address");
  process.exit(fails ? 1 : 0);
})();
