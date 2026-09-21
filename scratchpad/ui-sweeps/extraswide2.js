// Follow-up to extraswide.js: measures the embedding-models row's own
// `.entry-actions` right edge against the section frame at 820px, the exact
// shape INBOX 273 named (right edge 769 against a 765 frame), rather than
// the section's overall scrollWidth (which extraswide.js found equal to its
// clientWidth on this data dir -- the extras list's installed/not-installed
// state, and so each row's button text, differs per environment).
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 820, height: 1000 } });
  await page.evaluate(async () => { await openSettingsModal("extras"); });
  await page.waitForTimeout(1800);
  const found = await page.evaluate(() => {
    const section = document.getElementById("settings-extras") ||
      document.getElementById("extras-list")?.closest("section, .settings-section");
    const frame = section ? section.getBoundingClientRect() : null;
    const rows = [...document.querySelectorAll("#extras-list > li")];
    const details = rows.map((li) => {
      const actions = li.querySelector(".entry-actions");
      const meta = li.querySelector(".entry-meta");
      const title = li.querySelector(".entry-title");
      return {
        text: li.textContent.trim().slice(0, 40),
        liRight: Math.round(li.getBoundingClientRect().right),
        actionsRight: actions ? Math.round(actions.getBoundingClientRect().right) : null,
        actionsW: actions ? Math.round(actions.getBoundingClientRect().width) : null,
        metaScrollW: meta ? Math.round(meta.scrollWidth) : null,
        metaClientW: meta ? Math.round(meta.clientWidth) : null,
        titleW: title ? Math.round(title.getBoundingClientRect().width) : null,
      };
    });
    return {
      frame: frame ? { left: Math.round(frame.left), right: Math.round(frame.right), w: Math.round(frame.width) } : null,
      rows: details,
    };
  });
  console.log(JSON.stringify(found, null, 1));
  await browser.close();
})();
