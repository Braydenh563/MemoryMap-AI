// BACKLOG "Start of the next PR": Packages, Live captions is shown like llama.cpp
// (disabled, with what is left), not as a row with no install control.
//   BASE=http://127.0.0.1:8786 W=1440 node ui1017-extras.js
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.waitForTimeout(3000);
  await page.evaluate(() => openSettingsModal('extras'));
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#settings-extras li, #settings-extras .extra-row, #settings-extras .extra-card')];
    const pick = (re) => rows.filter((r) => re.test(r.textContent)).map((r) => ({
      cls: r.className.slice(0, 40),
      text: r.innerText.replace(/\s+/g, ' ').slice(0, 260),
      buttons: [...r.querySelectorAll('button')].map((b) => [b.textContent.trim().slice(0, 30), b.disabled, b.getAttribute('aria-disabled')]),
      h: Math.round(r.getBoundingClientRect().height),
    }));
    return { rows: rows.length, captions: pick(/Live captions/).slice(0, 2), llama: pick(/llama-cpp-python/).slice(0, 2) };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
