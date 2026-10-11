// The web results fold (CHAT_PLAN decision 66, row A4; INBOX 810: "searched
// the web for the word "web" and then didnt even output the results"). The
// fold is drawn in Chat with three results, measured closed and open, then a
// title is pressed and the page is read in place (the reader's route is
// answered here, so no network is needed).
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/webfold.js
const { boot } = require('./lib.js');

const SOURCES = [
  { title: 'Best gaming mice of 2026, tested', url: 'https://example.org/mice', domain: 'example.org', snippet: 'We tested 40 mice over three months; the Logitech G Pro X Superlight 3 is the one most hands like, and the Razer Viper is the lightest.' },
  { title: 'Logitech G Pro review', url: 'https://reviews.example.com/gpro', domain: 'reviews.example.com', snippet: 'Light, fast and comfortable for a claw grip.' },
  { title: 'Razer Viper V4 Pro', url: 'https://shop.example.net/viper', domain: 'shop.example.net', snippet: '' },
];
const PAGE = { url: SOURCES[0].url, domain: 'example.org', title: SOURCES[0].title, text: Array.from({ length: 14 }, (_, i) => `Paragraph ${i + 1}. We tested every mouse on the same desk for a week, in games and at work, and wrote down what each one did well and badly.`).join('\n\n') };

(async () => {
  const { browser, page } = await boot();
  await page.route('**/websearch/read?*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAGE) }));
  const out = await page.evaluate(async (sources) => {
    await switchTab('chat');
    await ensureModule('askCompose');
    const host = document.createElement('div');
    host.className = 'msg assistant';
    host.id = 'webfold-probe';
    document.getElementById('chat-messages').appendChild(host);
    renderWebSources(host, sources);
    const fold = host.querySelector('.web-fold');
    const closed = fold.getBoundingClientRect().height;
    fold.open = true;
    const list = fold.querySelector('.web-results-list');
    const line = fold.querySelector('.web-result-line');
    return {
      summary: fold.querySelector('summary').textContent.trim(),
      closedHeight: Math.round(closed),
      openHeight: Math.round(fold.getBoundingClientRect().height),
      rows: list.children.length,
      lineEllipsis: getComputedStyle(line).textOverflow,
      lineOneRow: Math.round(line.getBoundingClientRect().height),
      openLinks: [...fold.querySelectorAll('a.web-result-open')].map((a) => a.target + ' ' + a.rel),
      panelBg: getComputedStyle(fold).backgroundColor,
    };
  }, SOURCES);
  await page.locator('#webfold-probe').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${process.env.SCRATCH}/shots/webfold-list.png`, clip: await page.locator('#webfold-probe').boundingBox() });
  await page.click('#webfold-probe .web-result-title');
  await page.waitForSelector('#webfold-probe .web-reader-text p');
  const reader = await page.evaluate(() => {
    const r = document.querySelector('#webfold-probe .web-reader');
    return {
      listHidden: document.querySelector('#webfold-probe .web-results-list').classList.contains('hidden'),
      title: r.querySelector('.web-reader-title').textContent,
      where: r.querySelector('.web-reader-where').textContent,
      paragraphs: r.querySelectorAll('.web-reader-text p').length,
      capped: r.scrollHeight > r.clientHeight,
      height: Math.round(r.getBoundingClientRect().height),
    };
  });
  await page.screenshot({ path: `${process.env.SCRATCH}/shots/webfold-reader.png`, clip: await page.locator('#webfold-probe').boundingBox() });
  await page.click('#webfold-probe .web-reader-back');
  reader.backShowsList = await page.evaluate(() => !document.querySelector('#webfold-probe .web-results-list').classList.contains('hidden'));
  console.log(JSON.stringify({ ...out, reader }, null, 1));
  await browser.close();
})();
