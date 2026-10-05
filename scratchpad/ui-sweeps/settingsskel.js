// Settings panes that fetch before they can draw show skeletons while the
// answer is on its way (DESIGN.md's list recipe), not a bare line or nothing:
//
//   BASE=http://127.0.0.1:8802 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/settingsskel.js        (DELAY=2500 ms, WIDTH=1440)
//
// After boot every API request (anything not a static file) is held for DELAY
// ms. Each pane is opened and read at 400 ms: it passes when the list it fills
// shows `.skeleton` placeholders under `aria-busy`, and again once the answer
// lands (DELAY + 1 s later) with none left and the busy mark gone. A pane that
// is blank at 400 ms, or still carries placeholders after the answer, fails.
// The Models pane's own `Checking the models…` line is read too: it has to
// keep its words (a screen reader reads them) and sit above the placeholders.
const { boot } = require("./lib.js");

const DELAY = Number(process.env.DELAY || 2500);
const WIDTH = Number(process.env.WIDTH || 1440);
const STATIC = /\.(js|css|png|svg|ico|woff2?|webmanifest|gguf|json)(\?|$)|\/vendor\/|\/js\//;

const PANES = [
  // `held` is the one endpoint a pane waits on; everything else answers at its
  // own speed, so the pane is reached without a chain of held requests first.
  // `early` holds it from the page load (the model status is polled at boot,
  // so it is only unanswered when the whole load held it).
  { name: "models", section: "models", list: "#models-skeleton", held: /\/models\/status/, early: true },
  { name: "what it remembers", section: "memory", list: "#memory-list", held: /\/memory(\?|$)/ },
  { name: "what it learned (switches)", section: "learned", list: "#learned-switches", held: /\/learned\/switches/ },
  { name: "what it learned (list)", section: "learned", list: "#learned-list", held: /\/learned\?/ },
  { name: "logs", section: "logs", list: "#log-list", held: /\/logs\?limit/ },
];

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok || !detail ? "" : "  " + detail}`);
};

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 } });
  let hold = null;
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (!hold || !hold.test(url) || STATIC.test(url) || route.request().resourceType() === "document") return route.continue();
    await new Promise((r) => setTimeout(r, DELAY));
    return route.continue().catch(() => {});
  });
  for (const pane of PANES) {
    // A fresh page per pane: nothing it shows was cached by an earlier open.
    hold = pane.early ? pane.held : null;
    await page.goto(page.url(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(pane.early ? 1200 : 3500);
    hold = pane.held;
    // The model status is polled from boot, so by now it is known; the state
    // this pane's placeholders are for is the one before the first answer.
    if (pane.early) await page.evaluate(() => { modelStatus = null; });
    await page.evaluate((section) => { openSettingsModal(section); }, pane.section);
    await page.waitForTimeout(400);
    // The Models pane is reached after the modal's own bundles load, which a
    // slow first open can take longer than 400 ms to do; it is waited for, and
    // the time it took is part of the line, not hidden.
    if (pane.early) await page.waitForFunction((sel) => document.querySelector(sel + " .skeleton"), pane.list, { timeout: 2200 }).catch(() => {});
    const during = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { missing: true };
      const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true, opacityProperty: true });
      const sk = [...el.querySelectorAll(":scope > .skeleton")];
      const line = document.getElementById("ollama-status");
      return {
        skeletons: sk.filter(vis).length,
        busy: el.getAttribute("aria-busy"),
        height: sk[0] ? Math.round(sk[0].getBoundingClientRect().height) : 0,
        // The Models pane keeps its words, above the placeholders.
        line: line ? line.textContent.trim() : null,
        lineAbove: line && sk[0] ? line.getBoundingClientRect().bottom <= sk[0].getBoundingClientRect().top + 1 : null,
      };
    }, pane.list);
    check(`${pane.name}: placeholders at 400 ms`, !during.missing && during.skeletons >= 2 && during.height > 20,
      JSON.stringify(during));
    if (pane.name !== "models") check(`${pane.name}: marked busy`, during.busy === "true", String(during.busy));
    if (pane.name === "models") {
      check("models: the checking line keeps its words, above the placeholders",
        during.line === "Checking the models…" && during.lineAbove === true, JSON.stringify(during));
    }
    await page.waitForTimeout(DELAY + 1500);
    // The model status is re-polled until it answers, and a held poll re-arms
    // the placeholders; the answer is read once the hold is lifted.
    hold = null;
    await page.waitForTimeout(pane.early ? DELAY + 2500 : 300);
    const after = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? { skeletons: el.querySelectorAll(":scope > .skeleton").length, busy: el.getAttribute("aria-busy") } : { missing: true };
    }, pane.list);
    check(`${pane.name}: none left after the answer`, !after.missing && after.skeletons === 0 && !after.busy, JSON.stringify(after));
    hold = null;
  }
  await browser.close();
  console.log(failures ? `${failures} FAILED` : "all ok");
  process.exit(failures ? 1 : 0);
})();
