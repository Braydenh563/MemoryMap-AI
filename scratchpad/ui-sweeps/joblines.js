// Settings "Last run" lines and the Background jobs overview (INBOX 438).
//
//   BASE=http://127.0.0.1:8847 DATA=/tmp/mm-jobs node scratchpad/ui-sweeps/joblines.js
//   THEME=dark ... for dark
//
// Runs a re-index and a backup and watches the lines update, then forces a
// backup to fail (the backups folder replaced by a file) and checks the reason
// is on screen in the error colour and nowhere else. Measures: the line text,
// its tooltip, its computed colour against a neighbouring status line, no
// horizontal overflow at 1440 and 390, and the overview listing every kind.
const fs = require('fs');
const path = require('path');
const { boot, OUT } = require('./lib');

(async () => {
  let failed = 0;
  const check = (ok, what, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? `  ${detail}` : ''}`);
    if (!ok) failed += 1;
  };
  const DATA = process.env.DATA || '/tmp/mm-jobs';
  for (const width of [1440, 390]) {
    const { browser, page } = await boot({ viewport: { width, height: 900 } });
    console.log(`--- ${width} ${process.env.THEME || 'light'}`);
    const line = (kind) => page.evaluate((k) => {
      const el = document.querySelector(`.settings-section:not(#settings-tasks) [data-job-line="${k}"]`);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        text: el.textContent.trim(), title: el.title, color: cs.color, size: cs.fontSize,
        error: el.classList.contains('error'), spinner: !!el.querySelector('.spinner'),
        visible: el.offsetParent !== null, w: el.getBoundingClientRect().width,
      };
    }, kind);

    // Something to index.
    await page.evaluate(async () => {
      for (const c of ['alpha note about sourdough', 'beta note about espresso', 'gamma note about bread']) {
        await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: c }) });
      }
    });

    // 1. Search index.
    await page.evaluate(() => openSettingsModal('searchindex'));
    await page.waitForTimeout(800);
    let m = await line('reindex');
    check(m && m.visible, 'reindex line is on screen', JSON.stringify(m));
    await page.click('#reindex-start');
    await page.waitForTimeout(2500);
    m = await line('reindex');
    check(m && /Last run .*· succeeded · \d+ notes? indexed/.test(m.text), 'reindex line says succeeded and how many', m && m.text);
    check(m && m.title.length > 8, 'the exact time is on hover', m && m.title);
    check(m && !m.error, 'a success is not red');
    const backfill = await line('embeddings-backfill');
    check(backfill && backfill.visible, 'embeddings backfill line is on screen', backfill && backfill.text);
    await page.screenshot({ path: path.join(OUT, `joblines-reindex-${width}.png`) });

    // 2. Backup.
    await page.evaluate(() => showSettingsSection('data'));
    await page.waitForTimeout(800);
    await page.click('#backup-now');
    await page.waitForTimeout(2500);
    m = await line('backup');
    check(m && /succeeded · saved memorymap-.*\.db/.test(m.text), 'backup line says succeeded and the file', m && m.text);
    const status = await page.evaluate(() => getComputedStyle(document.getElementById('backup-status')).color);
    check(m && m.color === status, 'the quiet line is the status colour', `${m && m.color} vs ${status}`);
    await page.screenshot({ path: path.join(OUT, `joblines-backup-${width}.png`) });

    // 3. Force a failure: the backups folder becomes a file.
    const dir = path.join(DATA, 'backups');
    const parked = path.join(DATA, 'backups-parked');
    fs.renameSync(dir, parked);
    fs.writeFileSync(dir, 'not a folder');
    try {
      await page.click('#backup-now');
      await page.waitForTimeout(2500);
      m = await line('backup');
      check(m && /failed: /.test(m.text), 'a failed backup shows its reason', m && m.text);
      check(m && m.error && m.color !== status, 'a failure is the only red', `${m && m.color} vs ${status}`);
      await page.screenshot({ path: path.join(OUT, `joblines-fail-${width}.png`) });
    } finally {
      fs.unlinkSync(dir);
      fs.renameSync(parked, dir);
    }

    // 4. Overview.
    await page.evaluate(() => showSettingsSection('tasks'));
    await page.waitForTimeout(1200);
    const overview = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#job-runs-list li')];
      return {
        count: rows.length,
        first: rows[0] && rows[0].textContent.replace(/\s+/g, ' ').trim(),
        backup: (rows.find((r) => /Backup/.test(r.textContent)) || {}).textContent,
        never: rows.filter((r) => /Not run yet/.test(r.textContent)).length,
        overflow: document.getElementById('settings-tasks').scrollWidth - document.getElementById('settings-tasks').clientWidth,
      };
    });
    check(overview.count >= 15, 'the overview lists every kind', JSON.stringify(overview));
    check(/failed|succeeded/.test(overview.backup || ''), 'the overview carries the backup run', overview.backup);
    check(overview.overflow <= 0, 'no horizontal overflow in Background tasks', String(overview.overflow));
    await page.evaluate(() => document.getElementById('job-runs-group').scrollIntoView());
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `joblines-overview-${width}.png`), fullPage: false });

    // 5. A running job shows the ring.
    await page.evaluate(async () => {
      // Stands in for a long job: the line paints whatever the list says.
      jobRunsList = jobRunsList.map((r) => (r.kind === 'import' ? { ...r, ran: true, status: 'running', started_at: new Date().toISOString() } : r));
      document.querySelectorAll('[data-job-line="import"]').forEach((el) => { el.dataset.jobSig = ''; paintJobLine(el); });
    });
    const running = await page.evaluate(() => {
      const el = document.querySelector('#job-runs-list [data-job-line="import"]');
      return { text: el.textContent.trim(), ring: !!el.querySelector('.spinner') };
    });
    check(running.ring && /Running/.test(running.text), 'a running job shows the ring and Running', JSON.stringify(running));

    const errors = await page.evaluate(() => window.__errs || []);
    check(errors.length === 0, 'no page errors');
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
})();
