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

  // 2. The index in Tools it can use (the owner's screenshot): the pane's groups nested under it in the sidebar
  // (INBOX 622), or, on a phone, the jump list's options under the pane.
  await page.evaluate(() => openSettingsModal('tools'));
  await page.waitForTimeout(1500);
  const idx = await page.evaluate(() => {
    const list = document.querySelector('#settings-nav .settings-nav-groups');
    const links = list ? [...list.querySelectorAll('.settings-nav-group')] : [];
    const groups = [...document.querySelectorAll('#settings-jump option[data-group]')];
    return {
      strip: document.querySelectorAll('#settings-modal .settings-index').length,
      under: !!list && list.previousElementSibling?.dataset.section === 'tools',
      n: links.length, jump: groups.length,
      labels: links.map((l) => l.textContent),
      current: links.filter((l) => l.getAttribute('aria-current') === 'location').length,
    };
  });
  check('no strip in the pane; Tools lists its groups under its sidebar link', idx.strip === 0 && idx.under && idx.n >= 3 && idx.n === idx.jump, idx);
  if (idx.n) {
    await page.evaluate((phone) => {
      if (phone) {
        const jump = document.getElementById('settings-jump');
        const opts = [...jump.querySelectorAll('option[data-group]')];
        jump.value = opts[opts.length - 1].value;
        jump.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        const links = [...document.querySelectorAll('#settings-nav .settings-nav-group')];
        links[links.length - 1].click();
      }
    }, phone);
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => {
      const dock = document.querySelector('#settings-tools > .dock');
      const scroller = document.querySelector('#settings-modal .modal-content');
      const links = [...document.querySelectorAll('#settings-nav .settings-nav-group')];
      const cur = links.find((l) => l.getAttribute('aria-current') === 'location');
      const head = links[links.length - 1]._head;
      return {
        scrollTop: scroller.scrollTop,
        stuck: Math.abs(dock.getBoundingClientRect().top - scroller.getBoundingClientRect().top) < 2,
        current: cur && cur.textContent,
        last: links[links.length - 1].textContent,
        headBelowDock: head.getBoundingClientRect().top >= dock.getBoundingClientRect().bottom - 1,
        focusOnHead: document.activeElement === head,
        jumpValue: document.getElementById('settings-jump')?.value,
      };
    });
    check('a press scrolls the pane, the dock stays at the top, the head is clear of it, focus lands on it',
      after.scrollTop > 200 && after.stuck && after.headBelowDock && after.focusOnHead, after);
    check('the group you are in is marked (and the jump list follows)', after.current === after.last && /^tools#\d+$/.test(after.jumpValue || ''), after);
    // Scrolled back to the top by hand, the first group is the marked one.
    await page.evaluate(() => { const s = document.querySelector('#settings-modal .modal-content'); s.dispatchEvent(new WheelEvent('wheel')); s.scrollTop = 0; });
    await page.waitForTimeout(400);
    const top = await page.evaluate(() => document.querySelector('#settings-nav .settings-nav-group[aria-current="location"]')?.textContent);
    check('scrolling tracks the group', top === idx.labels[0], { top, first: idx.labels[0] });
  }

  // 2b. No element in Settings scrolls sideways, in any pane (INBOX 622).
  const sideways = [];
  for (const name of await page.evaluate(() => [...document.querySelectorAll('#settings-nav button[data-section]')].map((b) => b.dataset.section))) {
    await page.evaluate((n) => openSettingsModal(n), name);
    await page.waitForTimeout(500);
    const found = await page.evaluate(() => [...document.querySelectorAll('#settings-modal *')].filter((el) => {
      if (!el.getClientRects().length) return false;
      const ox = getComputedStyle(el).overflowX;
      return (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1;
    }).map((el) => (el.id ? '#' + el.id : '.' + [...el.classList].slice(0, 2).join('.')) + ` ${el.scrollWidth}/${el.clientWidth}`));
    for (const f of found) sideways.push(`${name}: ${f}`);
  }
  check('nothing in Settings scrolls sideways', sideways.length === 0, sideways.slice(0, 8));

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
  //    Below 640px the sidebar buttons are hidden behind the section picker
  //    (`#settings-jump`'s sibling), so there is nothing to focus: skipped, not failed.
  if (W < 640) {
    console.log('skip the three sidebar-button keyboard checks below 640px (the buttons are hidden behind the picker)');
  } else {
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
  }

  // 5. A short section has no index.
  await page.evaluate(() => openSettingsModal('templates'));
  await page.waitForTimeout(900);
  check('a short section has no index', await page.evaluate(() => !document.querySelector('#settings-templates > .settings-index')));

  await browser.close();
  process.exit(failed ? 1 : 0);
})();
