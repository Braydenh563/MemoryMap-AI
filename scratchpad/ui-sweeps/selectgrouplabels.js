// INBOX 273 (2): the shared `enhanceSelect` opener built its menu from
// `select.options`, which flattens every `<optgroup>`, so a grouped select's
// group name never reached the reader. Builds a synthetic grouped select in
// the live app (so `enhanceSelect`, `openActionMenu` and friends are the
// real ones), opens it, and measures what actually got drawn: group label
// rows present with the right text, in the right order, and the real
// options untouched (still `[role="option"]`, still clickable).
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const result = await page.evaluate(() => {
    const select = document.createElement("select");
    select.id = "probe-grouped-select";
    select.setAttribute("aria-label", "Probe grouped select");
    const mk = (tag, props) => Object.assign(document.createElement(tag), props);
    const g1 = mk("optgroup", { label: "Mind maps" });
    g1.appendChild(mk("option", { value: "m1", textContent: "Mind map · Roadmap" }));
    g1.appendChild(mk("option", { value: "m2", textContent: "Mind map · Ideas" }));
    const bare = mk("option", { value: "b1", textContent: "Default board" });
    const g2 = mk("optgroup", { label: "Whiteboards" });
    g2.appendChild(mk("option", { value: "w1", textContent: "Board · Sprint" }));
    const hiddenOpt = mk("option", { value: "w2", textContent: "Board · Hidden one" });
    hiddenOpt.hidden = true;
    g2.appendChild(hiddenOpt);
    select.append(g1, bare, g2);
    document.body.appendChild(select);
    enhanceSelect(select);
    const opener = select.closest(".select-shell").querySelector(".select-opener");
    opener.click();
    const menu = select.closest(".select-shell").querySelector(".select-menu");
    const rows = [...menu.children].map((el) => ({
      tag: el.tagName.toLowerCase(),
      cls: el.className,
      role: el.getAttribute("role"),
      text: el.textContent.trim(),
    }));
    const optionCount = menu.querySelectorAll("[role='option']").length;
    const labelCount = menu.querySelectorAll(".select-group-label").length;
    // Clicking a real option still works with groups present.
    menu.querySelector('[role="option"][data-value="w1"]').click();
    const valueAfterClick = select.value;
    document.body.removeChild(select.closest(".select-shell"));
    return { rows, optionCount, labelCount, valueAfterClick };
  });
  console.log(JSON.stringify(result, null, 1));
  await browser.close();
})();
