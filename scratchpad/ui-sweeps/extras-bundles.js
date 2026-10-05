// INBOX 595: Settings, Packages with bundles, ticks, the selection bar and
// each installed row's ⋯, at 1440 and 390, light and dark, as numbers.
//
// The network is stubbed: GET /extras is the server's real catalogue with a
// few rows marked installed (version, size), one running and one waiting in
// a bulk, and every POST (one package or a bulk) is answered here and never
// reaches the server, so nothing is ever installed (the agent brief's rule).
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/extras-bundles.js            (THEME=dark too)
const { boot } = require('./lib.js');

const MODE = { running: false };

function shape(real) {
  const body = JSON.parse(JSON.stringify(real));
  for (const extra of body.extras) {
    if (extra.id === 'docx' || extra.id === 'pdfpages') {
      Object.assign(extra, { installed: true, version: extra.id === 'docx' ? '1.2.0' : '4.30.0', disk_bytes: extra.id === 'docx' ? 1288490 : 15938355 });
    }
  }
  if (MODE.running) {
    const ids = ['documents', 'voice', 'desktop'];
    body.running = true;
    body.step = 'Collecting markitdown[docx,pdf,pptx]';
    body.log = ['Collecting markitdown[docx,pdf,pptx]'];
    body.bulk = {
      running: true, action: 'install', bundle: '', done: 0, total: 3, outcome: '', message: '',
      items: ids.map((id, i) => ({ id, label: body.extras.find((e) => e.id === id).label, outcome: i === 0 ? 'running' : 'queued', message: '' })),
    };
    for (const extra of body.extras) {
      if (extra.id === 'documents') Object.assign(extra, { installing: true, step: body.step });
      if (extra.id === 'voice' || extra.id === 'desktop') extra.queued = true;
    }
  } else {
    body.bulk = {
      running: false, action: 'install', bundle: 'documents', done: 3, total: 3, outcome: 'failed',
      message: 'Installed 1 of 3. Not done: Import documents (markitdown). Restart MemoryMap to use what was installed.',
      items: [
        { id: 'documents', label: 'Import documents (markitdown)', outcome: 'failed', message: 'pip exited with code 1: ERROR: Could not find a version that satisfies the requirement markitdown.' },
        { id: 'docx', label: 'Export to Word (python-docx)', outcome: 'completed', message: 'Installed.' },
        { id: 'pdfpages', label: 'Read scanned PDFs (pypdfium2)', outcome: 'skipped', message: 'Already installed.' },
      ],
    };
  }
  return body;
}

