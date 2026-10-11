// A link row never underlines its icon (INBOX 803: "in the questions subtab
// and possibly elsewhere, the icons in the rows get underlined as well").
//
// Method: for each link shape that holds an icon, hover it, screenshot the
// icon's box, screenshot it again with every text decoration switched off,
// and compare the bytes. Different bytes mean the decoration reached the icon.
// The shapes are rebuilt with the app's own builders (`setLabel`, the same
// classes and ancestors) because the real ones need data (a question, an
// image) that a fresh data dir does not have.
//
//   BASE=http://127.0.0.1:8868 node scratchpad/ui-sweeps/linkicons.js
const { boot } = require('./lib');
const SHAPES = [
  // [name, html of the control, wrapper class chain]
  ['question-group-link', '<button type="button" class="question-group-link" data-i="1"></button>', 'ul>li.question-group', 'ph:note A note title'],
  ['library-read-open', '<button type="button" class="ghost small library-read-open" data-i="1"></button>', 'div.library-file-rows>div.library-image-tile', 'ph:scan Read this'],
  ['linklike-icon', '<button type="button" class="linklike" data-i="1"></button>', 'div', 'ph:question Where are my documents kept?'],
  ['link-button-icon', '<button type="button" class="link-button" data-i="1"></button>', 'div', 'ph:arrow-left Results'],
];
// CSSOM, not a <style>: the CSP refuses inline styles.
const noDecor = (page, on) => page.evaluate((on) => {
  for (const el of document.querySelectorAll('#li-host, #li-host *')) {
    if (on) el.style.setProperty('text-decoration', 'none', 'important');
    else el.style.removeProperty('text-decoration');
  }
}, on);
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  // The shapes live in lazy stylesheets (questions-lazy.css, library-lazy.css):
  // visit their surfaces first, or the rules under test are not loaded.
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(600);
  await page.click('#notes-subtabs [data-section="questions"], [role=tab][data-section="questions"]').catch(() => {});
  await page.waitForTimeout(1200);
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(600);
  let bad = 0;
  for (const [name, html, chain, label] of SHAPES) {
    await page.evaluate(({ html, chain, label }) => {
      document.getElementById('li-host')?.remove();
      const host = document.createElement('section');
      host.id = 'li-host'; host.className = 'card';
      host.style.cssText = 'position:fixed;left:40px;top:120px;z-index:9999;padding:24px;width:420px';
      let parent = host;
      for (const part of chain.split('>')) {
        const [tag, ...cls] = part.split('.');
        const el = document.createElement(tag); el.className = cls.join(' ');
        parent.append(el); parent = el;
      }
      parent.insertAdjacentHTML('beforeend', html);
      const btn = parent.querySelector('[data-i]');
      setLabel(btn, label);
      document.body.append(host);
    }, { html, chain, label });
    const btn = page.locator('#li-host [data-i]');
    // Settle the page's own transitions before any capture.
    await btn.hover(); await page.waitForTimeout(400);
    const box = await page.evaluate(() => {
      const i = document.querySelector('#li-host [data-i] .ph');
      const r = i.getBoundingClientRect();
      return { x: r.x, y: r.y - 2, width: r.width, height: r.height + 6 };
    });
    const a = await page.screenshot({ clip: box });
    await noDecor(page, true); await page.waitForTimeout(100);
    const b = await page.screenshot({ clip: box });
    const same = a.equals(b);
    if (!same) bad++;
    console.log(`${same ? 'ok  ' : 'FAIL'} ${name}: icon ${same ? 'is not' : 'IS'} underlined on hover`);
    await noDecor(page, false);
    // Rest state (the always-underlined shapes): move off and compare again.
    await page.mouse.move(700, 600); await page.waitForTimeout(300);
    const c = await page.screenshot({ clip: box });
    await noDecor(page, true); await page.waitForTimeout(100);
    const d = await page.screenshot({ clip: box });
    if (process.env.DUMP) { require('fs').writeFileSync(`${process.env.DUMP}/${name}-a.png`, c); require('fs').writeFileSync(`${process.env.DUMP}/${name}-b.png`, d); }
    const same2 = c.equals(d);
    if (!same2) bad++;
    console.log(`${same2 ? 'ok  ' : 'FAIL'} ${name}: icon ${same2 ? 'is not' : 'IS'} underlined at rest`);
    await noDecor(page, false);
  }
  console.log(bad ? `${bad} underlined icon state(s)` : 'no icon underlined');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
