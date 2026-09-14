// INBOX 236: "the about this chat '?' tooltip button in the chat empty
// interface, and it shouldnt be there, its right in the middle of everything,
// move it somewhere else like in a corner or smth."
//
//   BASE=http://127.0.0.1:8801 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/chatemptyhelp.js
//
// Where the button is, measured against the empty state's own box rather than
// described: how far its centre sits from the column's centre line and from
// the top right corner, and whether it still opens its `data-help-for`
// popover once moved (a help button that is only repositioned and never
// re-tested is the "feature that never ran once" in CLAUDE.md section 6).
const { boot } = require('./lib.js');

(async () => {
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });

  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1200);

  const geometry = () => page.evaluate(() => {
    const empty = document.querySelector('.chat-empty');
    if (!empty) return { there: false };
    const toggle = empty.querySelector('[data-help-for="chat-empty-help"]');
    if (!toggle) return { there: true, toggle: false };
    const e = empty.getBoundingClientRect();
    const t = toggle.getBoundingClientRect();
    const blurb = empty.querySelector('.chat-empty-line');
    const b = blurb.getBoundingClientRect();
    return {
      there: true,
      toggle: true,
      parent: toggle.parentElement.className,
      position: getComputedStyle(toggle).position,
      empty: `${Math.round(e.width)}x${Math.round(e.height)} at ${Math.round(e.left)},${Math.round(e.top)}`,
      rect: `${Math.round(t.width)}x${Math.round(t.height)} at ${Math.round(t.left)},${Math.round(t.top)}`,
      fromCentre: Math.round(t.left + t.width / 2 - (e.left + e.width / 2)),
      fromRight: Math.round(e.right - t.right),
      fromTop: Math.round(t.top - e.top),
      //: The line it used to hang off: with the button gone the sentence must
      //: not be left with a trailing gap or a wrap of its own.
      blurbLines: Math.round(b.height / parseFloat(getComputedStyle(blurb).lineHeight)),
      blurbText: blurb.textContent.trim().slice(-40),
      iconOnly: !toggle.textContent.trim(),
      label: toggle.getAttribute('aria-label'),
      helpFor: toggle.dataset.helpFor,
    };
  });

  const g = await geometry();
  console.log(`  geometry: ${JSON.stringify(g)}`);
  check('the toggle is out of the centred column', g.toggle && g.position === 'absolute' && Math.abs(g.fromCentre) > 100,
    `parent .${g.parent}, ${g.position}, ${g.rect} in an empty state of ${g.empty}: ${g.fromCentre}px from its centre line, ${g.fromRight}px in from the right edge and ${g.fromTop}px down from the top`);
  check('it is still an icon-only help trigger', g.iconOnly && !!g.helpFor && !!g.label,
    `aria-label "${g.label}", data-help-for "${g.helpFor}", no text of its own: ${g.iconOnly}`);
  check('the sentence it left behind is one line', g.blurbLines === 1,
    `"${g.blurbText}" over ${g.blurbLines} line(s)`);

  // It must still open.
  await page.click('.chat-empty [data-help-for="chat-empty-help"]');
  await page.waitForTimeout(400);
  const popover = await page.evaluate(() => {
    const panel = document.getElementById('chat-empty-help');
    const trigger = document.querySelector('.chat-empty [data-help-for="chat-empty-help"]');
    const r = panel.getBoundingClientRect();
    return {
      open: !panel.classList.contains('hidden'),
      expanded: trigger.getAttribute('aria-expanded'),
      parent: panel.parentElement.tagName.toLowerCase(),
      rect: `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`,
      inWindow: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
      hit: (() => {
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + 12);
        return el && panel.contains(el);
      })(),
    };
  });
  console.log(`  popover: ${JSON.stringify(popover)}`);
  check('the popover still opens, on top and inside the window',
    popover.open && popover.expanded === 'true' && popover.inWindow && popover.hit,
    `${popover.rect}, parent <${popover.parent}>, aria-expanded ${popover.expanded}, inside the window ${popover.inWindow}, hit-testable ${popover.hit}`);

  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
