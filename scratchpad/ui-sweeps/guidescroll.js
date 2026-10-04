// The Guide panel's transcript is the element that scrolls (featuremodels.md,
// "The guide panel's transcript does not scroll itself": `#help-chat-messages`
// stayed at scrollTop 0 while its scrollHeight grew, so `keepAtBottom` wrote
// to an element that was not the scroller). Opens the Guide, appends enough
// messages to overflow, calls `keepAtBottom` the way `helpChatStreamTurn` does
// and reads which element moved. Reports a list that did not overflow as not
// measured, not as a pass.
//
//   BASE=http://127.0.0.1:8799 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node guidescroll.js
const { boot } = require("./lib.js");

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  let failed = 0;
  const ok = (name, pass, detail) => { if (!pass) failed++; console.log(`${pass ? "PASS" : "FAIL"}  ${name}  ${detail || ""}`); };
  await page.evaluate(() => openHelpChat());
  await page.waitForTimeout(700);
  const read = await page.evaluate(() => {
    const list = document.getElementById("help-chat-messages");
    for (let i = 0; i < 40; i++) {
      const row = document.createElement("div");
      row.className = "help-chat-msg is-assistant";
      row.textContent = `Line ${i}: a long enough answer to need room, ${"word ".repeat(12)}`;
      list.appendChild(row);
    }
    keepAtBottom(list);
    const card = list.closest(".sheet-card, .sheet-card-corner") || list.parentElement;
    return {
      overflows: list.scrollHeight > list.clientHeight + 1,
      listTop: Math.round(list.scrollTop),
      listGap: Math.round(list.scrollHeight - list.clientHeight - list.scrollTop),
      overflowY: getComputedStyle(list).overflowY,
      cardTop: Math.round(card.scrollTop),
      cardScrolls: card.scrollHeight > card.clientHeight + 1,
    };
  });
  ok("the transcript overflows its box (otherwise this measured nothing)", read.overflows, JSON.stringify(read));
  ok("keepAtBottom moved the transcript itself to its end", read.listTop > 0 && read.listGap <= 1, `scrollTop ${read.listTop}, ${read.listGap}px short of the end`);
  ok("and the card around it did not become the scroller", !read.cardScrolls, `card scrolls: ${read.cardScrolls}, its scrollTop ${read.cardTop}`);
  console.log(failed ? `${failed} failed` : "all passed");
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
