// perf2-1005 (audit FE-03(c)): the Library tab fetches library.js alone; the
// editors come with the first document or board. Each step's requests, the
// page errors, and whether each view drew.
//   BASE=http://127.0.0.1:8859 node perf2-1005-libsplit.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  let fetched = [];
  page.on("request", (r) => {
    const u = r.url();
    if (/\/js\/|\/vendor\//.test(u)) fetched.push(u.split("/").pop().split("?")[0]);
  });
  const step = async (name, fn, wait = 2500) => {
    fetched = [];
    await fn();
    await page.waitForTimeout(wait);
    return { step: name, fetched: [...new Set(fetched)] };
  };
  const out = [];
  out.push(await step("library tab", () => page.click('[data-tab="library"]'), 3500));
  out.push({
    drew: await page.evaluate(() => ({
      items: document.querySelectorAll("#tab-library .library-item, #tab-library [data-kind]").length,
      documentsLoaded: typeof saveDocument === "function" && !String(saveDocument).includes("ensureModule"),
    })),
  });
  out.push(await step("documents sub-tab", () => page.evaluate(() => {
    document.querySelector('#library-subtabs [data-target="library-view-docs"]').click();
  })));
  out.push(await step("boards sub-tab", () => page.evaluate(() => {
    document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]').click();
  })));
  out.push({ views: await page.evaluate(() => ({
    docsList: document.querySelectorAll("#library-docs-list > *").length,
    boards: document.querySelectorAll("#library-view-whiteboard *").length,
  })) });
  out.push(await step("files sub-tab", () => page.evaluate(() => {
    document.querySelector('#library-subtabs [data-media-kind="files"]').click();
  })));
  out.push(await step("open a document", () => page.evaluate(async () => {
    const res = await api("/documents", { method: "POST", body: JSON.stringify({ title: "perf2 split", content: "# Hi\n\nWords." }) });
    await openDocument((await res.json()).id);
  }), 3500));
  out.push({ docOpen: await page.evaluate(() => !!document.querySelector("#doc-editor, .doc-editor, .cm-editor")) });
  out.push({ errors });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
