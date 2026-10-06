// INBOX 696, 700, 713: Background tasks rows (bar, elapsed, steps), the
// scheduled passes' Run now, and Settings, Search and index's embedding
// models (catalogue rows, found list, pull box). Numbers, not screenshots.
//   BASE=http://127.0.0.1:8839 node scratchpad/ui-sweeps/tasks696.js
const { boot } = require('./lib');

(async () => {
  const width = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.evaluate(() => document.getElementById('recovery-key-dialog')?.close());
  const out = {};

  // --- Search and index: the embedding models -------------------------------
  await page.evaluate(() => openSettingsModal('searchindex'));
  await page.waitForSelector('#embed-choices li.embed-choice', { timeout: 15000 });
  out.choices = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#embed-choices li.embed-choice')];
    const inUse = rows.filter((li) => li.textContent.includes('In use')).map((li) => li.querySelector('strong').textContent);
    const terms = rows.filter((li) => [...li.querySelectorAll('button')].some((b) => b.textContent.includes('Terms'))).length;
    const kebabs = rows.filter((li) => li.querySelector('.menu-wrap')).length;
    const facts = rows.every((li) => li.querySelector('.extras-meta') && li.querySelector('.extras-meta').textContent.split(' · ').length >= 4);
    const over = rows.filter((li) => li.scrollWidth > li.clientWidth + 1).length;
    const field = document.querySelector('.embed-pull .search-field').getBoundingClientRect();
    const pull = document.querySelector('#embed-pull-go').getBoundingClientRect();
    return { rows: rows.length, inUse, terms, kebabs, facts, overflowingRows: over,
      pullRow: { fieldW: Math.round(field.width), sameLine: Math.abs(field.top + field.height / 2 - (pull.top + pull.height / 2)) < 2 },
      foundEmptyShown: !document.querySelector('#embed-found-empty').classList.contains('hidden'),
      pageScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  // The kebab on the row in use: Uninstall muted with its reason.
  out.inUseMenu = await page.evaluate(() => {
    const li = [...document.querySelectorAll('#embed-choices li.embed-choice')].find((r) => r.textContent.includes('In use'));
    const items = [...li.querySelectorAll('.action-menu .menu-item')].map((b) => ({ label: b.textContent.trim(), muted: b.getAttribute('aria-disabled') === 'true', title: b.title }));
    return items;
  });
  // Pull a model by name, with a malformed name: refused, no network.
  await page.fill('#embed-pull-name', '../etc');
  await page.click('#embed-pull-go');
  await page.waitForTimeout(800);
  out.pullRefusal = await page.textContent('#embed-pull-status');

  // --- Background tasks: the passes' Run now --------------------------------
  await page.evaluate(() => openSettingsModal('tasks'));
  await page.waitForSelector('#job-runs-list li .job-run-now', { timeout: 15000 });
  out.passes = await page.evaluate(() => [...document.querySelectorAll('#job-runs-list li')]
    .filter((li) => li.querySelector('.job-run-now'))
    .map((li) => ({ name: li.querySelector('strong').textContent, schedule: li.querySelector('.task-detail').textContent })));
  const before = await page.evaluate(() => {
    const li = [...document.querySelectorAll('#job-runs-list li')].find((r) => r.querySelector('strong').textContent === 'Resurfacing');
    return li.querySelector('.job-line').textContent;
  });
  await page.evaluate(() => {
    const li = [...document.querySelectorAll('#job-runs-list li')].find((r) => r.querySelector('strong').textContent === 'Resurfacing');
    li.querySelector('.job-run-now').click();
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => refreshJobRuns());
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => {
    const li = [...document.querySelectorAll('#job-runs-list li')].find((r) => r.querySelector('strong').textContent === 'Resurfacing');
    return li.querySelector('.job-line').textContent;
  });
  out.runNow = { before, after };

  // A running row, faked in place from a real /tasks shape, to measure the
  // bar, the elapsed time and the steps (no real long job runs in a sweep).
  out.row = await page.evaluate(() => {
    const now = Date.now() / 1000;
    renderTasks({ now, history: [], tasks: [
      { kind: 'extra', name: 'bulk', label: 'Installing 3 packages', detail: '2 of 3', progress: 1 / 3, log: [], started: now - 75, cancellable: true,
        steps: [{ label: 'Voice', outcome: 'completed' }, { label: 'OCR', outcome: 'running' }, { label: 'Code', outcome: 'queued' }] },
      { kind: 'reindex', name: '', label: 'Re-indexing', detail: '', progress: null, log: [], started: now - 5, cancellable: false },
    ] });
    const lis = [...document.querySelectorAll('#task-list > li')];
    return lis.map((li) => {
      const bar = li.querySelector(':scope > progress.task-progress');
      return {
        elapsed: li.querySelector('.task-elapsed')?.textContent,
        bar: bar ? { determinate: bar.hasAttribute('value'), value: bar.value, w: Math.round(bar.getBoundingClientRect().width) } : null,
        steps: [...li.querySelectorAll('.task-step')].map((s) => s.textContent.trim()),
        stepBar: !!li.querySelector('.task-step.is-running progress'),
        stop: [...li.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => t.includes('Stop')),
      };
    });
  });
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
