// The three doors that say "tour" and the one that says "welcome", and
// whether each opens what its words promise.
//
// UI Phase 11 / INBOX-adjacent: the Dashboard's "Take the tour" tile ran
// `openOnboarding()` (the welcome card, five slides), and Settings, about's
// "Take tour again" ran the same. The welcome card is a different thing from
// the guided tour: the card says what MemoryMap is, the tour points at real
// controls. A button whose words name one and whose press opens the other
// teaches that the tour is a slideshow.
//
//   BASE=http://127.0.0.1:8994 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules node scratchpad/ui-sweeps/tourtile.js
const { boot } = require('./lib.js');

const findings = [];
const check = (ok, what) => { if (!ok) findings.push(what); return ok; };

// What is on screen right now: the welcome card, the tour, or neither.
const whatOpened = (page) => page.evaluate(() => {
  const vis = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
  };
  return { welcome: vis('onboarding-overlay'), tour: vis('tour-card') };
});

const closeAll = async (page) => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    for (const id of ['onboarding-overlay', 'tour-card', 'tour-block', 'tour-spot']) {
      document.getElementById(id)?.classList.add('hidden');
    }
    if (typeof closeSettingsModal === 'function') closeSettingsModal();
  });
  await page.waitForTimeout(300);
};

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(1500);

  // 1. The Dashboard's "Take the tour" tile.
  //
  // The getting-started card is only drawn on an *empty* notebook, and this
  // sweep shares its server with every other one in the gate list, which
  // leave notes behind. So when the card is not on screen the probe asks
  // dashboard.js for the real one (`gettingStartedCard`, the same builder the
  // dashboard calls) and presses the tile in it: same markup, same handler,
  // which is what this is about. Binning every note to get the empty state
  // would take the next sweep's fixtures with it.
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(1500);
  const drawn = await page.evaluate(() => {
    if (document.querySelector('.dash-getting-started')) return 'on screen';
    // It returns `{card, mount}`, the dashboard's own two-step shape: the
    // emblem is drawn after the card is in the document.
    const { card, mount } = gettingStartedCard();
    card.id = 'tourtile-probe-card';
    document.getElementById('dash-grid').appendChild(card);
    mount?.();
    return 'built for the probe';
  });
  console.log('getting-started card', drawn);
  const tile = await page.evaluateHandle(() => [...document.querySelectorAll('.start-step')]
    .find((b) => /take the tour/i.test(b.textContent || '')));
  const tileFound = await tile.evaluate((el) => !!el);
  check(tileFound, 'no "Take the tour" tile on the dashboard');
  if (tileFound) {
    await tile.asElement().click();
    await page.waitForTimeout(1200);
    const opened = await whatOpened(page);
    console.log('dashboard tile ->', JSON.stringify(opened));
    check(opened.tour, 'the dashboard\'s "Take the tour" tile did not open the tour');
    check(!opened.welcome, 'the dashboard\'s "Take the tour" tile opened the welcome card');
    await closeAll(page);
  }

  // 2. Settings, about: "Take tour again".
  await page.evaluate(() => openSettingsModal('about'));
  await page.waitForTimeout(1200);
  await page.click('#about-take-tour');
  await page.waitForTimeout(1200);
  const aboutOpened = await whatOpened(page);
  console.log('about-take-tour ->', JSON.stringify(aboutOpened));
  check(aboutOpened.tour, '"Take tour again" in about did not open the tour');
  check(!aboutOpened.welcome, '"Take tour again" in about opened the welcome card');
  await closeAll(page);

  // 3. Settings, help and guide: "Replay welcome tour" is the welcome card,
  //    which is the one door whose words do name the card.
  await page.evaluate(() => openSettingsModal('help'));
  await page.waitForTimeout(1200);
  await page.click('#show-guide-btn');
  await page.waitForTimeout(1200);
  const helpOpened = await whatOpened(page);
  console.log('show-guide-btn ->', JSON.stringify(helpOpened));
  check(helpOpened.welcome, '"Replay welcome tour" did not open the welcome card');
  await closeAll(page);

  // 4. And the tour's own strip is still in help and guide.
  await page.evaluate(() => openSettingsModal('help'));
  await page.waitForTimeout(1200);
  const replay = await page.evaluate(() => [...document.querySelectorAll('#tour-replay-buttons button')].map((b) => b.textContent.trim()));
  console.log('tour-replay-buttons ->', JSON.stringify(replay));
  check(replay.length >= 2 && replay[0] === 'Start the tour', 'the tour replay strip is not in help and guide: ' + JSON.stringify(replay));

  if (errors.length) findings.push('page errors: ' + errors.join(' | '));
  console.log(findings.length ? 'FAIL: ' + findings.join('\n  ') : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
