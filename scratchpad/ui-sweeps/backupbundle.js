// BACKLOG 115 row 10: the full backup goes out sealed and comes back in
// through Settings, Data. Drives the real controls at 1440 and 390:
//   - the export row and the Restore a full backup group sit inside the window
//     and the pane does not scroll sideways,
//   - Export full backup with a password downloads a sealed .mmenc (magic
//     bytes, none of the note text in it),
//   - three notes are binned, the file is chosen in the Restore group with a
//     wrong password (status says so, notes still gone), then the right one,
//   - after the reload and unlock the three notes are back.
//
//   BASE=http://127.0.0.1:8796 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/backupbundle.js
const fs = require("fs");
const { boot } = require("./lib.js");

const SECRET_BASE = "sealed-pangolin-ledger";
const PASS = "hunter2hunter2";

async function run(viewport, phone) {
  // Per run: the 390 pass shares the data dir, and must not count 1440's notes.
  const SECRET = `${SECRET_BASE}-${phone ? "phone" : "desk"}`;
  const { browser, page } = await boot({ viewport, hasTouch: phone, isMobile: phone });
  const ids = await page.evaluate(async (secret) => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const e = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `${secret} ${i}`, category: "General" }) });
      out.push(e.id);
    }
    return out;
  }, SECRET);
  await page.evaluate(() => openSettingsModal("data"));
  await page.waitForSelector("#restore-bundle", { state: "visible", timeout: 15000 });
  const layout = await page.evaluate(() => {
    const inside = (id) => {
      const el = document.getElementById(id);
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.right <= document.documentElement.clientWidth && r.width > 0;
    };
    const pane = document.getElementById("restore-bundle").closest(".settings-pane, .modal-card, body");
    return {
      export: inside("export-backup-password") && inside("export-backup-zip"),
      restore: inside("restore-bundle") && inside("restore-bundle-password"),
      sideways: pane.scrollWidth > pane.clientWidth + 1 || document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  await page.fill("#export-backup-password", PASS);
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.click("#export-backup-zip"),
  ]);
  const file = `/tmp/bb-${phone ? 390 : 1440}.mmenc`;
  await download.saveAs(file);
  const bytes = fs.readFileSync(file);
  const sealed = bytes.slice(0, 5).toString() === "MMBK1" && !bytes.includes(Buffer.from(SECRET));
  const named = download.suggestedFilename();

  await page.evaluate(async (list) => { for (const id of list) await api(`/entries/${id}`, { method: "DELETE" }); }, ids);
  const gone = await page.evaluate(async (secret) => (await apiJson("/entries?limit=100")).filter((e) => e.content.startsWith(secret)).length, SECRET);

  const accept = async () => {
    await page.waitForSelector(".confirm-overlay .confirm-actions button", { timeout: 5000 });
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".confirm-overlay .confirm-actions button")].find((x) => !/cancel/i.test(x.textContent));
      b.click();
    });
  };
  await page.fill("#restore-bundle-password", "not the password");
  await page.setInputFiles("#restore-bundle-file", file);
  await accept();
  await page.waitForFunction(() => /password/i.test(document.getElementById("restore-bundle-status").textContent), null, { timeout: 30000 });
  const wrongSaid = await page.evaluate(() => document.getElementById("restore-bundle-status").textContent);
  const stillGone = await page.evaluate(async (secret) => (await apiJson("/entries?limit=100")).filter((e) => e.content.startsWith(secret)).length, SECRET);

  await page.fill("#restore-bundle-password", PASS);
  await page.setInputFiles("#restore-bundle-file", file);
  await accept();
  await page.waitForFunction(() => /Reloading/.test(document.getElementById("restore-bundle-status").textContent), null, { timeout: 30000 });
  await page.waitForFunction(() => { const f = document.getElementById("lock-password"); return f && f.offsetParent !== null; }, null, { timeout: 30000, polling: 200 });
  await page.fill("#lock-password", "testpassword123");
  await page.click("#lock-submit");
  // The old token is still in storage after the reload, so wait on the lock
  // screen going away, not on a token existing.
  await page.waitForFunction(() => { const o = document.getElementById("lock-overlay"); return o && o.classList.contains("hidden"); }, null, { timeout: 30000, polling: 200 });
  await page.waitForTimeout(1500);
  const back = await page.evaluate(async (secret) => (await apiJson("/entries?limit=100")).filter((e) => e.content.startsWith(secret)).length, SECRET);

  const checks = {
    layout: layout.export && layout.restore && !layout.sideways,
    sealed: sealed && named === "memorymap-backup.mmenc",
    binned: gone === 0,
    wrongPasswordRefused: /password/i.test(wrongSaid) && stillGone === 0,
    restored: back === 3,
  };
  console.log(phone ? "390" : "1440", JSON.stringify({ layout, named, wrongSaid, gone, stillGone, back, checks }));
  await browser.close();
  return Object.values(checks).every(Boolean);
}

(async () => {
  const a = await run({ width: 1440, height: 900 }, false);
  const b = await run({ width: 390, height: 844 }, true);
  console.log(a && b ? "PASS" : "FAIL");
  process.exit(a && b ? 0 : 1);
})();
