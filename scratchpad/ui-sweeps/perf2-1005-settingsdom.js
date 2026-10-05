// perf2-1005 (audit FE-10): how much of the boot's DOM is the Settings
// window, closed, before and after unlock.
//   BASE=http://127.0.0.1:8859 node perf2-1005-settingsdom.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const out = await page.evaluate(() => {
    const all = document.getElementsByTagName("*").length;
    const modal = document.getElementById("settings-modal");
    const inModal = modal ? modal.getElementsByTagName("*").length : 0;
    const sections = modal ? modal.querySelectorAll(".settings-section").length : 0;
    const inSections = modal ? [...modal.querySelectorAll(".settings-section")].reduce((n, s) => n + s.getElementsByTagName("*").length + 1, 0) : 0;
    const templates = modal ? modal.querySelectorAll("template").length : 0;
    return { all, inModal, sections, inSections, templates, open: modal && !modal.classList.contains("hidden") };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
