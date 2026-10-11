// INBOX 887: "on the chat tab, clicking on the input text bar and opening up
// the phone keyboard actually covers the text box" and "the no model connected
// popup looks completely off".
//
//   BASE=http://127.0.0.1:8951 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kbinset.js          (H=667 W=375 KB=291 for an SE)
//
// Headless Chromium has no on-screen keyboard, so `window.visualViewport` is
// replaced by a stub (height, offsetTop, scale) and `initKeyboardInset`
// (phone-shell.js) is run against it: the same code path iOS drives. Measured
// for three pan states of one keyboard (iOS pans the visual viewport by an
// amount of its own choosing), with a stale pass (the keyboard arrives with no
// resize event, as iOS sometimes does) and a pinch zoom (must not read as a
// keyboard). Pass means the composer's bottom is at or above the visible bottom.
const { boot } = require('./lib.js');
const W = +process.env.W || 390, H = +process.env.H || 844, KB = +process.env.KB || 336;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
(async () => {
  const fails = [];
  const check = (label, ok, detail) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`); if (!ok) fails.push(label); };
  const { browser, page } = await boot({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, scale: 3, userAgent: UA });
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { for (const b of document.querySelectorAll('dialog[open] button')) if (/skip for now/i.test(b.textContent)) b.click(); });
  const probe = (c) => page.evaluate(async (c) => {
    const fake = new EventTarget();
    Object.assign(fake, { width: window.innerWidth, scale: c.scale || 1, offsetLeft: 0, height: c.stale ? innerHeight : innerHeight - c.kb, offsetTop: c.stale ? 0 : c.top });
    Object.defineProperty(window, 'visualViewport', { value: fake, configurable: true });
    initKeyboardInset();
    if (c.stale) {
      // focus with no resize event: the stub changes after the fact
      const input = document.querySelector('.chat-input'); input.blur(); input.focus();
      fake.height = innerHeight - c.kb; fake.offsetTop = c.top;
      await new Promise((r) => setTimeout(r, 900));
    } else {
      fake.dispatchEvent(new Event('resize'));
      await new Promise((r) => setTimeout(r, 300));
    }
    const input = document.querySelector('.chat-input');
    const notice = document.getElementById('chat-offline');
    return {
      inset: getComputedStyle(document.documentElement).getPropertyValue('--keyboard-inset'),
      open: document.documentElement.classList.contains('keyboard-open'),
      inputBottom: Math.round(input.getBoundingClientRect().bottom),
      visBottom: Math.round(fake.offsetTop + fake.height),
      notice: notice ? getComputedStyle(notice).display : null,
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    };
  }, c);
  for (const c of [
    { name: 'pan 0', kb: KB, top: 0 }, { name: 'pan half', kb: KB, top: Math.round(KB / 2) },
    { name: 'pan full', kb: KB, top: KB }, { name: 'stale (no resize event)', kb: KB, top: 0, stale: true },
  ]) {
    const r = await probe(c);
    check(`${c.name}: input at or above visible bottom`, r.inputBottom <= r.visBottom, `input ${r.inputBottom} vs visible ${r.visBottom}, inset ${r.inset}`);
    if (c.top === 0) check(`${c.name}: no-model line steps aside`, r.notice === 'none' && r.open, `notice display ${r.notice}, keyboard-open ${r.open}`);
    check(`${c.name}: no sideways scroll`, r.sw <= r.cw, `${r.sw} vs ${r.cw}`);
  }
  const zoom = await probe({ name: 'zoom', kb: H / 2, top: 0, scale: 2 });
  check('pinch zoom is not a keyboard', zoom.inset === '0px' && !zoom.open, `inset ${zoom.inset}, keyboard-open ${zoom.open}`);
  const rest = await probe({ kb: 0, top: 0 });
  check('no keyboard: inset 0 and the line is back', rest.inset === '0px' && rest.notice !== 'none', `inset ${rest.inset}, notice ${rest.notice}`);
  await browser.close();
  console.log(fails.length ? `FAILED ${fails.length}` : 'all passed');
  process.exit(fails.length ? 1 : 0);
})();
