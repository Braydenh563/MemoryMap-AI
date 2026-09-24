// Settings > Profile & preferences, measured (the local profile).
//
//   BASE=http://127.0.0.1:8796 node scratchpad/ui-sweeps/profile.js
//   THEME=dark BASE=... node scratchpad/ui-sweeps/profile.js
//
// At 1440 and 390: the nav order (the profile right after the first section),
// the profile head (mark, name, one line), no horizontal overflow in the
// section or the page, the mark redrawn as the name is typed, the About me
// count, the Settings head's mark and its way into the profile, and the chat
// bubble's mark following a saved rename.
const { boot } = require('./lib');

(async () => {
  let failed = 0;
  const check = (ok, what, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? `  ${detail}` : ''}`);
    if (!ok) failed += 1;
  };
  for (const width of [1440, 390]) {
    const { browser, page } = await boot({ viewport: { width, height: 900 } });
    console.log(`--- ${width} ${process.env.THEME || 'light'}`);
    await page.evaluate(() => openSettingsModal('preferences'));
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const nav = [...document.querySelectorAll('#settings-nav button[data-section]')].map((b) => b.dataset.section);
      const sec = document.getElementById('settings-preferences');
      const head = sec.querySelector('.profile-head');
      const mark = document.getElementById('profile-avatar');
      const svg = mark && mark.querySelector('svg');
      const hb = head.getBoundingClientRect();
      const sb = sec.getBoundingClientRect();
      const btn = document.getElementById('settings-profile-btn');
      const guide = document.getElementById('settings-guide-btn');
      const rect = (el) => el && el.getBoundingClientRect();
      return {
        nav: nav.slice(0, 3),
        hidden: sec.classList.contains('hidden'),
        markSize: svg ? [svg.getBoundingClientRect().width, svg.getBoundingClientRect().height] : null,
        headInside: hb.left >= sb.left - 0.5 && hb.right <= sb.right + 0.5,
        secOverflow: sec.scrollWidth - sec.clientWidth,
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        headName: document.getElementById('profile-head-name').textContent,
        headNameColor: getComputedStyle(document.getElementById('profile-head-name')).color,
        count: document.getElementById('pref-profile-count').textContent,
        btnMark: !!(btn && btn.querySelector('svg.name-mark')),
        btnH: rect(btn) && Math.round(rect(btn).height),
        guideH: rect(guide) && Math.round(rect(guide).height),
        btnVisible: !!(btn && btn.offsetParent),
        textareaMax: document.getElementById('pref-profile').maxLength,
      };
    });
    check(m.nav[0] === 'models' && m.nav[1] === 'preferences', 'profile sits right after the first section', m.nav.join(','));
    check(!m.hidden, 'the section is on screen');
    check(m.markSize && m.markSize[0] === 56 && m.markSize[1] === 56, 'profile head mark is 56px', JSON.stringify(m.markSize));
    check(m.headInside, 'profile head stays inside the section');
    check(m.secOverflow <= 0, 'section has no horizontal overflow', String(m.secOverflow));
    check(m.pageOverflow <= 0, 'page has no horizontal overflow', String(m.pageOverflow));
    check(m.headName === 'Your profile', 'head says Your profile with no name', m.headName);
    check(/^0 of 600 characters\.$/.test(m.count), 'About me count', m.count);
    check(m.textareaMax === 600, 'About me stops at 600');
    check(m.btnMark && m.btnVisible, 'Settings head carries the mark');
    check(m.btnH === m.guideH, 'Settings head button is the guide button\'s height', `${m.btnH} vs ${m.guideH}`);
    console.log(`     head name colour ${m.headNameColor}`);

    // Typing previews; saving paints everywhere.
    const before = await page.evaluate(() => document.getElementById('profile-avatar').innerHTML);
    await page.fill('#pref-display-name', 'Depressed wizard');
    await page.waitForTimeout(100);
    const typed = await page.evaluate(() => ({
      mark: document.getElementById('profile-avatar').innerHTML,
      head: document.getElementById('profile-head-name').textContent,
      btn: document.querySelector('#settings-profile-btn svg') && document.querySelector('#settings-profile-btn').innerHTML,
    }));
    check(typed.mark !== before, 'the mark redraws as the name is typed');
    check(typed.head === 'Depressed wizard', 'the head previews the typed name', typed.head);
    await page.fill('#pref-profile', 'I teach maths.');
    const count = await page.textContent('#pref-profile-count');
    check(count === '14 of 600 characters.', 'the count follows the text', count);
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(700);
    const saved = await page.evaluate(() => {
      const one = (sel) => { const el = document.querySelector(sel); return el && el.innerHTML; };
      return { btn: one('#settings-profile-btn [data-user-mark]'), avatarHead: one('#profile-avatar') };
    });
    check(saved.btn && saved.btn !== typed.btn, 'the Settings head repaints after the save');
    // Long name: wraps inside, no overflow.
    await page.fill('#pref-display-name', 'Bartholomew Maximilian Featherstonehaugh-Worthington');
    await page.waitForTimeout(100);
    const longName = await page.evaluate(() => {
      const sec = document.getElementById('settings-preferences');
      return { sec: sec.scrollWidth - sec.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check(longName.sec <= 0 && longName.page <= 0, 'a long name does not overflow', JSON.stringify(longName));
    // The head button opens the profile from another pane.
    await page.evaluate(() => showSettingsSection('models'));
    await page.click('#settings-profile-btn');
    await page.waitForTimeout(200);
    const open = await page.evaluate(() => !document.getElementById('settings-preferences').classList.contains('hidden'));
    check(open, 'the Settings head mark opens the profile');
    // Reset the name so the next width starts clean.
    await page.fill('#pref-display-name', '');
    await page.fill('#pref-profile', '');
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);
    await browser.close();
  }
  console.log(failed ? `${failed} failed` : 'all ok');
  process.exit(failed ? 1 : 0);
})();
