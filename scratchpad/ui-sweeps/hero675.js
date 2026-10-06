// INBOX 675: the Dashboard hero at the Focused view, measured.
//
// The owner, with a screenshot at about 2000px: "can you improve the
// dashboard hero section on the focused view??" The banner was a greeting at
// the left, the time at the far right and nothing between. So the number this
// sweep exists for is `gap`: the widest vertical strip of the hero's content
// box that holds no ink (no text run, no control, no tile), as a share of the
// hero's width. It is printed for every view, so Full and Compact are checked
// not to regress while Focused is the one being changed.
//
// Per view, width and theme, one JSON line:
//   hero     the hero's box (w x h)
//   gap      the widest empty vertical strip inside the hero, px and %
//   overflow descendants whose box leaves the hero, or that scroll sideways
//   low      text in the hero under 4.5:1 (3:1 large), computed colours
//   small    controls in the hero under 44px at a touch width
//   tiles    the glance tiles' labels (Focused)
//   errors   page errors and console errors during the run
//
//   BASE=http://127.0.0.1:8819 TAG=after PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCRATCH=<dir> node scratchpad/ui-sweeps/hero675.js
// WIDTHS, THEMES and VIEWS narrow the run; SHOTS=dir saves the hero of each
// run as <tag>-<view>-<width>-<theme>.png (for looking at, not for numbers).
const { boot } = require('./lib.js');
const fs = require('fs');

const HEIGHTS = { 390: 844, 1024: 768, 1440: 900, 1920: 1080, 2000: 1100 };
const widths = (process.env.WIDTHS || '390,1024,1440,1920').split(',').map(Number);
const themes = (process.env.THEMES || 'light,dark').split(',');
const views = (process.env.VIEWS || 'focused,compact,full').split(',');
const tag = process.env.TAG || 'run';
const shots = process.env.SHOTS || '';
if (shots) fs.mkdirSync(shots, { recursive: true });

// What the owner's notebook has on a working evening: notes, a reminder due
// today and one overdue, a meeting today, a note left Uncategorised. Seeded
// once per data dir (the marker note), through the app's own routes.
async function seed(page) {
  await page.evaluate(async () => {
    const all = await apiJson('/entries?limit=500');
    await apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ display_name: 'Brayden' }) });
    if (all.some((e) => (e.content || '').includes('hero675 seed'))) return;
    const post = (body) => apiJson('/entries', { method: 'POST', body: JSON.stringify(body) });
    await post({ content: '# Reading list\n\nhero675 seed\n\n- [ ] Finish chapter 3\n- [x] Order the book', category: 'Reading' });
    for (let i = 0; i < 6; i++) await post({ content: `# Note ${i + 1}\n\nSome words about thing ${i + 1}.`, category: 'Work' });
    await post({ content: 'A loose thought with nowhere to go yet.', category: 'Uncategorised' });
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const at = later.getDate() === now.getDate() ? `${pad(later.getHours())}:${pad(later.getMinutes())}` : '23:30';
    await apiJson('/meetings', { method: 'POST', body: JSON.stringify({ title: 'Design review', when: `${day}T${at}`, attendees: ['Sam'] }) });
    const soon = new Date(now.getTime() + 30 * 60 * 1000);
    const dueSoon = soon.getDate() === now.getDate() ? soon : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 50);
    await apiJson('/reminders', { method: 'POST', body: JSON.stringify({ text: 'Send the invoice', due_at: dueSoon.toISOString() }) });
    await apiJson('/reminders', { method: 'POST', body: JSON.stringify({ text: 'Call the bank', due_at: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(), restore: true }) });
  });
}

