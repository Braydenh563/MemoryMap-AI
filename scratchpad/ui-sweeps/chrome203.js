// INBOX 203: every AI-only control disabled while no model is running, and
// the same set enabled when one is. The status route is stubbed both ways so
// the measurement does not depend on what this sandbox has installed.
const { boot } = require('./lib.js');

const NO_MODEL = { ollama_running: false, models: [], current_model: null };
const WITH_MODEL = { ollama_running: true, models: ['fake-model'], current_model: 'fake-model' };

async function stub(page, payload) {
  await page.route('**/models/status*', async (route) => {
    const real = await route.fetch().catch(() => null);
    let body = payload;
    if (real) {
      try {
        body = { ...(await real.json()), ...payload };
      } catch (e) { /* keep the stub as-is */ }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function count(page) {
  return await page.evaluate(() => {
    const marked = [...document.querySelectorAll('[data-needs-model]')];
    return {
      marked: marked.length,
      disabled: marked.filter((el) => el.disabled).length,
      titled: marked.filter((el) => /Connect a model in Settings/.test(el.title)).length,
      notDisabled: marked.filter((el) => !el.disabled).map((el) => el.id),
      sample: marked.slice(0, 2).map((el) => `${el.id}: ${el.title}`),
    };
  });
}

(async () => {
  const { browser, page } = await boot({});
  await stub(page, NO_MODEL);
  await page.evaluate(() => refreshModelStatus());
  await page.waitForTimeout(1500);
  console.log('203 with no model:', JSON.stringify(await count(page)));

  await page.unroute('**/models/status*');
  await stub(page, WITH_MODEL);
  await page.evaluate(() => refreshModelStatus());
  await page.waitForTimeout(1500);
  console.log('203 with a model:', JSON.stringify(await count(page)));
  await browser.close();
})();
