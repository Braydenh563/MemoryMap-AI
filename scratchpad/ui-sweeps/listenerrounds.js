// Do the app's rebuilt surfaces leave listeners behind on document and
// window? The method is leaks.js's (per round, after the first), pointed at
// two things a tab walk never rebuilds:
//
//   1. The chat welcome. A new chat empties `#chat-messages` and
//      `renderChatEmptyState` builds the welcome again, '?' and all;
//      `initHelpToggles(empty)` wires that '?' with `wireHelpPopover`, which
//      put four listeners on document and window per call, each closure
//      holding the welcome it was built for. Four listeners and a subtree
//      per new chat, for the life of the page.
//   2. The Skills dropdown in the chat dock. `loadChatSkills` rebuilds it at
//      boot and after every skill saved in Settings, and put a document click
//      and a document keydown on each build.
//
//   BASE=http://127.0.0.1:8820 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node listenerrounds.js
//
// Exit 1 when either grows past the jitter budget per round after round one.
const { boot } = require("./lib.js");
const ROUNDS = Number(process.env.ROUNDS || 6);
//: leaks.js allows 40 across seven tabs; a single rebuilt welcome or dropdown
//: has no timer or clock of its own, so two is jitter and four is the leak.
const BUDGET = 2;

(async () => {
  const { page, browser, ctx } = await boot({ viewport: { width: 1280, height: 800 } });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.evaluate(() => switchTab("chat"));
  await page.waitForTimeout(1200);
  const sample = async () => {
    for (let i = 0; i < Number(process.env.GC || 2); i++) {
      await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
      await page.waitForTimeout(200);
    }
    const metrics = await cdp.send("Performance.getMetrics");
    return Object.fromEntries(metrics.metrics.map((m) => [m.name, m.value])).JSEventListeners;
  };
  const scenarios = {
    //: The control: a subtree with thirty listeners of its own, rebuilt and
    //: dropped, with nothing outside it holding on. If this grows, the
    //: measurement is counting nodes not yet collected, not a leak, and the
    //: GC passes (`GC=<n>`) need raising before the other two mean anything.
    "control subtree rebuilt": () => {
      let ctl = document.getElementById("listener-control");
      if (ctl) ctl.remove();
      ctl = document.createElement("div");
      ctl.id = "listener-control";
      for (let i = 0; i < 30; i++) {
        const b = document.createElement("button");
        b.addEventListener("click", () => ctl.dataset.hit = String(i));
        ctl.appendChild(b);
      }
      document.body.appendChild(ctl);
      return true;
    },
    "chat welcome rebuilt": () => {
      const box = document.getElementById("chat-messages");
      box.replaceChildren();
      renderChatEmptyState();
      return !!box.querySelector(".chat-empty [data-help-for]");
    },
    "skills dropdown rebuilt": async () => {
      await loadChatSkills();
      return !!document.getElementById("chat-skills-btn");
    },
  };
  let failed = false;
  for (const [name, run] of Object.entries(scenarios)) {
    const rounds = [];
    for (let r = 0; r < ROUNDS; r++) {
      const built = await page.evaluate(run);
      if (!built) { console.log(`${name}: the surface was not built, nothing measured`); failed = true; break; }
      await page.waitForTimeout(300);
      rounds.push(await sample());
    }
    if (rounds.length < ROUNDS) continue;
    const deltas = rounds.slice(1).map((n, i) => n - rounds[i]);
    const worst = Math.max(...deltas.slice(1));
    const ok = worst <= BUDGET;
    console.log(`${name}: listeners ${rounds.join(" ")} (per round after the first: ${deltas.slice(1).map((d) => (d >= 0 ? "+" : "") + d).join(" ")}) ${ok ? "PASS" : "FAIL"}`);
    if (!ok) failed = true;
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
