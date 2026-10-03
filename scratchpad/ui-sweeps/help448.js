// INBOX 448 (1): Settings, Help lists every help topic, and the Settings
// search finds a topic by the words a person types. For each phrase: type it
// into #settings-search, read the results list, press the help topic's row,
// and measure that its `details` is open and on screen in the Help pane.
//
//   BASE=http://127.0.0.1:8816 node scratchpad/ui-sweeps/help448.js
const { boot, BASE } = require('./lib');

const PHRASES = [
  ['percentage', 'filing'],
  ['bookmarks', 'bookmarks'],
  ['alt+n', 'quick-note'],
  ['hashtag', 'tags-categories'],
  ['screen reader', 'accessibility'],
  ['suggested downloads', 'model-downloads'],
];

(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '/#/settings/help', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const listed = await page.evaluate(() => ({
    groups: document.querySelectorAll('#help-topics > h3').length,
    topics: document.querySelectorAll('#help-topics details').length,
    index: [...document.querySelectorAll('#settings-help .settings-index-link')].map((l) => l.textContent),
    busy: document.getElementById('help-topics')?.getAttribute('aria-busy'),
  }));
  console.log('listed', JSON.stringify(listed));
  for (const [phrase, id] of PHRASES) {
    await page.fill('#settings-search', '');
    await page.fill('#settings-search', phrase);
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('#settings-results .settings-result')].map((b) => b.textContent.trim())
    );
    const at = await page.evaluate((topicId) => {
      const buttons = [...document.querySelectorAll('#settings-results .settings-result')];
      const title = document.querySelector(`#help-topics details[data-topic="${topicId}"] > summary`)?.textContent;
      return buttons.findIndex((b) => b.querySelector('.settings-result-name')?.textContent === title);
    }, id);
    let opened = null;
    if (at >= 0) {
      await page.locator('#settings-results .settings-result').nth(at).click();
      await page.waitForTimeout(700);
      opened = await page.evaluate((topicId) => {
        const d = document.querySelector(`#help-topics details[data-topic="${topicId}"]`);
        const r = d.getBoundingClientRect();
        const pane = document.getElementById('settings-help');
        return { open: d.open, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, paneShown: !pane.classList.contains('hidden') };
      }, id);
    }
    console.log(JSON.stringify({ phrase, id, rows: rows.length, rank: at, opened, first: rows.slice(0, 3) }));
  }
  //: The group heads match a section-level head elsewhere in Settings.
  console.log('heads', JSON.stringify(await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      return [c.fontSize, c.fontWeight, c.textTransform, c.letterSpacing, c.marginTop, c.marginBottom, c.paddingLeft, c.color];
    };
    const acc = [...document.querySelectorAll('#help-topics .help-accordion')];
    const heads = [...document.querySelectorAll('#help-topics > h3')];
    return {
      section: pick(document.querySelector('#settings-modal .settings-section > h3')),
      group: pick(heads[1]),
      gapAbove: Math.round(heads[1].getBoundingClientRect().top - acc[0].getBoundingClientRect().bottom),
      gapBelow: Math.round(acc[1].getBoundingClientRect().top - heads[1].getBoundingClientRect().bottom),
    };
  })));
  //: A plain setting word still lists the settings first.
  for (const q of ['theme', 'password']) {
    await page.fill('#settings-search', q);
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#settings-results .settings-result')].map((b) => b.textContent.trim().slice(0, 48)));
    console.log(q, JSON.stringify(rows.slice(0, 5)));
  }
  //: A topic's link goes where it says: a section stays in Settings, a tab
  //: closes Settings and opens the tab.
  await page.fill('#settings-search', '');
  await page.evaluate(() => { document.querySelector('#help-topics details[data-topic="model-downloads"]').open = true; });
  await page.click('#help-topics details[data-topic="model-downloads"] .help-topic-links button');
  await page.waitForTimeout(600);
  console.log('section link', await page.evaluate(() => currentSettingsSection));
  await page.goto(BASE + '/#/settings/help', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { document.querySelector('#help-topics details[data-topic="bookmarks"]').open = true; });
  await page.click('#help-topics details[data-topic="bookmarks"] .help-topic-links button');
  await page.waitForTimeout(900);
  console.log('tab link', JSON.stringify(await page.evaluate(() => ({
    settingsHidden: document.getElementById('settings-modal').classList.contains('hidden'),
    tab: localStorage.getItem('activeTab'),
  }))));
  console.log('pageerrors', errors.length, errors.slice(0, 3));
  await browser.close();
  //: The page at a phone's width: no sideways scroll, the group head's type.
  const phone = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await phone.page.goto(BASE + '/#/settings/help', { waitUntil: 'domcontentloaded' });
  await phone.page.waitForTimeout(2500);
  console.log('phone', JSON.stringify(await phone.page.evaluate(() => {
    const pane = document.getElementById('settings-help');
    const d = pane.querySelector('#help-topics details');
    if (!d) return { topics: 0 };
    d.open = true;
    const h = getComputedStyle(pane.querySelector('#help-topics > h3'));
    const acc = pane.querySelector('#help-topics .help-accordion').getBoundingClientRect();
    return { docW: document.documentElement.scrollWidth, vw: innerWidth, accL: Math.round(acc.left), accR: Math.round(acc.right),
      h3: [h.fontSize, h.marginTop, h.marginBottom], summary: Math.round(d.querySelector('summary').getBoundingClientRect().height),
      link: d.querySelector('.help-topic-links button')?.textContent };
  })));
  await phone.browser.close();
})();
