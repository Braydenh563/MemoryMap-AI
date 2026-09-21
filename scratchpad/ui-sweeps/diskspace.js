// What the app says when the disk it writes to is filling up (INBOX 266, item 6).
//
// Two things a test in `tests/` cannot see, because neither is in the DOM the
// server renders:
//
//   1. the low-space notice in Settings -> Data actually appears, carries an
//      icon, and is an edge rather than a fill (DESIGN.md's `.notice
//      notice-warn` recipe: a filled warning band over a panel reads as a
//      failed panel);
//   2. a 507 answer reaches the person with the *actionable* half attached.
//      Every call site in this app toasts `error.message`, and the sentence
//      naming the folder and how much to free up arrives in `hint`, so the
//      only thing that proves it is read is reading the toast.
//
// Both are driven by intercepting the two responses rather than by filling a
// real disk: the real disk was filled once, on an 80 MB tmpfs mounted as the
// data dir, and that is what said what the responses look like.
//
//   BASE=http://127.0.0.1:8796 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node diskspace.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot();
  let failures = 0;
  const fail = (msg) => { failures += 1; console.log('    ' + msg); };

  await page.route('**/storage', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.free_bytes = 4 * 1024 * 1024;       // 4 MB left
    body.low_space_bytes = 64 * 1024 * 1024;
    await route.fulfill({ response, body: JSON.stringify(body) });
  });

  await page.evaluate(() => {
    if (typeof openSettingsModal === 'function') openSettingsModal();
    else document.getElementById('settings-btn')?.click();
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    document.querySelector('#settings-nav button[data-section="data"]')?.click();
  });
  await page.waitForTimeout(1500);

  const notice = await page.evaluate(() => {
    const el = document.getElementById('storage-space-notice');
    if (!el) return null;
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return {
      hidden: el.classList.contains('hidden'),
      text: el.textContent.trim(),
      icon: el.firstElementChild ? el.firstElementChild.className : '',
      background: style.backgroundColor,
      border: style.borderLeftWidth + ' ' + style.borderLeftColor,
      color: style.color,
      //: The two tokens the recipe is written in, resolved here so the
      //: check below compares colours rather than guessing at them.
      //: Resolved through an element rather than read raw, because a token
      //: may be written `#9a5b04` while `getComputedStyle` reports every
      //: used colour as `rgb(...)`, and comparing the two forms fails on a
      //: pair that is the same colour.
      warn: (() => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--warn)';
        document.body.appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      })(),
      //: Same resolution trick as `warn` below, for the same reason one
      //: step further on: dark mode writes this token as `rgba(..., 0.20)`
      //: and `getComputedStyle` reports the used value as `0.2`.
      accentSoft: (() => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'var(--accent-soft)';
        document.body.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      })(),
      iconColor: el.firstElementChild ? getComputedStyle(el.firstElementChild).color : '',
      width: Math.round(box.width),
      height: Math.round(box.height),
    };
  });

  if (!notice) fail('no #storage-space-notice in the panel at all');
  else {
    console.log(`notice: hidden=${notice.hidden} ${notice.width}x${notice.height}`);
    console.log(`    text: ${notice.text}`);
    console.log(`    icon: ${notice.icon || '(none)'}`);
    console.log(`    ground: ${notice.background} (--accent-soft ${notice.accentSoft})`);
    console.log(`    edge: ${notice.border}  icon: ${notice.iconColor} (--warn ${notice.warn})`);
    if (notice.hidden) fail('4 MB left and the notice stayed hidden');
    if (!/4\.0 MB/.test(notice.text)) fail('the notice does not say how much is left');
    if (!/ph-/.test(notice.icon)) fail('the notice has no icon as its first child');
    //: "Edge, not fill" is the recipe's own rule (08-consistency.css): the
    //: warn tone moves the border and the icon and leaves the ground on
    //: `--accent-soft`, because a filled warning band over a settings panel
    //: reads as a broken panel. So the fill must be the plain notice ground
    //: and the edge must be the warn token.
    if (notice.background.replace(/\s/g, '') !== notice.accentSoft.replace(/\s/g, '')) {
      fail(`the notice ground is ${notice.background}, the recipe is ${notice.accentSoft}`);
    }
    if (notice.border.split(' ').slice(1).join(' ').replace(/\s/g, '') !== notice.warn.replace(/\s/g, '')) {
      fail(`the notice edge is ${notice.border}, the warn token is ${notice.warn}`);
    }
    if (notice.iconColor.replace(/\s/g, '') !== notice.warn.replace(/\s/g, '')) {
      fail(`the icon is ${notice.iconColor}, the warn token is ${notice.warn}`);
    }
    if (notice.height < 16) fail(`the notice is ${notice.height}px tall, so nothing is readable in it`);
  }

  // 2. the 507's hint reaches the toast.
  await page.evaluate(() => {
    document.querySelector('#settings-modal .close, [data-close-dialog="settings-modal"]')?.click();
    document.getElementById('settings-modal')?.close?.();
  });
  await page.waitForTimeout(400);
  const HINT = 'Your notebook is in /tmp/mm-arch. There is 0 bytes free there. Free some space and try again.';
  await page.route('**/entries', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 507,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: 'This computer has run out of disk space, so that could not be saved.',
        code: 'out_of_space',
        hint: HINT,
      }),
    });
  });
  const said = await page.evaluate(async () => {
    try {
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'x' }) });
      return '(no error thrown)';
    } catch (e) {
      return e.message;
    }
  });
  console.log(`error a save sees: ${said}`);
  if (!said.includes('run out of disk space')) fail('the save error lost the sentence');
  if (!said.includes('Your notebook is in')) fail('the save error lost the hint, which is the actionable half');

  console.log(failures ? `FAIL: ${failures} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
