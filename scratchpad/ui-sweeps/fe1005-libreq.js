// fe1005: what a Library visit fetches (audit 2026-10-05, FE-03). The
// grammar checker (harper worker, WASM) and the word list belong to an open
// document, never to the Library list. Then opens a document with text and
// checks that spelling and grammar do start there.
//   BASE=http://127.0.0.1:8842 node fe1005-libreq.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  const seen = [];
  page.on("request", (r) => seen.push(r.url()));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(4000);
  const heavy = seen.filter((u) => /harper|wordlist|\.wasm/.test(u));
  const scripts = seen.filter((u) => /\/js\//.test(u)).map((u) => u.split("/js/")[1].split("?")[0]);
  console.log(JSON.stringify({ libraryVisit: { scripts, heavy } }));
  // A document with words in it: the checkers start.
  const made = await page.evaluate(async () => {
    const res = await api("/documents", {
      method: "POST",
      body: JSON.stringify({ title: "fe1005 probe", content: "This are a sentense with a eror in it." }),
    });
    return (await res.json()).id;
  });
  seen.length = 0;
  await page.evaluate((id) => typeof openDocument === "function" && openDocument(id), made);
  await page.waitForTimeout(6000);
  const opened = seen.filter((u) => /harper|wordlist|\.wasm/.test(u)).map((u) => u.split("/").pop().split("?")[0]);
  const findings = await page.evaluate(() => (typeof docProseFound !== "undefined" ? docProseFound.length : null));
  console.log(JSON.stringify({ documentOpen: { id: made, fetched: opened, findings } }));
  await browser.close();
})();
