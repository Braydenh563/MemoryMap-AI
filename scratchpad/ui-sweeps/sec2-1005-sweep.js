// The 2026-10-05 second security pass, measured in a browser:
//   1. the one-time "Check for updates automatically?" question (fresh data dir);
//   2. Settings, Account and security: the LAN certificate's fingerprint and
//      Regenerate certificate, once the switch is on;
//   3. Settings, About: the button says "Check for updates".
//
//   UPDATE_ASK=1 BASE=http://127.0.0.1:8848 W=1440 THEME=dark node scratchpad/ui-sweeps/sec2-1005-sweep.js
const { boot, PW } = require('./lib.js');

(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const out = [];
  const check = (name, ok, detail = '') => out.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);

  // 1. The question, when this data dir has not answered it.
  const ask = await page.evaluate(() => {
    const card = [...document.querySelectorAll('.confirm-overlay')].find((o) => /Check for updates automatically/.test(o.textContent));
    if (!card) return null;
    const inner = card.querySelector('.confirm-card').getBoundingClientRect();
    const buttons = [...card.querySelectorAll('button')].map((b) => ({ text: b.textContent.trim(), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) }));
    return { inner: { x: Math.round(inner.x), w: Math.round(inner.width), right: Math.round(inner.right) }, vw: innerWidth, buttons };
  });
  if (ask) {
    check('asks once, on a card inside the window', ask.inner.x >= 0 && ask.inner.right <= ask.vw, JSON.stringify(ask.inner));
    check('two answers, said in words', ask.buttons.map((b) => b.text).join('|') === "Don't check|Check automatically", JSON.stringify(ask.buttons));
    await page.evaluate(() => [...document.querySelectorAll('.confirm-overlay button')].find((b) => /Don.t check/.test(b.textContent)).click());
    await page.waitForTimeout(800);
    const prefs = await page.evaluate(async () => (await apiJson('/preferences')).update_choice_made);
    check('the answer is remembered', prefs === true, String(prefs));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);
    const again = await page.evaluate(() => [...document.querySelectorAll('.confirm-overlay')].some((o) => /Check for updates automatically/.test(o.textContent)));
    check('and not asked again', !again);
  } else {
    out.push('SKIP the question (this data dir has answered it; UPDATE_ASK=1 on a fresh one)');
  }

  // 2. The certificate block, with the switch on.
  await page.evaluate(async (pw) => {
    await apiJson('/auth/lan-access', { method: 'POST', body: JSON.stringify({ enabled: true, current_password: pw }) });
  }, PW);
  await page.evaluate(() => openSettingsModal('account'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('account-allow-lan').closest('.settings-group').scrollIntoView());
  await page.waitForTimeout(300);
  const cert = await page.evaluate(() => {
    const block = document.getElementById('account-lan-cert');
    const fp = document.getElementById('account-lan-fingerprint');
    const group = block.closest('.settings-group');
    const r = fp.getBoundingClientRect();
    const g = group.getBoundingClientRect();
    const button = document.getElementById('account-lan-regenerate').getBoundingClientRect();
    return {
      shown: !block.classList.contains('hidden') && block.offsetParent !== null,
      text: fp.textContent,
      inside: r.left >= g.left - 1 && r.right <= g.right + 1,
      overflow: fp.scrollWidth - fp.clientWidth,
      font: getComputedStyle(fp).fontFamily.slice(0, 40),
      colour: getComputedStyle(fp).color,
      button: { w: Math.round(button.width), h: Math.round(button.height) },
      small: document.querySelector('#account-allow-lan + span small').textContent.trim(),
    };
  });
  check('the fingerprint shows once the switch is on', cert.shown && /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(cert.text), cert.text);
  check('and wraps inside its group', cert.inside && cert.overflow <= 0, JSON.stringify({ inside: cert.inside, overflow: cert.overflow }));
  check('monospaced', /mono/i.test(cert.font), cert.font);
  check('Regenerate is a real button', cert.button.h >= 24, JSON.stringify(cert.button));
  check('the line under the switch says encrypted', /encrypted connection/.test(cert.small), cert.small);
  await page.screenshot({ path: `${process.env.SHOTS || '/tmp/claude-0/sec2'}/sec2-lan-${W}-${process.env.THEME || 'light'}.png` });

  await page.click('#account-lan-regenerate');
  await page.waitForTimeout(500);
  await page.evaluate(() => [...document.querySelectorAll('.confirm-overlay button')].find((b) => b.textContent.trim() === 'Regenerate').click());
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => document.getElementById('account-lan-fingerprint').textContent);
  check('Regenerate shows a new fingerprint', after && after !== cert.text, after.slice(0, 20));

  // 3. About's button.
  const label = await page.evaluate(() => document.getElementById('update-check-now').textContent.trim());
  check('About says Check for updates', label === 'Check for updates', label);
  await page.evaluate(async (pw) => {
    await apiJson('/auth/lan-access', { method: 'POST', body: JSON.stringify({ enabled: false }) });
  }, PW);
  console.log(out.join('\n'));
  await browser.close();
})();
