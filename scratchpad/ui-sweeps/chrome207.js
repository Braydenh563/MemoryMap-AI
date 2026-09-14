// INBOX 207: both slots open their panels, at 1440 and at 390, and the phone
// More sheet still lists both.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({});
  const opens = async () => await page.evaluate(() => {
    const palette = document.getElementById('command-palette-overlay');
    const sheet = document.querySelector('.sheet-overlay[data-sheet="help-chat"], .sheet-overlay');
    return {
      palette: palette ? !palette.classList.contains('hidden') : null,
      sheet: sheet ? sheet.getAttribute('aria-label') : null,
    };
  });

  await page.click('#status-agent');
  await page.waitForTimeout(500);
  console.log('207 agent slot opens:', JSON.stringify(await opens()));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  await page.click('#status-guide');
  await page.waitForTimeout(700);
  console.log('207 guide slot opens:', JSON.stringify(await opens()));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  const phone = await page.evaluate(() => {
    const bar = document.getElementById('status-bar');
    const header = document.querySelector('header');
    const rect = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), vis: el.offsetParent !== null };
    };
    return {
      pageScroll: document.documentElement.scrollWidth,
      pageClient: document.documentElement.clientWidth,
      headerOverflow: header.scrollWidth - header.clientWidth,
      barOverflow: bar.scrollWidth - bar.clientWidth,
      agent: rect('status-agent'),
      guide: rect('status-guide'),
    };
  });
  console.log('207 at 390:', JSON.stringify(phone));

  await page.click('#phone-more-btn');
  await page.waitForTimeout(500);
  const sheetRows = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.sheet-overlay .sheet-row')];
    return {
      rows: rows.map((r) => r.textContent.trim()),
      heights: rows.map((r) => Math.round(r.getBoundingClientRect().height)),
    };
  });
  console.log('207 more sheet:', JSON.stringify(sheetRows));
  await browser.close();
})();
