// Settings navigation behaviour (INBOX 444): the nav's groups, a deep link that
// still names the old section, the in-section index (links, sticky, the one you
// are in marked), the setting search (results, jump, ring), and where focus
// lands. Exits 1 on any failed expectation.
//
//   BASE=http://127.0.0.1:8787 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/settingsnav.js
//   WIDTH=390 for the phone.
const { boot } = require('./lib.js');
const W = Number(process.env.WIDTH || 1440);
let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
  if (!ok) failed += 1;
};
(async () => {
  const phone = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });

  // 1. A link that names the old section still lands on the control.
  await page.evaluate(() => openSettingsModal('general', 'search-relevance-group'));
  await page.waitForTimeout(1200);
  check('deep link resolves to the section that holds the control',
    await page.evaluate(() => currentSettingsSection === 'searchindex' && !!document.getElementById('search-relevance-group').getClientRects().length));

  // 2. The index in Models.
  await page.evaluate(() => openSettingsModal('models'));
  await page.waitForTimeout(1500);
  const idx = await page.evaluate(() => {
    const nav = document.querySelector('#settings-models .settings-index');
    if (!nav) return null;
    const links = [...nav.querySelectorAll('.settings-index-link')];
    return { n: links.length, labels: links.map((l) => l.textContent), sticky: getComputedStyle(nav).position, current: links.filter((l) => l.getAttribute('aria-current') === 'location').length };
  });
  check('Models has an index with a link per group head', !!idx && idx.n >= 6, idx);
  if (idx) {
    await page.evaluate(() => {
      const links = [...document.querySelectorAll('#settings-models .settings-index .settings-index-link')];
      links[links.length - 1].click();
    });
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => {
      // Since INBOX 599 the strip is in the pane's dock, and the dock sticks.
      const nav = document.querySelector('#settings-models .settings-index').closest('.dock') || document.querySelector('#settings-models .settings-index');
      const scroller = document.querySelector('#settings-modal .modal-content');
      const links = [...nav.querySelectorAll('.settings-index-link')];
      const cur = links.find((l) => l.getAttribute('aria-current') === 'location');
      const head = links[links.length - 1]._head;
      return {
        scrollTop: scroller.scrollTop,
        stuck: Math.abs(nav.getBoundingClientRect().top - scroller.getBoundingClientRect().top) < 2,
        current: cur && cur.textContent,
        last: links[links.length - 1].textContent,
        headBelowStrip: head.getBoundingClientRect().top >= nav.getBoundingClientRect().bottom - 1,
        focusOnHead: document.activeElement === head,
      };
    });
    check('a press scrolls the pane, the strip stays at the top, the head is clear of it, focus lands on it',
      after.scrollTop > 200 && after.stuck && after.headBelowStrip && after.focusOnHead, after);
    check('the link you are in is marked', after.current === after.last, after);
  }

  // 3. The setting search.
  await page.fill('#settings-search', 'similarity');
  await page.waitForTimeout(500);
  const res = await page.evaluate(() => ({
    n: document.querySelectorAll('#settings-results .settings-result').length,
    first: document.querySelector('#settings-results .settings-result')?.textContent,
    count: document.getElementById('settings-search-count').textContent,
  }));
  check('searching a word lists the settings, not only sections', res.n >= 1 && /similarity/i.test(res.first || ''), res);
  await page.click('#settings-results .settings-result');
  await page.waitForTimeout(900);
  const jumped = await page.evaluate(() => ({
    section: currentSettingsSection,
    ringed: !!document.querySelector('#settings-searchindex .feature-reveal, #settings-searchindex .flash-target.flash'),
    focused: document.activeElement && document.activeElement.id,
  }));
  check('a result opens its section and lands on the field', jumped.section === 'searchindex' && jumped.focused === 'pref-search-min-sim', jumped);
  await page.fill('#settings-search', '');

  // 4. Focus after a switch: Enter hands it to the heading, arrows keep it in the list.
  await page.focus('#settings-nav [data-section="tools"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check('Enter on a nav entry lands focus on the section heading',
    await page.evaluate(() => document.activeElement?.tagName === 'H3' && !!document.activeElement.closest('#settings-tools')));
  await page.focus('#settings-nav [data-section="tools"]');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  check('an arrow key walks the list and keeps the focus in it',
    await page.evaluate(() => currentSettingsSection === 'memory' && document.activeElement?.dataset.section === 'memory'));
  const cur = await page.evaluate(() => [...document.querySelectorAll('#settings-nav [aria-current="page"]')].map((b) => b.dataset.section));
  check('exactly one nav entry is aria-current=page', cur.length === 1 && cur[0] === 'memory', cur);

  // 5. A short section has no index.
  await page.evaluate(() => openSettingsModal('templates'));
  await page.waitForTimeout(900);
  check('a short section has no index', await page.evaluate(() => !document.querySelector('#settings-templates > .settings-index')));

  await browser.close();
  process.exit(failed ? 1 : 0);
})();
