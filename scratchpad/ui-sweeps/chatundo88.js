// BASE=http://127.0.0.1:8836 node chatundo88.js (Brief 88, CHAT_PLAN 8 row 5)
// chat88: chat writes the undo sweep cannot reach (a prefilled rename, Fork,
// a deleted message, the open chat's Delete): each done, Ctrl+Z, Ctrl+Shift+Z.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const api = (p) => page.evaluate((p) => apiJson(p), p);
  const ask = async (q) => {
    const n0 = await page.evaluate(() => document.querySelectorAll("#chat-messages .msg.assistant").length);
    await page.fill("#chat-input", q); await page.click("#chat-send");
    await page.waitForFunction((n) => { const a = document.querySelectorAll("#chat-messages .msg.assistant"); return a.length > n && !a[a.length - 1].classList.contains("is-generating"); }, n0, { timeout: 15000 });
    await page.waitForTimeout(600);
  };
  const answer = async (text) => {
    await page.waitForSelector(".prompt-overlay:not(.hidden) input, .confirm-overlay:not(.hidden) button, [role=alertdialog] button", { timeout: 4000 });
    await page.evaluate((text) => {
      const d = [...document.querySelectorAll('.confirm-overlay, .prompt-overlay, .dialog-overlay, [role="alertdialog"]')].find((x) => !x.classList.contains("hidden") && x.getBoundingClientRect().width > 0);
      const input = d.querySelector("input, textarea");
      if (input && text) { input.value = text; input.dispatchEvent(new Event("input", { bubbles: true })); }
      (d.querySelector(".danger, .primary, [data-confirm]") || [...d.querySelectorAll("button")].pop()).click();
    }, text);
    await page.waitForTimeout(900);
  };
  const keys = async (k) => { await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press(k); await page.waitForTimeout(1200); };
  const out = {};
  await page.evaluate(() => switchTab("chat")); await page.waitForTimeout(600);
  await page.evaluate(() => newChatConversation());
  await ask("notes about the harbor"); await ask("what did I agree with Sam");
  const id = await page.evaluate(() => chatConv.id);
  const conv = async () => { try { return await api(`/conversations/${id}`); } catch (e) { return null; } };
  const count = async () => { const r = await api("/conversations"); return (r.items || r).length; };
  // rename
  const t0 = (await conv()).title;
  await page.evaluate(() => { renameCurrentConversation(); }); await answer("Renamed by probe");
  const t1 = (await conv()).title; await keys("Control+z"); const t2 = (await conv()).title; await keys("Control+Shift+z"); const t3 = (await conv()).title;
  out.rename = { did: t1 !== t0, undone: t2 === t0, redone: t3 === t1, headAfterUndo: null };
  // fork
  const c0 = await count(); await page.click("#chat-fork"); await page.waitForTimeout(1500);
  const c1 = await count(); await keys("Control+z"); const c2 = await count(); await keys("Control+Shift+z"); const c3 = await count();
  out.fork = { did: c1 === c0 + 1, undone: c2 === c0, redone: c3 === c1 };
  // delete a message
  const m0 = JSON.stringify((await conv()).messages.map((m) => m.content));
  await page.evaluate(() => { const b = document.querySelectorAll("#chat-messages .msg.assistant"); deleteChatTurn(b[0]); }); await answer();
  const m1 = JSON.stringify((await conv()).messages.map((m) => m.content)); await keys("Control+z"); const m2 = JSON.stringify((await conv()).messages.map((m) => m.content));
  const shown = await page.evaluate(() => document.querySelectorAll("#chat-messages .msg.assistant").length);
  await keys("Control+Shift+z"); const m3 = JSON.stringify((await conv()).messages.map((m) => m.content));
  out.message = { did: m1 !== m0, undone: m2 === m0, redone: m3 === m1, bubblesAfterUndo: shown };
  // the open chat's Delete, from the head's menu
  await page.evaluate((id) => openConversation(id), id); await page.waitForTimeout(800);
  await page.click("#chat-actions-menu .menu-wrap > button"); await page.waitForTimeout(300);
  await page.getByRole("menuitem", { name: /Delete this chat/ }).click(); await answer();
  const d1 = await conv(); await keys("Control+z"); const d2 = await conv(); await keys("Control+Shift+z"); const d3 = await conv();
  out.deleteChat = { did: d1 === null, undone: !!d2, redone: d3 === null };
  console.log(JSON.stringify(out));
  await browser.close();
})();
