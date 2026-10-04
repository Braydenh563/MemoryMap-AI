// INBOX 534: after a REAL streamed turn (thinking, citations, code, table,
// a figure) the chat pane's wheel reaches the bottom and the last line is
// visible above the dock. Drives scratchpad/fake_answer_server.py with
// FAKE_ANSWER_FILE + FAKE_THINK_FILE + FAKE_DELAY_MS (see /tmp/c534 recipe in
// the INBOX entry). Samples scrollTop/scrollHeight/clientHeight/data-stuck
// every 100ms through the turn and after it.
//   BASE=http://127.0.0.1:8823 FAKE=http://127.0.0.1:8824/v1 SCRATCH=/tmp/c534 \
//   W=1440 H=900 MODE=follow|release PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node chatscroll534.js
const fs = require('fs');
const { boot } = require('./lib.js');

const FAKE = process.env.FAKE || 'http://127.0.0.1:8824/v1';
const SCRATCH = process.env.SCRATCH || '/tmp/c534';
const W = Number(process.env.W || 1440);
const H = Number(process.env.H || 900);
const MODE = process.env.MODE || 'follow'; // follow: wheel down while writing; release: wheel up first
const NOTE = 'The sprint board sketch shows three columns: backlog, doing and review. ' + 'We drew it on the whiteboard after planning, then copied it into the notebook so the team can see how work moves from one column to the next during the sprint. '.repeat(2);