(async () => {
  let fails = 0;
  const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${got}`); if (!ok) fails++; };
  const posts = [];
  for (const width of [1440, 390]) {
    const phone = width === 390;
    const { browser, page } = await boot(phone ? { viewport: { width, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width, height: 900 } });
    await page.route('**/extras**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (req.method() !== 'GET') {
        posts.push({ path: url.pathname + url.search, body: req.postData() });
        return route.fulfill({ json: { started: true, message: url.pathname.endsWith('/bulk') ? 'Installing 2 packages.' : 'Started.' } });
      }
      if (url.pathname.endsWith('/extras')) {
        const real = await (await route.fetch()).json();
        return route.fulfill({ json: shape(real) });
      }
      return route.continue();
    });
    MODE.running = false;
    await page.evaluate(() => openSettingsModal('extras'));
    await page.waitForTimeout(1800);
    await page.evaluate(() => { packagesUi.bulkSeen = true; return renderExtras(); });
    await page.waitForTimeout(600);
    const tag = `@${width} ${process.env.THEME || 'light'}`;

    const m = await page.evaluate(() => {
      const section = document.getElementById('settings-extras');
      const scroller = section.closest('.settings-content, .modal-body, .settings-body') || section.parentElement;
      const rows = [...document.querySelectorAll('#extras-bundles .extras-row, #extras-list .extras-row')];
      const over = rows.filter((r) => r.scrollWidth > r.clientWidth + 1 || r.getBoundingClientRect().right > section.getBoundingClientRect().right + 1).map((r) => r.id);
      const kebabs = [...document.querySelectorAll('#settings-extras .menu-wrap > button')].map((b) => b.getBoundingClientRect()).map((r) => [Math.round(r.width), Math.round(r.height)]);
      const ticks = [...document.querySelectorAll('#extras-list .extras-pick')];
      const dropped = window.innerWidth >= 600 ? rows.filter((r) => {
        const name = r.querySelector('strong').getBoundingClientRect();
        return [...r.querySelectorAll('.entry-actions > button, .entry-actions .menu-wrap > button')].some((b) => b.getBoundingClientRect().top > name.top + 12);
      }).map((r) => r.id) : [];
      const meta = (id) => document.querySelector(`#extra-row-${id} .extras-meta`)?.textContent || '';
      //: The name starts on its tick's line, never under it.
      const tickApart = ticks.filter((t) => {
        const name = t.parentElement.querySelector('strong').getBoundingClientRect();
        return name.top >= t.getBoundingClientRect().bottom - 1;
      }).map((t) => t.closest('.extras-row').id);
      return {
        bundles: document.querySelectorAll('#extras-bundles .extras-row').length,
        packages: document.querySelectorAll('#extras-list .extras-row').length,
        ticks: ticks.length,
        over, dropped, kebabs, tickApart,
        pageX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        scrollerX: scroller.scrollWidth - scroller.clientWidth,
        docxMeta: meta('docx'),
        outcomeFailed: document.querySelector('#extra-row-documents .extras-outcome.is-failed')?.textContent || '',
        status: document.getElementById('extras-status').textContent,
      };
    });
    check(`six bundles and a row per package ${tag}`, m.bundles === 6 && m.packages >= 10 && m.ticks === m.packages, `${m.bundles} bundles, ${m.packages} rows, ${m.ticks} ticks`);
    check(`no sideways scroll ${tag}`, m.pageX <= 0 && m.scrollerX <= 1 && !m.over.length, `page ${m.pageX}, scroller ${m.scrollerX}, rows over ${m.over.join(',') || 'none'}`);
    check(`actions on the name's line ${tag}`, !m.dropped.length, m.dropped.join(',') || 'all');
    check(`each name beside its tick ${tag}`, !m.tickApart.length, m.tickApart.join(',') || 'all');
    const minK = Math.min(...m.kebabs.map(([w, h]) => Math.min(w, h)));
    const squareK = m.kebabs.every(([w, h]) => Math.abs(w - h) <= 1);
    check(`every ⋯ square, ${phone ? '44' : '24'}px or more ${tag}`, squareK && minK >= (phone ? 44 : 24), `${m.kebabs.length} menus, smallest ${minK}px, square ${squareK}`);
    check(`installed row says version and size ${tag}`, /version 1\.2\.0/.test(m.docxMeta) && /MB on disk/.test(m.docxMeta), m.docxMeta);
    check(`a failed bulk row says why ${tag}`, /Could not find a version/.test(m.outcomeFailed), m.outcomeFailed.slice(0, 80));
    check(`the summary line ${tag}`, /^Installed 1 of 3\./.test(m.status), m.status.slice(0, 60));

    // Contrast of the words this screen adds, against the ground under them.
    const contrast = await page.evaluate(() => {
      //: `color(srgb 1 1 1)` (the card's ground) is 0 to 1, rgb() is 0 to 255.
      const rgb = (s) => {
        const n = (s.match(/[\d.]+/g) || []).map(Number);
        return s.startsWith('color(') ? n.map((v, i) => (i < 3 ? v * 255 : v)) : n;
      };
      const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
      const ground = (el) => { for (let n = el; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > 0.9)) return c; } return [255, 255, 255]; };
      const ratio = (el) => { const a = lum(rgb(getComputedStyle(el).color)) + 0.05; const b = lum(ground(el)) + 0.05; return Math.round((Math.max(a, b) / Math.min(a, b)) * 100) / 100; };
      const out = {};
      for (const [name, sel] of [['bundle chip', '#extras-bundles .item-label'], ['outcome line', '.extras-outcome'], ['meta line', '#extra-row-docx .extras-meta'], ['subhead', '#settings-extras .setting-subhead']]) {
        const el = document.querySelector(sel);
        out[name] = el ? ratio(el) : null;
      }
      return out;
    });
    for (const [name, value] of Object.entries(contrast)) check(`${name} contrast ${tag}`, value !== null && value >= 4.5, value);

    // Tick two packages: the bar shows the count and only what applies.
    await page.click('#extra-row-voice .extras-pick');
    await page.click('#extra-row-docx .extras-pick');
    await page.waitForTimeout(200);
    const bar = await page.evaluate(() => {
      const el = document.getElementById('extras-selectbar');
      const r = el.getBoundingClientRect();
      const shown = (id) => !document.getElementById(id).classList.contains('hidden');
      const section = document.getElementById('settings-extras').getBoundingClientRect();
      return { visible: !el.classList.contains('hidden') && r.height > 0, count: document.getElementById('extras-selected-count').textContent,
        install: shown('extras-bulk-install'), reinstall: shown('extras-bulk-reinstall'), remove: shown('extras-bulk-remove'),
        inside: r.left >= section.left - 1 && r.right <= section.right + 1, position: getComputedStyle(el).position, h: Math.round(r.height) };
    });
    check(`the bar counts and offers what applies ${tag}`, bar.visible && bar.count === '2 selected' && bar.install && bar.reinstall && bar.remove, JSON.stringify(bar));
    check(`the bar is the sticky recipe, inside the section ${tag}`, bar.position === 'sticky' && bar.inside, `${bar.position}, inside ${bar.inside}, ${bar.h}px`);

    // Install from the bar: one confirm, one request with allowlist ids only.
    const before = posts.length;
    await page.click('#extras-bulk-install');
    await page.waitForSelector('.confirm-overlay .confirm-actions button', { timeout: 5000 });
    for (const b of await page.$$('.confirm-overlay .confirm-actions button')) { if ((await b.innerText()).trim() === 'Install') { await b.click(); break; } }
    await page.waitForTimeout(800);
    const sent = posts.slice(before);
    const payload = sent[0] && sent[0].body ? JSON.parse(sent[0].body) : {};
    check(`one bulk request with ids ${tag}`, sent.length === 1 && sent[0].path === '/extras/bulk' && payload.action === 'install' && JSON.stringify(payload.ids) === '["voice"]', JSON.stringify(sent));
    const cleared = await page.evaluate(() => document.getElementById('extras-selectbar').classList.contains('hidden'));
    check(`the selection clears once it started ${tag}`, cleared, cleared);

    // An installed row's ⋯ holds Reinstall and Remove.
    await page.click('#extra-row-docx .menu-wrap > button');
    await page.waitForTimeout(400);
    const menu = await page.evaluate(() => [...document.querySelectorAll('.action-menu:not(.hidden) .menu-item, .sheet .menu-item')].filter((b) => b.getBoundingClientRect().height > 0).map((b) => b.textContent.trim()));
    check(`the row's ⋯ has Reinstall and Remove ${tag}`, menu.includes('Reinstall') && menu.includes('Remove'), menu.join(' | '));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    //: One Escape closes the menu (on a phone, its action sheet) and nothing
    //: under it: the sheet used to ignore it and Settings closed instead.
    const after = await page.evaluate(() => ({
      settings: settingsModalOpen(),
      sheets: document.querySelectorAll('.sheet-overlay').length,
      menus: [...document.querySelectorAll('.action-menu:not(.hidden)')].length,
    }));
    check(`one Escape closes the menu and keeps Settings ${tag}`, after.settings && !after.sheets && !after.menus, JSON.stringify(after));

    // A bulk running: the package in hand has its bar, the others wait.
    MODE.running = true;
    await page.evaluate(() => renderExtras());
    await page.waitForTimeout(700);
    const run = await page.evaluate(() => ({
      progress: !!document.querySelector('#extra-row-documents .extras-install-progress'),
      waiting: [...document.querySelectorAll('#extras-list .item-label')].filter((c) => /Waiting/.test(c.textContent)).length,
      bundleInstall: [...document.querySelectorAll('#extras-bundles .entry-actions > button')].length,
      status: document.getElementById('extras-status').textContent,
      ticksOff: ['documents', 'voice', 'desktop'].every((id) => document.querySelector(`#extra-row-${id} .extras-pick`).disabled),
    }));
    check(`a running bulk: progress, two waiting, no bundle Install ${tag}`, run.progress && run.waiting === 2 && run.bundleInstall === 0 && run.ticksOff, JSON.stringify(run));
    check(`a running bulk's status line ${tag}`, /^1 of 3: Import documents/.test(run.status), run.status.slice(0, 70));
    await page.evaluate(() => clearTimeout(packagesUi.poll));
    await page.screenshot({ path: `${process.env.SCRATCH || '.'}/extras-bundles-${width}-${process.env.THEME || 'light'}.png`, fullPage: false });
    await browser.close();
  }
  console.log(`findings: ${fails}`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
