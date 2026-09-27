// INBOX 430: the Guide's answer carries the app's own help beside the
// model's, with a toggle between them and a button that opens the setting.
// Asks one question twice: as the app answers it with no model (the real
// route: the help, laid out, with no toggle) and with a model's reply
// stood in (the stream route fulfilled here with a delta and the real
// `system` from the offline route), then presses "From the help" and the
// open button. Shoots both to $SCRATCH/shots/guide-<TAG>-*.png. Exits 1 on
// any miss.
const { boot } = require("./lib.js");

const Q = process.env.Q || "the companion went off screen, how do I call it back";

(async () => {
  const { browser, page, OUT } = await boot({ viewport: { width: 1440, height: 900 } });
  const tag = process.env.TAG || "now";
  const ask = async () => {
    await page.evaluate(() => openHelpChat());
    await page.waitForTimeout(600);
    await page.fill("#help-chat-input", Q);
    await page.press("#help-chat-input", "Enter");
    await page.waitForTimeout(1800);
  };
  const shoot = async (name) => {
    const box = await page.evaluate(() => {
      const r = [...document.querySelectorAll("#help-chat-messages .help-chat-msg.is-assistant")].pop().getBoundingClientRect();
      return { x: Math.max(0, r.left - 12), y: Math.max(0, r.top - 12), width: r.width + 24, height: Math.min(860, r.height + 24) };
    });
    await page.screenshot({ path: `${OUT}/guide-${tag}-${name}.png`, clip: box });
  };
  let bad = false;
  // 1. No model: the help, laid out, and the link; no toggle.
  await ask();
  const off = await page.evaluate(() => {
    const row = [...document.querySelectorAll("#help-chat-messages .help-chat-msg.is-assistant")].pop();
    return { h3: row.querySelector("h1,h2,h3,h4,h5,h6")?.textContent || row.querySelector(".help-chat-prose").innerHTML.slice(0, 200), toggle: !!row.querySelector(".help-chat-views"), open: row.querySelector(".help-chat-open button")?.textContent || "", steps: row.querySelectorAll("ol li").length };
  });
  console.log("no model:", JSON.stringify(off));
  if (!off.h3 || off.toggle || !off.open || off.steps < 1) bad = true;
  await shoot("offline");
  // 2. With a model's reply stood in.
  const system = await page.evaluate(async (q) => (await apiJson("/help/ask", { method: "POST", body: JSON.stringify({ question: q }) })).system, Q);
  await page.route("**/help/ask/stream", (route) => route.fulfill({
    status: 200,
    contentType: "application/x-ndjson",
    body: [
      JSON.stringify({ type: "delta", text: "Right-click it and choose Call back and reset its place." }),
      JSON.stringify({ type: "done", content: "Right-click it and choose Call back and reset its place.", badges: [system.open], sources: ["Companion"], system }),
    ].join("\n") + "\n",
  }));
  await ask();
  const on = await page.evaluate(() => {
    const row = [...document.querySelectorAll("#help-chat-messages .help-chat-msg.is-assistant")].pop();
    const seg = row.querySelector(".help-chat-views");
    const before = row.querySelector(".help-chat-prose").textContent.slice(0, 40);
    seg?.querySelector('[data-view="help"]')?.click();
    const after = row.querySelector(".help-chat-prose :is(h1,h2,h3,h4,h5,h6)")?.textContent || "";
    return { toggle: !!seg, tabs: seg ? [...seg.children].map((b) => b.textContent) : [], before, after, selected: seg?.querySelector('[aria-selected="true"]')?.dataset.view };
  });
  console.log("with a model:", JSON.stringify(on));
  if (!on.toggle || on.selected !== "help" || !on.after) bad = true;
  await shoot("model");
  // 3. The open button goes to the row.
  await page.evaluate(() => [...document.querySelectorAll(".help-chat-open button")].pop().click());
  await page.waitForTimeout(900);
  const went = await page.evaluate(() => {
    const modal = document.getElementById("settings-modal");
    const row = document.getElementById("avatar-buddy-row");
    const r = row?.getBoundingClientRect();
    return { open: modal && !modal.classList.contains("hidden"), section: !document.getElementById("settings-appearance")?.classList.contains("hidden"), rowInView: !!r && r.top >= 0 && r.bottom <= innerHeight };
  });
  console.log("open button:", JSON.stringify(went));
  if (!went.open || !went.section || !went.rowInView) bad = true;
  console.log(bad ? "FAIL" : "PASS");
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
