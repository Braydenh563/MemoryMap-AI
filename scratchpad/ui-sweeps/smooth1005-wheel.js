// INBOX 460: "I keep experiencing scroll jump when scrolling with two
// fingers on my trackpad". A trackpad sends many small wheel deltas at a
// high rate (4 to 12px every 8 to 16ms), where scrolljump.js sent 40px
// steps 30ms apart. This sends that stream through CDP, down then up, over
// the notes list, a long document, a Settings pane and a long chat thread,
// and reads scrollTop on every wheel event and every frame, with the
// scroller's scrollHeight (content changing under the scroll).
//   BASE=http://127.0.0.1:8860 node scratchpad/ui-sweeps/smooth1005-wheel.js
// A jump is a frame whose step is over 1.5 times what was sent in it (or the
// frame before), or any step against the stream's direction. GATE=1 exits 1
// on any jump.
const { boot } = require('./lib.js');
const DELTA = +(process.env.DELTA || 6);
const EVERY = +(process.env.EVERY || 8);
const COUNT = +(process.env.COUNT || 140);

const RECORD = () => {
  // Readings on every wheel event (before it is applied) and every frame.
  const r = (window.__wh = { ev: [], fr: [], on: true, sc: window.__whSc });
  window.addEventListener('wheel', (e) => { if (r.on) r.ev.push({ t: performance.now(), top: r.sc.scrollTop, h: r.sc.scrollHeight, d: e.deltaY }); }, { passive: true, capture: true });
  const f = () => { if (!r.on) return; r.fr.push({ t: performance.now(), top: r.sc.scrollTop, h: r.sc.scrollHeight }); requestAnimationFrame(f); };
  requestAnimationFrame(f);
};

