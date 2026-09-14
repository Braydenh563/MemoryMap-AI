const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  // Slow the help route so the busy state is observable, then stop it.
  await page.route("**/help/ask", async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: "one two three four five six seven eight nine ten eleven twelve" }) }); });
  await page.evaluate(() => openHelpChat());
  await page.waitForTimeout(600);
  await page.evaluate(() => { const i = document.getElementById("help-chat-input"); i.value = "how do I stop?"; document.getElementById("help-chat-form").requestSubmit(); });
  await page.waitForTimeout(400);
  const busy = await page.evaluate(() => { const b = document.getElementById("help-chat-send"); return { title: b.title, type: b.type, icon: b.querySelector("i").className, disabled: b.disabled }; });
  await page.evaluate(() => document.getElementById("help-chat-send").click());
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => { const b = document.getElementById("help-chat-send"); const rows = [...document.querySelectorAll("#help-chat-messages .help-chat-msg")]; const item = document.querySelector("#help-chat-menu [role=menuitem], #help-chat-menu button.menu-item, #help-chat-menu button"); return { title: b.title, type: b.type, last: rows.at(-1)?.textContent.trim().slice(0, 40), busy: typeof helpChatBusy !== "undefined" ? helpChatBusy : null, newChatDisabled: item ? item.disabled || item.getAttribute("aria-disabled") : "no item" }; });
  console.log(JSON.stringify({ busy, after }));
  await browser.close();
})();
