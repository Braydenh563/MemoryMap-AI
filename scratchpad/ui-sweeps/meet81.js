// Brief 81 (WORLD_CLASS_PLAN 28.5 rows 2, 7, 11). ACT=seek|nomodel, W=1440|390.
// BASE=http://127.0.0.1:8838 DB=<data dir>/memorymap.db node scratchpad/ui-sweeps/meet81.js
// seek: an 8 s wav fixture kept as a recording, its transcript segments set
//   in the database (no Whisper here), each transcript line pressed: the
//   player's time against the line's start (row 7: within 0.5 s).
// nomodel: the sample meeting with no model: every control of the meeting
//   sheet pressed, dead ones counted, Summarise's finds counted (row 2).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');
const W = Number(process.env.W || 1440);
const ACT = process.env.ACT || 'seek';
const ROOT = path.resolve(__dirname, '..', '..');

function wavBase64(secs) {
  const rate = 8000, n = rate * secs, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(8000 * Math.sin((2 * Math.PI * 440 * i) / rate)), 44 + i * 2);
  return buf.toString('base64');
}

const SEGMENTS = [
  { start: 0, end: 1500, text: 'Okay, the launch date first.' },
  { start: 1500, end: 3200, text: 'We decided to move it to November.' },
  { start: 5200, end: 6800, text: 'Thanks Sam. Priya, the venue?' },
  { start: 6800, end: 8000, text: 'I will book it before the fourteenth.', speaker: process.env.SPEAKERS ? 'Priya' : null },
];

(async () => {
  const viewport = W <= 400 ? { width: W, height: 844 } : { width: W, height: 900 };
  const { browser, page } = await L.boot({ viewport, hasTouch: W <= 400, isMobile: W <= 400 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (ACT === 'seek') {
    const rid = await page.evaluate(async (b64) => {
      const made = await apiJson('/recordings', { method: 'POST', body: JSON.stringify({ title: 'Seek fixture', mime: 'audio/wav' }) });
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: 'audio/wav' }), 'take.wav');
      form.append('duration_ms', '8000');
      await api(`/recordings/${made.id}/chunk`, { method: 'POST', body: form });
      await apiJson(`/recordings/${made.id}/finish`, { method: 'POST', body: JSON.stringify({ duration_ms: 8000 }) });
      return made.id;
    }, wavBase64(8));
    execFileSync(path.join(ROOT, '.venv/bin/python'), ['-c',
      'import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute("update recordings set segments=? where id=?", (sys.argv[2], int(sys.argv[3]))); c.commit()',
      process.env.DB, JSON.stringify(SEGMENTS), String(rid)]);
    await page.evaluate(() => ensureModule('meetings'));
    await page.evaluate(() => openRecordings());
    const row = `#recordings-list [data-recording-id="${rid}"]`;
    await page.waitForSelector(`${row} .recording-transcript-toggle`, { timeout: 15000 });
    await page.click(`${row} .recording-transcript-toggle`);
    await page.waitForSelector(`${row} .recording-line`, { timeout: 10000 });
    const results = [];
    const lines = await page.$$(`${row} .recording-line`);
    for (let i = lines.length - 1; i >= 0; i--) {
      await lines[i].click();
      await page.waitForTimeout(250);
      const t = await page.$eval(`${row} audio`, (a) => { const t = a.currentTime; a.pause(); return t; });
      results.push({ line: i, want: SEGMENTS[i].start / 1000, got: Math.round(t * 1000) / 1000, off: Math.round(Math.abs(t - SEGMENTS[i].start / 1000) * 1000) / 1000 });
    }
    const now = await page.$$eval(`${row} .recording-line.is-now`, (b) => b.length);
    const who = await page.$$eval(`${row} .recording-line-who`, (b) => b.map((x) => x.textContent));
    const box = await page.$eval(`${row} .recording-line`, (b) => { const r = b.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width) }; });
    const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth - document.documentElement.clientWidth, rows: [...document.querySelectorAll('#recordings-list .recording-row')].filter((r) => r.scrollWidth > r.clientWidth + 1).length }));
    const menu = await page.evaluate((id) => apiJson(`/recordings/${id}`).then((rec) => recordingMenu(rec).map((m) => m.label)), rid);
    const maxOff = Math.max(...results.map((r) => r.off));
    console.log(JSON.stringify({ W, maxOff, results, now, who, box, overflow, menu, errors }));
  }
  if (ACT === 'nomodel') {
    const sample = fs.readFileSync(path.join(ROOT, 'tests/fixtures/meetings/launch_sync.txt'), 'utf8');
    const id = await page.evaluate(async (notes) => {
      const made = await apiJson('/meetings', { method: 'POST', body: JSON.stringify({ title: 'Launch sync', attendees: ['Sam', 'Priya', 'Alex'], notes, category: 'Work' }) });
      await refreshEntries([made.id]).catch(() => {});
      return made.id;
    }, sample);
    await page.evaluate(() => ensureModule('meetings'));
    await page.evaluate((i) => openMeetingSheet(i), id);
    await page.waitForSelector('#meeting-summarise', { timeout: 15000 });
    const controls = await page.$$eval('.meeting-view button', (b) => b.filter((x) => x.offsetParent).map((x) => ({ label: x.textContent.trim(), disabled: x.disabled })));
    await page.click('#meeting-summarise');
    await page.waitForSelector('.meeting-proposal:not(.hidden) .meeting-proposal-list li', { timeout: 15000 });
    const found = await page.evaluate(() => ({
      status: document.querySelector('.meeting-view .status').textContent,
      head: document.querySelector('.meeting-proposal p').textContent,
      items: [...document.querySelectorAll('.meeting-proposal-list li span')].map((s) => s.textContent),
      statusError: document.querySelector('.meeting-view .status').classList.contains('error'),
    }));
    const dead = controls.filter((c) => c.disabled).length + (found.statusError ? 1 : 0);
    const overflow = await page.evaluate(() => { const c = document.querySelector('.meeting-view'); return { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, card: c.scrollWidth - c.clientWidth }; });
    console.log(JSON.stringify({ W, controls: controls.length, dead, found, overflow, errors }));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