(async () => {
  let seeded = false;
  for (const theme of themes) {
    process.env.THEME = theme;
    for (const width of widths) {
      const touch = width < 600;
      const { browser, page } = await boot({
        viewport: { width, height: HEIGHTS[width] || 900 },
        ...(touch ? { hasTouch: true, isMobile: true } : {}),
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
      if (!seeded) { await seed(page); seeded = true; }
      for (const view of views) {
        await page.evaluate(async (v) => {
          await switchTab('dashboard');
          applyDashDensity(v);
          if (typeof loadPrefs === 'function') await loadPrefs().catch(() => {});
          await renderDashboard();
        }, view);
        await page.waitForTimeout(2200);
        const m = await page.evaluate(({ touch }) => {
          const hero = document.getElementById('dash-hero');
          const hr = hero.getBoundingClientRect();
          const cs = getComputedStyle(hero);
          const left = hr.left + parseFloat(cs.paddingLeft);
          const right = hr.right - parseFloat(cs.paddingRight);
          const shown = (el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
          };
          // Ink: every text run and every control's box.
          const ink = [];
          const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (!n.textContent.trim() || !n.parentElement || !shown(n.parentElement)) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            for (const r of range.getClientRects()) if (r.width > 0) ink.push([r.left, r.right]);
          }
          for (const el of hero.querySelectorAll('button, a, input, canvas, svg, .quick-link, i.ph')) {
            if (!shown(el)) continue;
            const r = el.getBoundingClientRect();
            ink.push([r.left, r.right]);
          }
          ink.sort((a, b) => a[0] - b[0]);
          let cursor = left;
          let gap = 0;
          for (const [l, r] of ink) {
            if (l > cursor) gap = Math.max(gap, l - cursor);
            cursor = Math.max(cursor, r);
          }
          gap = Math.max(gap, right - cursor);
          // Overflow: anything inside drawn past the hero's box, or scrolling.
          const overflow = [];
          for (const el of hero.querySelectorAll('*')) {
            if (!shown(el)) continue;
            const r = el.getBoundingClientRect();
            if (r.right > hr.right + 0.5 || r.left < hr.left - 0.5 || r.bottom > hr.bottom + 0.5) overflow.push(`${el.tagName}.${el.className}`.slice(0, 60));
            const s = getComputedStyle(el);
            // The emblem's p5 canvas is a pixel wider than its holder at every view
            // (measured before this change too): not a clip anybody can see.
            if (!el.classList.contains('emblem') && el.scrollWidth > el.clientWidth + 1 && !/hidden|clip/.test(s.overflowX) && s.display !== 'inline') overflow.push(`scroll:${el.className}`.slice(0, 60));
          }
          if (document.documentElement.scrollWidth > innerWidth + 1) overflow.push('page scrolls sideways');
          // Contrast, computed colours against the first painted ground.
          // Through a canvas, so oklab(), color(srgb ...) and color-mix()
          // results come back as 0-255 channels like rgb() does.
          const pen = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
          const parse = (c) => {
            pen.clearRect(0, 0, 1, 1);
            pen.fillStyle = '#000';
            pen.fillStyle = c;
            pen.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data;
            return [r, g, b, a / 255];
          };
          const lum = ([r, g, b]) => {
            const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
          };
          const ground = (el) => {
            for (let e = el; e; e = e.parentElement) {
              const c = parse(getComputedStyle(e).backgroundColor);
              if (c[3] > 0.5) return c;
            }
            return [255, 255, 255];
          };
          const low = [];
          for (const el of hero.querySelectorAll('*')) {
            if (!shown(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
            const s = getComputedStyle(el);
            const fg = parse(s.color);
            const bg = ground(el);
            const alpha = fg[3];
            const mixed = fg.slice(0, 3).map((v, i) => v * alpha + bg[i] * (1 - alpha));
            const [a, b] = [lum(mixed), lum(bg)].sort((x, y) => y - x);
            const ratio = (a + 0.05) / (b + 0.05);
            const size = parseFloat(s.fontSize);
            const large = size >= 18.66 || (size >= 14 && Number(s.fontWeight) >= 700);
            if (ratio < (large ? 3 : 4.5)) low.push(`${el.className || el.tagName}:${ratio.toFixed(2)}`);
          }
          const small = [];
          if (touch) {
            for (const el of hero.querySelectorAll('button, a, input')) {
              if (!shown(el)) continue;
              const r = el.getBoundingClientRect();
              if (r.height < 43.5 || r.width < 43.5) small.push(`${el.className}:${Math.round(r.width)}x${Math.round(r.height)}`);
            }
          }
          const tiles = [...hero.querySelectorAll('.dash-glance .quick-link')].filter(shown).map((t) => t.querySelector('.quick-link-label')?.textContent.trim());
          const greeting = document.getElementById('dash-greeting');
          const time = document.getElementById('dash-clock-time');
          return {
            hero: `${Math.round(hr.width)}x${Math.round(hr.height)}`,
            gap: `${Math.round(gap)}px ${Math.round((gap / hr.width) * 100)}%`,
            greetingPx: parseFloat(getComputedStyle(greeting).fontSize),
            timePx: shown(time) ? parseFloat(getComputedStyle(time).fontSize) : 0,
            overflow, low, small, tiles,
          };
        }, { touch });
        console.log(JSON.stringify({ tag, view, width, theme, ...m, errors: [...new Set(errors)] }));
        if (shots) await (await page.$('#dash-hero')).screenshot({ path: `${shots}/${tag}-${view}-${width}-${theme}.png` });
      }
      await browser.close();
    }
  }
})();
