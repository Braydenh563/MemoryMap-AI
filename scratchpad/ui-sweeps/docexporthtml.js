// A document exported as one self-contained HTML file. DOCUMENTS_PLAN Phase 7.
//
//   BASE=http://127.0.0.1:8944 node scratchpad/ui-sweeps/docexporthtml.js
//
// The promise being measured is "this file opens on a machine with no network,
// no MemoryMap and no account", so the sweep does the export for real, catches
// the download, reads the bytes, and then opens the saved file in a second page
// with the network cut off. Anything the file still needs from a server fails
// there and nowhere else: a stylesheet link, an icon font, an image left as
// /media/xyz.png, a link back into the app.
const fs = require('fs');
const path = require('path');
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

// A 1x1 PNG, so the image half of the export is exercised with a real file
// rather than reasoned about.
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

(async () => {
  const { browser, page, OUT } = await boot();
  const say = (k, v) => console.log(`${k}: ${JSON.stringify(v)}`);
  let bad = 0;
  const fail = (m) => { console.log('FAIL: ' + m); bad++; };

  // Upload the image through the app's own route, so the document names it the
  // way a dropped image would.
  const media = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'image/png' }), 'dot.png');
    const r = await fetch('/media/upload', {
      method: 'POST',
      headers: { 'X-Auth-Token': authToken() },
      body: form,
    });
    return r.ok ? await r.json() : { error: r.status };
  }, PNG_B64);
  say('uploaded', media);
  const src = media.url || media.path || (media.filename ? '/media/' + media.filename : null);
  if (!src) fail('could not upload an image to embed');

  const BODY = [
    '# The exported document',
    '',
    'A paragraph with **bold**, `code` and a [link out](https://example.com/page).',
    '',
    'A link into the app: [[Another document]].',
    '',
    '![A dot](' + src + ')',
    '',
    '![Missing](/media/not-a-real-file.png)',
    '',
    '| Column | Other |',
    '| --- | --- |',
    '| one | two |',
    '',
    '- [ ] a task that is not done',
    '- [x] one that is',
    '',
    '```js',
    'const x = 1;',
    '```',
    '',
    '> A quotation.',
  ].join('\n');

  await openDoc(page, { title: 'Export sweep', content: BODY });
  await page.waitForTimeout(900);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.evaluate(() => document.getElementById('doc-export-html').click()),
  ]);
  const file = path.join(OUT, 'export-sweep.html');
  await download.saveAs(file);
  const html = fs.readFileSync(file, 'utf8');
  say('file', { name: download.suggestedFilename(), bytes: html.length });
  if (!/\.html$/.test(download.suggestedFilename())) fail('the download is not named .html');

  // --- what the bytes say ------------------------------------------------
  const hosts = (html.match(/(?:https?:)?\/\/[a-z0-9.-]+/gi) || []).filter(
    (h) => !/^https?:\/\/example\.com/i.test(h)
  );
  const appLinks = html.match(/(?:href|src)="\/[^"]*"/g) || [];
  say('references', {
    hostsOtherThanTheAuthorsOwnLink: hosts.slice(0, 4),
    appRootedUrls: appLinks.slice(0, 4),
    dataUris: (html.match(/src="data:image/g) || []).length,
    scripts: (html.match(/<script/gi) || []).length,
    styleAttrs: (html.match(/ style="/g) || []).length,
    dataAttrs: (html.match(/ data-[a-z-]+=/g) || []).length,
    icons: (html.match(/class="[^"]*\bph\b/g) || []).length,
  });
  if (hosts.length) fail(`the file names a host: ${hosts.slice(0, 3)}`);
  if (appLinks.length) fail(`the file still points back at the app: ${appLinks.slice(0, 3)}`);
  if ((html.match(/src="data:image/g) || []).length !== 1) fail('the uploaded image was not inlined as a data URI');
  if (!/<h1[ >]/.test(html)) fail("the pane's h3 headings were not lifted, so the file has no h1");
  // A file the app already knows is gone is drawn as its own placeholder
  // before the export ever sees it; one that fails only at export time becomes
  // its alt text. Either way the page says an image was there.
  if (!/\[image: Missing\]/.test(html) && !/Missing[^<]*no longer in this notebook/.test(html)) {
    fail('the missing image left no trace in the file');
  }
  if (!/Another document/.test(html)) fail('a link into the app lost its own words');
  if (/<script/i.test(html)) fail('the file carries a script');
  if (/ style="/.test(html)) fail('inline styles survived into the file');
  if (/ data-[a-z-]+=/.test(html)) fail("the app's own data- handles survived into the file");
  if (!/<title>Export sweep<\/title>/.test(html)) fail('the file is not titled after the document');
  if (!/example\.com/.test(html)) fail('a real outward link was stripped');
  for (const wanted of ['<table', '<code', '<blockquote', 'checkbox']) {
    if (!html.includes(wanted)) fail(`the document's ${wanted} did not survive the export`);
  }

  // --- and what it looks like with the network cut off -------------------
  const offline = await browser.newContext();
  const reader = await offline.newPage();
  const blocked = [];
  await reader.route('**', (route) => {
    const url = route.request().url();
    if (url.startsWith('file://')) return route.continue();
    blocked.push(url);
    return route.abort();
  });
  const failures = [];
  reader.on('requestfailed', (r) => failures.push(r.url()));
  await reader.goto('file://' + file, { waitUntil: 'domcontentloaded' });
  await reader.waitForTimeout(600);
  const shape = await reader.evaluate(() => {
    const main = document.querySelector('main');
    const img = document.querySelector('img');
    return {
      h1: (document.querySelector('h1') || {}).textContent || null,
      headings: [...document.querySelectorAll('h1, h2, h3')].map((h) => h.tagName),
      rows: document.querySelectorAll('tr').length,
      boxes: document.querySelectorAll('input[type="checkbox"]').length,
      disabled: [...document.querySelectorAll('input[type="checkbox"]')].every((b) => b.disabled),
      imgNatural: img ? img.naturalWidth : null,
      measure: main ? +getComputedStyle(main).maxWidth.replace('px', '') : null,
      body: +document.body.getBoundingClientRect().height.toFixed(1),
      serifOrNot: getComputedStyle(document.body).fontFamily.split(',')[0].replace(/"/g, ''),
    };
  });
  say('offline-render', { ...shape, networkAttempts: blocked.length, requestFailures: failures.length });
  if (blocked.length) fail(`the file asked the network for ${blocked.length} thing(s): ${blocked.slice(0, 3)}`);
  // The pane prints the document's title first and the document's own first
  // heading after it, both at h3; lifted, both are h1.
  if (!/exported document|Export sweep/.test(shape.h1 || '')) fail(`the heading did not survive: ${shape.h1}`);
  if (shape.rows < 2) fail('the table did not survive');
  if (shape.boxes !== 2 || !shape.disabled) fail('the task boxes are missing or still clickable');
  if (shape.imgNatural !== 1) fail(`the inlined image did not decode (naturalWidth ${shape.imgNatural})`);
  if (!shape.measure || shape.measure < 300) fail(`no reading measure in the exported page (${shape.measure})`);

  await reader.screenshot({ path: path.join(OUT, 'export-html.png'), fullPage: true });
  console.log(bad ? `\nFAILED: ${bad}` : '\nOK: every export check passed');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
