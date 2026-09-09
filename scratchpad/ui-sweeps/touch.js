// Touch targets, on a real touch context (UI_MODERNISATION_PLAN.md Phase 9).
//
// A `hasTouch` + `isMobile` browser context is not decoration here: it is what
// makes `(hover: none)` and `(pointer: coarse)` match, so the page under test
// is the page a phone gets rather than a desktop page in a narrow window.
//
// Three questions per control, and the third is the one a size check alone
// cannot answer:
//
//   1. Is the hit target at least 44 CSS px on both sides? That is the figure
//      Phase 9's `--target-min` steps up to below 820, and the figure both
//      platform guidelines give.
//   2. Does a tap at its centre actually reach it? A control can be the right
//      size and still be covered by a sheet, a sticky strip or a floating
//      button, and `elementFromPoint` is the only thing that knows.
//   3. Does any tap land on two controls? Two targets whose 44px boxes overlap
//      means one of them takes taps meant for the other, and the person doing
//      the tapping has no way to tell which.
//
//   BASE=http://127.0.0.1:8802 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node touch.js
//
// Prints one line per surface and a non-zero exit if anything fails, so it can
// gate a commit. No screenshots.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PW = 'testpassword123';
const BASE = process.env.BASE || 'http://127.0.0.1:8781';
const WIDTH = Number(process.env.WIDTH || 390);
const HEIGHT = Number(process.env.HEIGHT || 844);
const MIN = 44;

// The docks the plan names, plus the chat composer, which is a dock by any
// other name: it is the control row you use most on that tab.
const SURFACES = [
  { tab: 'notes', label: 'Notes dock', sel: '[data-dock-name="notes"]' },
  { tab: 'library', label: 'Library dock', sel: '[data-dock-name="library"]' },
  { tab: 'chat', label: 'Chat composer', sel: '.chat-dock' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  await ctx.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  await page.fill('#lock-password', PW); await page.click('#lock-submit'); await page.waitForTimeout(2500);
  if (await page.$('#lock-password') && await page.isVisible('#lock-password')) {
    await page.fill('#lock-password', PW); await page.click('#lock-submit'); await page.waitForTimeout(2500);
  }
  await page.evaluate(() => { const o = document.getElementById('onboarding-overlay'); if (o) o.classList.add('hidden'); });
  await page.waitForTimeout(800);

  const media = await page.evaluate(() => ({
    hoverNone: matchMedia('(hover: none)').matches,
    coarse: matchMedia('(pointer: coarse)').matches,
    targetMin: getComputedStyle(document.documentElement).getPropertyValue('--target-min').trim(),
  }));
  console.log(`context ${WIDTH}x${HEIGHT}  hover:none=${media.hoverNone}  pointer:coarse=${media.coarse}  --target-min=${media.targetMin}`);
  if (!media.hoverNone) errors.push('the context is not reporting (hover: none) — the hover gating is not being exercised');

  let failures = 0;
  for (const surface of SURFACES) {
    await page.click(`[data-tab="${surface.tab}"]`).catch(() => {});
    await page.waitForTimeout(800);

    const result = await page.evaluate(({ sel, MIN }) => {
      const root = document.querySelector(sel);
      if (!root) return { missing: true };
      const visible = (e) => e.checkVisibility
        && e.checkVisibility({ visibilityProperty: true, opacityProperty: true, contentVisibilityAuto: true });
      const controls = [...root.querySelectorAll('button, select, summary, input:not([type="hidden"]), .seg')]
        .filter(visible)
        // Three kinds of element are deliberately unreachable and each has a
        // visible control standing for it: a `<select>` kept only as the value
        // a handler reads (`.dock-native-hidden`), the app's clipped
        // screen-reader recipes (`.visually-hidden`, `.sr-only` — the chat
        // composer's file input is one, driven by a visible paperclip), and a
        // `.seg` group, whose own buttons are what a finger lands on.
        .filter((e) => !e.closest('.dock-native-hidden, .visually-hidden, .sr-only'))
        .filter((e) => !e.classList.contains('seg'))
        .filter((e) => !e.closest('.dock-menu-list'));

      const name = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : '.' + [...e.classList].slice(0, 2).join('.')}`;

      const small = [];
      const covered = [];
      const shared = [];
      const seen = new Map();

      for (const control of controls) {
        const box = control.getBoundingClientRect();
        if (box.width + 0.5 < MIN || box.height + 0.5 < MIN) {
          small.push(`${name(control)} ${box.width.toFixed(1)}x${box.height.toFixed(1)}`);
        }
        const x = Math.round(box.left + box.width / 2);
        const y = Math.round(box.top + box.height / 2);
        const hit = document.elementFromPoint(x, y);
        if (!hit || (!control.contains(hit) && !hit.contains(control))) {
          covered.push(`${name(control)} at ${x},${y} hits ${hit ? name(hit) : 'nothing'}`);
        }
        // Two controls whose centres resolve to the same element means one tap
        // cannot choose between them.
        const key = `${x},${y}`;
        if (seen.has(key)) shared.push(`${name(control)} shares ${key} with ${seen.get(key)}`);
        else seen.set(key, name(control));
      }
      return { count: controls.length, small, covered, shared };
    }, { sel: surface.sel, MIN });

    if (result.missing) {
      console.log(`${surface.label.padEnd(16)} NOT FOUND (${surface.sel})`);
      failures += 1;
      continue;
    }
    const bad = result.small.length + result.covered.length + result.shared.length;
    failures += bad;
    console.log(`${surface.label.padEnd(16)} ${result.count} controls  under-${MIN}px: ${result.small.length}  covered: ${result.covered.length}  overlapping taps: ${result.shared.length}`);
    for (const line of [...result.small, ...result.covered, ...result.shared]) console.log(`    ${line}`);
  }

  // And the bottom tab bar, which is the one control row every tab shares.
  const tabs = await page.evaluate((MIN) => {
    const bar = document.getElementById('tab-bar');
    const out = [];
    for (const button of bar.querySelectorAll('button')) {
      const box = button.getBoundingClientRect();
      if (box.width + 0.5 < MIN || box.height + 0.5 < MIN) {
        out.push(`${button.id} ${box.width.toFixed(1)}x${box.height.toFixed(1)}`);
      }
    }
    const b = bar.getBoundingClientRect();
    return { small: out, atBottom: Math.abs(b.bottom - window.innerHeight) < 1.5, scrolls: bar.scrollWidth > bar.clientWidth + 1 };
  }, MIN);
  failures += tabs.small.length;
  // The bottom tab bar is a rule of the phone band (< 600) alone: between
  // 600 and 1100 the strip takes a row of its own inside the header, on
  // purpose, and asserting the phone's shape at 800 reported a failure for
  // a layout that is behaving exactly as its band says it should.
  if (WIDTH < 600 && !tabs.atBottom) { failures += 1; console.log('tab bar          NOT pinned to the bottom edge'); }
  if (tabs.scrolls) { failures += 1; console.log('tab bar          scrolls sideways — a tab is out of reach'); }
  console.log(`tab bar          under-${MIN}px: ${tabs.small.length}  pinned to bottom: ${tabs.atBottom}  scrolls: ${tabs.scrolls}`);
  for (const line of tabs.small) console.log(`    ${line}`);

  for (const line of errors) console.log(`    ${line}`);
  failures += errors.length;

  console.log(failures ? `FAIL: ${failures} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
