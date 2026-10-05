// **The agent's step nodes sit on the rail's centre line** (INBOX 588). A
// synthetic run of five steps in the chat's own styles: each node's centre
// within 0.25px of the rail's centre, at 1440 and 390, light and dark.
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/railalign.js
const { boot } = require("./lib.js");
(async () => {
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failed++; };
  for (const theme of ["dark", "light"]) {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      process.env.THEME = theme;
      const { browser, page } = await boot({ viewport: { width: w, height: h } });
      const m = await page.evaluate(() => {
        const host = document.createElement("div");
        host.className = "chat-message assistant";
        const steps = document.createElement("div");
        steps.className = "agent-steps";
        steps.innerHTML = '<details class="agent-step step-thinking"><summary>Thought</summary></details><span class="tool-chip">searched</span><div class="tool-confirm">confirm</div><details class="agent-step step-plan"><summary>Plan</summary></details><span class="tool-chip">read</span>';
        host.appendChild(steps);
        host.className = "msg assistant"; host.style.position = "fixed"; host.style.top = "40px"; host.style.left = "40px"; host.style.width = "300px"; document.body.appendChild(host);
        const rail = getComputedStyle(steps, "::before");
        const box = steps.getBoundingClientRect();
        const railMid = box.left + parseFloat(rail.left) + parseFloat(rail.width) / 2;
        const offs = [...steps.children].map((c) => {
          const cs = getComputedStyle(c, "::before");
          const r = c.getBoundingClientRect();
          return Math.abs(r.left + parseFloat(cs.left) + parseFloat(cs.width) / 2 - railMid);
        });
        host.remove();
        return { worst: Math.max(...offs) };
      });
      check(m.worst <= 0.25, `${theme} ${w}: nodes on the rail (worst ${m.worst.toFixed(2)}px)`);
      await browser.close();
    }
  }
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
