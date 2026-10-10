// Live captions (Brief 82): the dock against the fake helper, at one width.
//
//   node captions82.js           WIDTH=1440 (default) or 390
//   env: BASE (the app), WAV and ONSETS (scratchpad/captions_audio.py),
//        HELPER (the fake helper's URL, to change its stand-in delay)
//
// Chromium plays WAV as the microphone (--use-file-for-fake-audio-capture),
// the app's Live captions row starts the dock, and a MutationObserver stamps
// the moment each of the eight words first shows in the dock. Per stand-in
// helper delay (0 ms: the app's own pipeline; 500 ms: tiny.en on a 6 s window
// with a cut audio context; 1900 ms: tiny.en with the full 30 s context, the
// two measured in caption82-1010.md) it prints speech-to-caption from the
// word's onset and from its end, then the page's share (a reply received to
// its text painted). The fake device plays from the start of the file when the
// capture opens; its own buffering is not subtracted, and is not known.
const { boot } = require('./lib.js');
const WIDTH = Number(process.env.WIDTH || 1440);
const WAV = process.env.WAV;
const ONSETS = (process.env.ONSETS || '').split(' ').map(Number);
const HELPER = process.env.HELPER || 'http://127.0.0.1:8841';
const WORDS = ['hello', 'world', 'this', 'is', 'a', 'live', 'caption', 'test'];
const WORD_MS = 400;
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

(async () => {
  const { browser, page } = await boot({
    viewport: { width: WIDTH, height: WIDTH < 600 ? 800 : 900 },
    ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}),
    permissions: ['microphone'],
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}%noloop`],
  });
  // The palette row is there and says what it does.
  const row = await page.evaluate(() => paletteCommands().find((c) => /Live captions/.test(c.label)) && true);
  console.log(`width ${WIDTH}: palette row "Live captions": ${row ? 'present' : 'MISSING'}`);
  const out = {};
  for (const delay of (process.env.DELAYS || '0,500,1900').split(',').map(Number)) {
    await fetch(`${HELPER}/config?delay_ms=${delay}`, { method: 'POST' });
    await page.evaluate(() => {
      window.__seen = {};
      window.__obs?.disconnect();
      window.__obs = new MutationObserver(() => {
        const text = ($('captions-past').textContent + ' ' + $('captions-running').textContent).toLowerCase();
        for (const w of text.split(/\s+/)) if (w && !(w in window.__seen)) window.__seen[w] = performance.now();
      });
      window.__obs.observe($('captions-dock'), { subtree: true, childList: true, characterData: true });
    });
    await page.evaluate(() => ensureModule('captions').then(() => toggleLiveCaptions()));
    await page.waitForFunction(() => !document.getElementById('captions-dock').classList.contains('hidden'), null, { timeout: 8000 });
    if (delay === 0) {
      out.layout = await page.evaluate(() => {
        const d = document.getElementById('captions-dock');
        const r = d.getBoundingClientRect();
        const bar = document.getElementById('status-bar').getBoundingClientRect();
        const zone = [...d.children].map((c) => c.className);
        const acts = [...d.querySelector('.dock-actions').children];
        const last = acts[acts.length - 1];
        return {
          left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height),
          clearOfStatusBar: bar.height === 0 || r.bottom <= bar.top + 0.5,
          pageOverflowX: document.documentElement.scrollWidth > innerWidth,
          controls: d.querySelectorAll('button').length,
          stopIsLastAndFilled: last.id === 'captions-stop' && !last.classList.contains('ghost'),
          stopH: Math.round(last.getBoundingClientRect().height),
          // Past the tab bar on a phone: the dock may not sit on it.
          tabBarGap: (() => { const t = document.getElementById('tab-bar'); const tr = t && t.getBoundingClientRect(); return tr && tr.height > 0 ? Math.round(tr.top - r.bottom) : null; })(),
          // WCAG contrast of the two text styles on the dock's own ground.
          contrast: (() => {
            const lum = (c) => { const k = /^color\(srgb/.test(c) ? 255 : 1; const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((x) => x * k).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
            const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
            const bg = getComputedStyle(d).backgroundColor;
            return { bg, running: ratio(getComputedStyle(document.getElementById('captions-running')).color, bg), past: ratio(getComputedStyle(document.getElementById('captions-past')).color, bg) };
          })(),
          zone,
        };
      });
    }
    // The file is ~13 s long: wait for the last word to have been heard and settled.
    await page.waitForTimeout(ONSETS[7] + WORD_MS + 1500 + delay + 3000);
    const m = await page.evaluate(() => {
      const t0 = captionRun.firstAudioAt - (4096 / captionRun.ctx.sampleRate) * 1000;
      return { t0, seen: window.__seen, timing: captionRun.timing.map((x) => x.paintedAt - x.replyAt), n: captionRun.timing.length, shown: [captionRun.lines.join(' / '), captionRun.running] };
    });
    const fromOnset = [], fromEnd = [];
    WORDS.forEach((w, k) => {
      if (!(w in m.seen)) return;
      fromOnset.push(m.seen[w] - (m.t0 + ONSETS[k]));
      fromEnd.push(m.seen[w] - (m.t0 + ONSETS[k] + WORD_MS));
    });
    out[delay] = { heard: fromOnset.length, onsetMedian: Math.round(med(fromOnset)), onsetMax: Math.round(Math.max(...fromOnset)), endMedian: Math.round(med(fromEnd)), endMax: Math.round(Math.max(...fromEnd)), paintMedian: Math.round(med(m.timing)), paintMax: Math.round(Math.max(...m.timing)), replies: m.n, shown: m.shown };
    const copied = await page.evaluate(() => !document.getElementById('captions-copy').disabled);
    await page.evaluate(() => toggleLiveCaptions());
    await page.waitForFunction(() => document.getElementById('captions-dock').classList.contains('hidden'), null, { timeout: 8000 });
    out[delay].copyEnabled = copied;
    await page.waitForTimeout(800);
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.log('SWEEP FAILED', e.message); process.exit(1); });