(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: H } });
  // NOSIZE=1: the figure's size is unknown (an older picture), and SLOW_IMG=1
  // makes the file land 1.5s late, the case the pane's load listener is for.
  if (process.env.NOSIZE) await page.evaluate(() => { for (const k of ['width', 'height']) Object.defineProperty(HTMLImageElement.prototype, k, { set() {}, get() { return 0; } }); });
  if (process.env.SLOW_IMG) await page.context().route('**/media/**', async (route) => { await new Promise((r) => setTimeout(r, 1500)); route.continue(); });
  await page.evaluate(async ({ png, base, note }) => {
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append('file', new File([bytes], 'board.png', { type: 'image/png' }));
    const headers = { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() };
    const up = await (await fetch('/media/upload', { method: 'POST', headers, body: form })).json();
    await api(`/media/${up.id}/caption`, { method: 'POST', body: JSON.stringify({ text: 'A hand-drawn sprint board with three tall columns labelled backlog, doing and review' }) });
    await api('/entries', { method: 'POST', body: JSON.stringify({ content: `${note}\n\n![](${up.url})`, category: 'General' }) });
    await api('/models/provider', { method: 'POST', body: JSON.stringify({ provider: 'openai', base_url: base }) });
    await api('/models/chat-model', { method: 'POST', body: JSON.stringify({ name: 'fake-answerer' }) }).catch(() => null);
  }, { png: fs.readFileSync(`${SCRATCH}/board.png`).toString('base64'), base: FAKE, note: NOTE });

  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => newChatConversation());
  await page.waitForTimeout(400);
  // DIAG=1: log any jump of the pane up by 200px+ with the scripts and
  // mutations just before it (an intermittent jump to the top was seen once).
  if (process.env.DIAG) {
  await page.evaluate(() => {
      window.__log = []; window.__ring = [];
      const pane = document.getElementById('chat-messages');
      const st = (n = 3) => new Error().stack.split('\n').slice(2, 2 + n).map((l) => l.trim().replace(/https?:\/\/[^/]+/, '')).join(' < ');
      const d = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
      Object.defineProperty(Element.prototype, 'scrollTop', { get() { return d.get.call(this); }, set(v) { if (this === pane && v < d.get.call(this) - 150) window.__log.push({ kind: 'set', v, was: d.get.call(this), stack: st(5) }); d.set.call(this, v); }, configurable: true });
      for (const fn of ['scrollTo', 'scrollBy', 'scrollIntoView', 'focus']) {
        const o = Element.prototype[fn];
        Element.prototype[fn] = function (...a) { window.__ring.push({ t: Math.round(performance.now()), kind: fn, on: this.id || this.className?.toString().slice(0, 30) || this.tagName, stack: st(4) }); return o.apply(this, a); };
      }
      new MutationObserver((recs) => {
        for (const r of recs) window.__ring.push({ t: Math.round(performance.now()), kind: 'mut', type: r.type, target: (r.target.id || r.target.className?.toString().slice(0, 30) || r.target.nodeName), add: r.addedNodes.length, rem: r.removedNodes.length });
        if (window.__ring.length > 60) window.__ring.splice(0, window.__ring.length - 60);
      }).observe(pane, { childList: true, subtree: true });
      let prev = pane.scrollTop, prevSh = pane.scrollHeight;
      pane.addEventListener('scroll', () => {
        const top = pane.scrollTop, sh = pane.scrollHeight;
        if (top < prev - 200) window.__log.push({ kind: 'scroll-jump', prev, top, prevSh, sh, t: Math.round(performance.now()), ring: window.__ring.slice(-14) });
        prev = top; prevSh = sh;
      }, { passive: true });
      pane.addEventListener('wheel', (e) => window.__ring.push({ t: Math.round(performance.now()), kind: 'wheel', dy: e.deltaY, target: e.target.className?.toString().slice(0, 30) || e.target.nodeName }), { passive: true, capture: true });
    });
  }
  // The sampler lives in the page so it sees every 100ms, not every await.
  await page.evaluate(() => {
    window.__s = [];
    const pane = document.getElementById('chat-messages');
    window.__t0 = performance.now();
    window.__timer = setInterval(() => {
      window.__s.push({
        t: Math.round(performance.now() - window.__t0), top: Math.round(pane.scrollTop), sh: pane.scrollHeight, ch: pane.clientHeight,
        d: Math.round(pane.scrollHeight - pane.scrollTop - pane.clientHeight), stuck: pane.dataset.stuck, live: Boolean(chatController),
        pill: !document.getElementById('chat-jump-latest').classList.contains('hidden'),
      });
    }, 100);
  });
  await page.click('#chat-input');
  await page.keyboard.type('Show me the picture of the sprint board sketch and explain it');
  await page.keyboard.press('Enter');
  const pane = await page.$('#chat-messages');
  const bb = await pane.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  const wheelLog = [];
  let drift = null; // release mode: scrollTop change over 3s of streaming with no input
  const wheelDown = async (label) => {
    const before = await page.evaluate(() => document.getElementById('chat-messages').scrollTop);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(60);
    const after = await page.evaluate(() => { const p = document.getElementById('chat-messages'); return [Math.round(p.scrollTop), Math.round(p.scrollHeight - p.scrollTop - p.clientHeight)]; });
    wheelLog.push({ label, moved: Math.round(after[0] - before), dist: after[1] });
  };
  // During the turn.
  const started = Date.now();
  let i = 0;
  while (await page.evaluate(() => Boolean(chatController)) && Date.now() - started < 90000) {
    await page.waitForTimeout(250);
    i += 1;
    if (MODE === 'release' && i === 110) {
      await page.mouse.wheel(0, -700); await page.waitForTimeout(400);
      const t0 = await page.evaluate(() => Math.round(document.getElementById('chat-messages').scrollTop));
      await page.waitForTimeout(3000);
      const t1 = await page.evaluate(() => Math.round(document.getElementById('chat-messages').scrollTop));
      drift = t1 - t0;
    }
    if (MODE === 'release' ? i > 114 && i % 4 === 0 : i % 6 === 0) await wheelDown('during');
  }
  await page.waitForTimeout(1500);
  const settled = await page.evaluate(() => { const p = document.getElementById('chat-messages'); return { top: Math.round(p.scrollTop), d: Math.round(p.scrollHeight - p.scrollTop - p.clientHeight), stuck: p.dataset.stuck }; });
  // Growth probe, deterministic: a block taller than the 40px slack lands under a
  // pane that is following, a scroll event is delivered after it (as the one for
  // the pin always is), then the next pin runs. The pane must still be following.
  const grew = MODE === 'follow' ? await page.evaluate(async () => {
    const p = document.getElementById('chat-messages');
    const block = document.createElement('div'); block.style.height = '160px'; block.style.flex = 'none'; block.className = 'probe-block';
    p.append(block); const before = Math.round(p.scrollHeight - p.scrollTop - p.clientHeight); p.dispatchEvent(new Event('scroll'));
    const stuck = p.dataset.stuck;
    chatScrollToEnd(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const d = Math.round(p.scrollHeight - p.scrollTop - p.clientHeight);
    block.remove(); return { stuck, d, before };
  }) : { stuck: '1', d: 0 };
  // Nested scroller probe: a wheel up inside a code-like block that can still scroll up must not release following; at its top it must.
  const nested = MODE === 'follow' ? await page.evaluate(() => {
    const p = document.getElementById('chat-messages');
    const box = document.createElement('div'); Object.assign(box.style, { height: '40px', overflowY: 'auto', flex: 'none' }); const tall = document.createElement('div'); tall.style.height = '300px'; box.append(tall); // style props, not attributes: the CSP refuses inline style
    p.append(box); box.scrollTop = 80; p.dataset.stuck = '1';
    const wheelUp = () => box.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
    wheelUp(); const inside = p.dataset.stuck;
    box.scrollTop = 0; wheelUp(); const atTop = p.dataset.stuck;
    box.remove(); p.dataset.stuck = '1'; return { inside, atTop };
  }) : { inside: '1', atTop: '0' };
  console.log('nested wheel probe', JSON.stringify(nested));
  for (let k = 0; k < 30; k += 1) await wheelDown('after');
  await page.waitForTimeout(600);
  const end = await page.evaluate(() => {
    const p = document.getElementById('chat-messages');
    const dock = document.querySelector('.chat-dock').getBoundingClientRect();
    const kids = [...p.querySelectorAll('.msg')];
    const last = kids[kids.length - 1];
    const lastText = last.querySelector('.msg-body, .bubble-answer') || last;
    // The final visible line: the last client rect of the last text-bearing node.
    const vis = [...last.children].filter((e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).position !== 'absolute');
    const tail = [Math.max(...vis.map((e) => e.getBoundingClientRect().bottom))];
    const lastKid = vis[vis.length - 1];
    const pr = p.getBoundingClientRect();
    return {
      top: Math.round(p.scrollTop), max: p.scrollHeight - p.clientHeight, dist: Math.round(p.scrollHeight - p.scrollTop - p.clientHeight),
      paneBottom: Math.round(pr.bottom), dockTop: Math.round(dock.top), lastMsgBottom: Math.round(last.getBoundingClientRect().bottom),
      tailBottom: Math.round(Math.max(...tail)), lastKid: lastKid.tagName + '.' + lastKid.className.toString().slice(0, 40), pill: !document.getElementById('chat-jump-latest').classList.contains('hidden'),
      figures: p.querySelectorAll('.answer-figure').length, thinking: p.querySelectorAll('.thinking, details.thinking').length,
      nested: [...p.querySelectorAll('*')].filter((e) => e !== p && e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map((e) => e.className.toString().slice(0, 30)),
    };
  });
  const samples = await page.evaluate(() => { clearInterval(window.__timer); return window.__s; });
  // The trace: only the samples where something moved, to keep it readable.
  let prev = '';
  const trace = [];
  for (const s of samples) {
    const key = `${s.sh}|${s.top}|${s.stuck}|${s.live}|${s.pill}`;
    if (key !== prev) trace.push(s);
    prev = key;
  }
  fs.writeFileSync(`${SCRATCH}/trace-${W}x${H}-${MODE}.json`, JSON.stringify(trace));
  const worstDuring = Math.max(...samples.filter((s) => s.live && s.stuck === '1').map((s) => s.d), 0);
  const lastLive = [...samples].reverse().find((s) => s.live);
  console.log('growth probe', JSON.stringify(grew));
  console.log(JSON.stringify({ W, H, MODE, samples: samples.length, worstDistWhileStuckAndLive: worstDuring, endOfStream: lastLive, settled, end, wheelAfter: wheelLog.filter((w) => w.label === 'after').slice(0, 6), wheelDuring: wheelLog.filter((w) => w.label === 'during') }));
  await page.screenshot({ path: `${SCRATCH}/shots/c534-${W}x${H}-${MODE}.png` });
  if (process.env.DIAG) console.log('DIAG', JSON.stringify(await page.evaluate(() => window.__log)).slice(0, 4000));
  const ok = nested.inside === '1' && nested.atTop === '0' && grew.stuck === '1' && grew.d <= 1 && (MODE !== 'follow' || settled.d <= 1) && end.dist <= 1 && end.tailBottom <= end.paneBottom + 1 && (drift === null || Math.abs(drift) <= 1);
  console.log('drift', drift);
  console.log(ok ? 'PASS' : 'FAIL', 'dist', end.dist, 'tailBottom', end.tailBottom, 'dockTop', end.dockTop);
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
