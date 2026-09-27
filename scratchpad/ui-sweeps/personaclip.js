// The owner: "in Settings > Personas, the Atlas avatar spills outside its
// black circle". Opens Settings on Personas and on Preferences (the
// profile face) and reads, for each round holder's face, whether it is
// clipped to its circle. Exits 1 on any face unclipped.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const rows = [];
  for (const section of ['personas', 'preferences']) {
    await page.evaluate((s) => openSettingsModal(s), section);
    await page.waitForTimeout(1500);
    rows.push(...await page.evaluate((s) => [...document.querySelectorAll('.persona-mark, .profile-mark')]
      .filter((h) => h.getBoundingClientRect().width && h.firstElementChild)
      .map((h) => ({ section: s, holder: String(h.className), face: String(h.firstElementChild.className?.baseVal ?? h.firstElementChild.className).slice(0, 30), clip: getComputedStyle(h.firstElementChild).clipPath })), section));
  }
  console.log(JSON.stringify(rows));
  await browser.close();
  process.exit(!rows.length || rows.some((r) => !r.clip.startsWith('circle')) ? 1 : 0);
})();
