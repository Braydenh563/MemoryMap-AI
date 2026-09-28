// INBOX 277: the line under the utility picker says what background jobs run
// on, and it follows the smart model routing switch.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8801';
const {boot} = require('./lib.js');
(async () => {
  const {browser, page} = await boot();
  let fails = 0;
  const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${got}`); if (!ok) fails++; };
  // The model pickers are hidden while no backend answers, so point the app
  // at the stand-in server (scratchpad/fake_openai_server.py, FAKE).
  await page.evaluate(async (base) => {
    await api('/models/provider', {method: 'POST', body: JSON.stringify({provider: 'openai', base_url: base})});
    await api('/models/chat-model', {method: 'POST', body: JSON.stringify({name: 'fake-local-tools'})});
    // Stored on, as it ships, and set without touching the page, so the box
    // has to learn it from the server when Models opens.
    await api('/preferences', {method: 'PUT', body: JSON.stringify({smart_model_routing_enabled: true})});
    await refreshModelStatus();
  }, process.env.FAKE || 'http://127.0.0.1:8802/v1');
  await page.evaluate(() => openSettingsModal('models', 'utility-model-select'));
  await page.waitForTimeout(1500);
  const read = () => page.evaluate(() => {
    const n = document.getElementById('utility-model-note');
    const r = n.getBoundingClientRect();
    return {text: n.textContent, h: r.height, w: r.width, routing: document.getElementById('pref-smart-model-routing').checked,
      label: document.querySelector('#pref-smart-model-routing + span').textContent};
  });
  let s = await read();
  check('note drawn', s.h > 0 && /Background jobs run on/.test(s.text), JSON.stringify(s));
  check('box shows the stored value on opening Models', s.routing === true, s.routing);
  check('label sentence case', s.label === 'Use smart model routing for background jobs', s.label);
  const before = s.text;
  await page.click('#pref-smart-model-routing');
  await page.waitForTimeout(1500);
  s = await read();
  check('routing off says so', !s.routing && /smart model routing is off/.test(s.text), s.text);
  await page.click('#pref-smart-model-routing');
  await page.waitForTimeout(1500);
  s = await read();
  check('routing on restores', s.routing && s.text === before, s.text);
  console.log(`findings: ${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