function analyse(name, d, dir) {
  const out = [];
  // Per wheel event: the change since the previous event against what that
  // event asked for. Per frame: against the deltas sent in between.
  let jumpsEv = 0, backEv = 0, worstEv = 0;
  for (let i = 1; i < d.ev.length; i++) {
    const step = (d.ev[i].top - d.ev[i - 1].top) * dir;
    const asked = Math.abs(d.ev[i - 1].d);
    if (step < -0.5 && !(dir < 0 && d.ev[i].top <= 0)) backEv += 1;
    if (step > asked * 1.5 + 0.5) { jumpsEv += 1; worstEv = Math.max(worstEv, step / asked); }
  }
  let jumpsFr = 0, backFr = 0, worstFr = 0, heightChanges = 0;
  for (let i = 1; i < d.fr.length; i++) {
    const a = d.fr[i - 1], b = d.fr[i];
    if (b.h !== a.h) heightChanges += 1;
    const sent = d.ev.filter((e) => e.t > a.t - 1 && e.t <= b.t).reduce((s, e) => s + Math.abs(e.d), 0);
    const step = (b.top - a.top) * dir;
    if (step < -0.5 && !(dir < 0 && b.top <= 0)) backFr += 1;
    // Smooth scrolling may carry a delta into the next frame; allow the
    // larger of this frame's and the previous frame's sends.
    const prevSent = i > 1 ? d.ev.filter((e) => e.t > d.fr[i - 2].t - 1 && e.t <= a.t).reduce((s, e) => s + Math.abs(e.d), 0) : 0;
    const allow = Math.max(sent, prevSent, DELTA) * 1.5 + 0.5;
    if (step > allow) { jumpsFr += 1; worstFr = Math.max(worstFr, step - allow); }
  }
  const moved = Math.round((d.fr.at(-1)?.top ?? 0) - (d.fr[0]?.top ?? 0));
  const row = { name, dir: dir > 0 ? 'down' : 'up', events: d.ev.length, moved, sent: d.ev.reduce((s, e) => s + Math.abs(e.d), 0), backEv, jumpsEv, worstEvX: +worstEv.toFixed(2), backFr, jumpsFr, worstFrPx: Math.round(worstFr), heightChanges };
  console.log(JSON.stringify(row));
  return row;
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: +(process.env.W || 1440), height: +(process.env.H || 900) } });
  const cdp = await page.context().newCDPSession(page);
  // Enough to scroll: 300 notes and one long document, made once per data dir.
  await page.evaluate(async () => {
    const have = await apiJson('/entries?limit=1&offset=250').catch(() => []);
    if (!(Array.isArray(have) ? have.length : (have.items || []).length)) {
      const words = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu'.split(' ');
      for (let i = 0; i < 300; i++) {
        const n = 1 + (i * 7) % 9;
        const body = Array.from({ length: n }, (_, k) => `Line ${k} of note ${i}: ` + words.slice(0, 3 + (i + k) % 9).join(' ')).join('\n');
        await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: (i % 3 ? `# Note ${i}\n\n` : '') + body, defer_filing: true }) });
      }
    }
  });
  const rows = [];
  const stream = async (name, setup, dirs = [1, -1]) => {
    const ok = await page.evaluate(setup);
    if (!ok) { console.log(JSON.stringify({ name, skipped: 'no scroller' })); return; }
    await page.waitForTimeout(1200);
    const at = await page.evaluate(() => { const r = window.__whSc.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height, innerHeight - r.top) / 2, max: window.__whSc.scrollHeight - window.__whSc.clientHeight }; });
    if (at.max < DELTA * COUNT * 0.5) console.log(`  (${name}: only ${at.max}px to scroll)`);
    await page.mouse.move(at.x, at.y);
    for (const dir of dirs) {
      await page.evaluate(RECORD);
      for (let i = 0; i < COUNT; i++) {
        // A trackpad's stream: small deltas that ease in and out.
        const d = Math.max(1, Math.round(DELTA * (0.5 + Math.sin(Math.PI * i / COUNT))));
        cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: at.x, y: at.y, deltaX: 0, deltaY: d * dir }).catch(() => {});
        await new Promise((r) => setTimeout(r, EVERY));
      }
      await page.waitForTimeout(600);
      const d = await page.evaluate(() => { window.__wh.on = false; return { ev: window.__wh.ev, fr: window.__wh.fr }; });
      rows.push(analyse(name, d, dir));
    }
  };
  const scrollerOf = `(el) => { let s = el; while (s && !(s.scrollHeight > s.clientHeight + 5 && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement; return s; }`;
  await stream('notes list', `(async () => { switchTab('notes'); await loadEntries(); await new Promise(r => setTimeout(r, 800)); const s = (${scrollerOf})(document.getElementById('entry-list')); window.__whSc = s; return !!s; })()`);
  // A list entered deep (a restored position, a jump by the scrollbar): the
  // rows between were never drawn, so they stand at their guessed height
  // until they come into view, which is where a trackpad going back up
  // meets them.
  await stream('notes list, entered deep', `(async () => { const s = (${scrollerOf})(document.getElementById('entry-list')); s.scrollTop = 0; await new Promise(r => setTimeout(r, 200)); s.scrollTop = Math.round((s.scrollHeight - s.clientHeight) * 0.6); window.__whSc = s; return !!s; })()`, [-1, 1]);
  await stream('settings appearance', `(async () => { await openSettingsModal('appearance'); await new Promise(r => setTimeout(r, 800)); const s = settingsScroller('appearance'); window.__whSc = s; return !!s && s.scrollHeight > s.clientHeight; })()`);
  await page.keyboard.press('Escape');
  await stream('chat thread', `(async () => { switchTab('chat'); await new Promise(r => setTimeout(r, 600)); const box = document.getElementById('chat-messages'); box.querySelector('.chat-empty')?.remove(); for (let i = 0; i < 60; i++) { const m = document.createElement('div'); m.className = 'msg ' + (i % 2 ? 'assistant' : 'user'); const b = document.createElement('div'); b.className = 'bubble'; b.textContent = ('Message ' + i + ' ').repeat(12 + (i * 5) % 30); m.appendChild(b); box.appendChild(m); } box.scrollTop = box.scrollHeight; await new Promise(r => setTimeout(r, 300)); box.scrollTop = 0; const s = (${scrollerOf})(box.lastElementChild); window.__whSc = s; return !!s; })()`);
  await stream('document', `(async () => { const text = Array.from({ length: 160 }, (_, i) => (i % 12 === 0 ? '## Section ' + i + '\\n\\n' : '') + 'Paragraph ' + i + ': ' + 'lorem ipsum dolor sit amet '.repeat(6)).join('\\n\\n'); let doc = (await apiJson('/documents').catch(() => [])); doc = (Array.isArray(doc) ? doc : doc.items || []).find((d) => d.title === 'Wheel probe'); if (!doc) doc = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Wheel probe', content: text }) }); await switchTab('documents'); await new Promise(r => setTimeout(r, 900)); if (typeof openDocument === 'function') await openDocument(doc.id); await new Promise(r => setTimeout(r, 1200)); const cands = [...document.querySelectorAll('#tab-documents *')].filter((e) => e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY) && e.getBoundingClientRect().height > 200); cands.sort((a, b) => b.scrollHeight - a.scrollHeight); window.__whSc = cands[0]; return !!cands[0]; })()`);
  await browser.close();
  // Judged by frames: a reading taken in a wheel listener is the main
  // thread's, which sees coalesced events after the compositor has already
  // moved the page, so its steps are printed but not judged.
  const bad = rows.filter((r) => r.backFr || r.jumpsFr);
  console.log(`streams with a jump or a step back: ${bad.length}/${rows.length}`);
  if (process.env.GATE && bad.length) process.exit(1);
})();
