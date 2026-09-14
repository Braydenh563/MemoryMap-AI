// CHAT_PLAN Phase 2's gate, as five numbers.
//
//   composer <= 2 rows at rest at 1024 and one row at 1440
//   the skills menu is inside the viewport
//   the user bubble's text clears 4.5:1 in both themes
//   the streaming indicator animates (two frames differ) and is static under
//     prefers-reduced-motion
//   no layout shift when "Jump to latest" appears (CLS 0)
//
//   BASE=http://127.0.0.1:8941 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/chatphase2.js
//
// Why a row count and not a height: the dock's height moves with the font
// scale and the attachment rows, and neither is what the gate is about. What
// the gate is about is how many lines of controls you read before you can
// type, which is the count of distinct top edges among the dock's own visible
// children plus the wraps inside the control strip.
const { boot } = require('./lib.js');

const srgb = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = (rgb) => 0.2126 * srgb(rgb[0] / 255) + 0.7152 * srgb(rgb[1] / 255) + 0.0722 * srgb(rgb[2] / 255);
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// One measurement shared by both themes, so the two runs cannot drift apart.
const bubbleInk = () => {
  const host = document.getElementById('chat-messages');
  host.replaceChildren();
  const msg = document.createElement('div');
  msg.className = 'msg user';
  const role = document.createElement('div');
  role.className = 'msg-role';
  role.textContent = 'You';
  const body = document.createElement('div');
  body.className = 'msg-body';
  body.textContent = 'what are the commonalities in my notes';
  msg.append(role, body);
  host.appendChild(msg);
  // The bubble paints the ground; the body is transparent over it, which is
  // why the pair measured is the body's ink against the bubble's background.
  //
  // Through a canvas, because the accent tokens are written in `oklab()` and
  // `getComputedStyle` hands that back verbatim: a naive "first three numbers"
  // parse of `oklab(0.49 -0.002 -0.18)` reads as a near-black RGB and reports
  // a 21:1 contrast for a mid-lavender bubble (it did, on the first run).
  const rgb = (colour) => {
    const c = document.createElement('canvas').getContext('2d');
    c.fillStyle = '#000';
    c.fillStyle = colour;
    c.fillRect(0, 0, 1, 1);
    const d = c.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  const cs = getComputedStyle(msg);
  return {
    ink: rgb(getComputedStyle(body).color),
    role: rgb(getComputedStyle(role).color),
    ground: rgb(cs.backgroundColor),
  };
};

(async () => {
  const bad = [];
  const { page, browser, ctx } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(900);

  // 1. Rows. `.chat-dock`'s visible children are the attachment rows (empty at
  // rest), the composer and the control strip; the strip's own children wrap,
  // so its lines are counted too and the two sums are added.
  const rows = async (width) => {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(400);
    return page.evaluate(() => {
      const lines = (el) => {
        const tops = new Set();
        for (const kid of el.children) {
          if (kid.classList.contains('hidden') || !kid.getClientRects().length) continue;
          const box = kid.getBoundingClientRect();
          if (box.height === 0) continue;
          // Out of flow takes no row: `#scroll-top` is a `position: fixed`
          // back-to-top button that happens to be parented here, and the
          // strip's spacer is a zero-height flex filler.
          const pos = getComputedStyle(kid).position;
          if (pos === 'fixed' || pos === 'absolute') continue;
          tops.add(Math.round(box.top));
        }
        return tops.size;
      };
      const dock = document.querySelector('.chat-dock');
      const strip = dock.querySelector('.chat-dock-controls');
      // The strip is one of the dock's lines already, so its own wraps past
      // the first are what it adds.
      return { dock: lines(dock), strip: lines(strip), total: lines(dock) + Math.max(0, lines(strip) - 1) };
    });
  };
  const at1440 = await rows(1440);
  const at1024 = await rows(1024);
  console.log(`rows      1440: ${at1440.total} (dock ${at1440.dock}, strip lines ${at1440.strip}); 1024: ${at1024.total} (dock ${at1024.dock}, strip lines ${at1024.strip})`);
  if (at1440.strip > 1) bad.push(`control strip wraps to ${at1440.strip} lines at 1440`);
  if (at1024.total > 2) bad.push(`composer is ${at1024.total} rows at 1024`);
  if (at1440.total > 2) bad.push(`composer is ${at1440.total} rows at 1440`);

  // 2. The skills menu, opened, against the viewport.
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(300);
  const skills = await page.evaluate(async () => {
    const btn = document.getElementById('chat-skills-btn');
    if (!btn) return { missing: true };
    btn.click();
    await new Promise((r) => setTimeout(r, 250));
    const panel = document.getElementById('chat-skills-panel');
    const box = panel.getBoundingClientRect();
    const over = Math.max(0, box.bottom - innerHeight) + Math.max(0, box.right - innerWidth)
      + Math.max(0, -box.top) + Math.max(0, -box.left);
    return { over: Math.round(over), h: Math.round(box.height), cap: Math.round(innerHeight * 0.4) };
  });
  if (skills.missing) { console.log('skills    menu not built (no skills loaded)'); bad.push('no skills menu'); }
  else {
    console.log(`skills    panel ${skills.h}px tall, ${skills.over}px outside the viewport (40vh cap ${skills.cap}px)`);
    if (skills.over > 0) bad.push(`skills panel ${skills.over}px outside the viewport`);
    if (skills.h > skills.cap) bad.push(`skills panel ${skills.h}px over the 40vh cap`);
  }
  await page.keyboard.press('Escape');

  // 3. The user bubble, light.
  const light = await page.evaluate(bubbleInk);
  console.log(`bubble    light ink rgb(${light.ink}) on rgb(${light.ground}) = ${ratio(light.ink, light.ground).toFixed(2)}:1; role label ${ratio(light.role, light.ground).toFixed(2)}:1`);
  if (ratio(light.ink, light.ground) < 4.5) bad.push(`user bubble ink ${ratio(light.ink, light.ground).toFixed(2)}:1 in light`);

  // 4. The caret: two frames of the same element, 300ms apart.
  const shot = async () => {
    const el = await page.$('#chat-messages .msg.user');
    return (await el.screenshot()).toString('base64');
  };
  await page.evaluate(() => {
    const body = document.querySelector('#chat-messages .msg.user .msg-body');
    body.parentElement.classList.add('is-streaming');
  });
  await page.waitForTimeout(120);
  const a = await shot();
  await page.waitForTimeout(520);
  const b = await shot();
  const live = await page.evaluate(() => {
    const body = document.querySelector('#chat-messages .msg.user .msg-body');
    const after = getComputedStyle(body, '::after');
    return { name: after.animationName, w: after.width, motion: document.documentElement.dataset.progressMotion };
  });
  console.log(`caret     two frames ${a === b ? 'IDENTICAL' : 'differ'}; ${live.w} wide, animation ${live.name} (progress-motion ${live.motion})`);
  if (a === b) bad.push('streaming caret does not animate');
  if (live.name === 'none') bad.push('streaming caret has no animation at rest');

  // The same element with the OS asking for less motion: the caret stays,
  // its blink stops, so two frames must now match.
  //
  // With `progress-motion: auto`, which is the setting that defers to the
  // platform. The app's own default is `always`, by direct instruction ("make
  // sure the animations run even with prefer reduced motion on"), and the
  // `!important` counter-rule in 02-chat-graph.css carries that decision: on
  // the default the caret blinks through the OS setting on purpose, so a gate
  // run against the default would be measuring the override, not the rule.
  const ctx2 = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
  await ctx2.addInitScript(() => { try { localStorage.setItem('onboardingDone', '1'); localStorage.setItem('theme', 'light'); localStorage.setItem('progress-motion', 'auto'); } catch (e) {} });
  const page2 = await ctx2.newPage();
  await page2.goto(process.env.BASE || 'http://127.0.0.1:8941', { waitUntil: 'domcontentloaded' });
  await page2.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  await page2.fill('#lock-password', 'testpassword123');
  await page2.click('#lock-submit');
  await page2.waitForTimeout(3000);
  await page2.evaluate(() => switchTab('chat'));
  await page2.waitForTimeout(700);
  await page2.evaluate(bubbleInk);
  await page2.evaluate(() => document.querySelector('#chat-messages .msg.user').classList.add('is-streaming'));
  await page2.waitForTimeout(120);
  const el2 = await page2.$('#chat-messages .msg.user');
  const ra = (await el2.screenshot()).toString('base64');
  await page2.waitForTimeout(520);
  const rb = (await el2.screenshot()).toString('base64');
  const caretThere = await page2.evaluate(() => {
    // The caret is the *body's* pseudo-element, not the bubble's: `.msg` has
    // element children, so `:not(:has(*))` never matches it.
    const body = document.querySelector('#chat-messages .msg.user .msg-body');
    const after = getComputedStyle(body, '::after');
    return { name: after.animationName, w: after.width, motion: document.documentElement.dataset.progressMotion };
  });
  console.log(`reduced   two frames ${ra === rb ? 'identical' : 'DIFFER'}; caret ${caretThere.w} wide, animation ${caretThere.name} (progress-motion ${caretThere.motion})`);
  if (caretThere.name !== 'none') bad.push(`caret animation ${caretThere.name} under reduced motion on progress-motion auto`);
  if (caretThere.w === 'auto' || caretThere.w === '0px') bad.push('caret is gone under reduced motion, not just still');
  if (ra !== rb) bad.push('caret still blinks under prefers-reduced-motion');

  // 5. CLS while the pill appears, measured by the browser's own observer
  // rather than by comparing two rects: a shift anywhere on the page counts.
  const cls = await page.evaluate(async () => {
    let score = 0;
    const obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) score += e.value;
    });
    obs.observe({ type: 'layout-shift', buffered: false });
    const pill = document.getElementById('chat-jump-latest');
    await new Promise((r) => setTimeout(r, 200));
    for (let i = 0; i < 3; i += 1) {
      pill.classList.remove('hidden');
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 150)));
      pill.classList.add('hidden');
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 150)));
    }
    await new Promise((r) => setTimeout(r, 300));
    obs.disconnect();
    return { score, pos: getComputedStyle(pill).position };
  });
  console.log(`jump      CLS ${cls.score.toFixed(4)} over three appearances; position ${cls.pos}`);
  if (cls.score > 0.0001) bad.push(`jump pill shifts layout, CLS ${cls.score}`);
  if (cls.pos !== 'absolute' && cls.pos !== 'fixed') bad.push(`jump pill position ${cls.pos} reserves a row`);

  // 3b. The same bubble in dark, in its own context so the theme is the one
  // the app booted with.
  const ctx3 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await ctx3.addInitScript(() => { try { localStorage.setItem('onboardingDone', '1'); localStorage.setItem('theme', 'dark'); } catch (e) {} });
  const page3 = await ctx3.newPage();
  await page3.goto(process.env.BASE || 'http://127.0.0.1:8941', { waitUntil: 'domcontentloaded' });
  await page3.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  await page3.fill('#lock-password', 'testpassword123');
  await page3.click('#lock-submit');
  await page3.waitForTimeout(3000);
  await page3.evaluate(() => switchTab('chat'));
  await page3.waitForTimeout(700);
  const dark = await page3.evaluate(bubbleInk);
  console.log(`bubble    dark  ink rgb(${dark.ink}) on rgb(${dark.ground}) = ${ratio(dark.ink, dark.ground).toFixed(2)}:1; role label ${ratio(dark.role, dark.ground).toFixed(2)}:1`);
  if (ratio(dark.ink, dark.ground) < 4.5) bad.push(`user bubble ink ${ratio(dark.ink, dark.ground).toFixed(2)}:1 in dark`);

  await browser.close();
  if (bad.length) { console.log('\nFAIL\n' + bad.map((b) => ' - ' + b).join('\n')); process.exit(1); }
  console.log('\nPhase 2 gate green');
})();
