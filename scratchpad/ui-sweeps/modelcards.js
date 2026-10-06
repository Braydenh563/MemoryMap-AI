// The Models screen's model cards, driven (INBOX 444). Needs the fake Ollama:
//
//   python3 scratchpad/fake_ollama_server.py 11500 &
//   OLLAMA_URL=http://127.0.0.1:11500 bash scratchpad/ui-sweeps/serve.sh 8787 /tmp/mm-settings
//   BASE=http://127.0.0.1:8787 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/modelcards.js
//
// WIDTH=390 for the phone. Exits 1 on any failed expectation. Not verified
// against a real Ollama (CLAUDE.md section 4): the fake streams the shapes
// ollama_client.py reads.
const { boot } = require('./lib.js');
const W = Number(process.env.WIDTH || 1440);
let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
  if (!ok) failed += 1;
};
(async () => {
  const phone = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  await page.evaluate(() => openSettingsModal('models'));
  await page.waitForTimeout(3500);

  // 1. The shape.
  const shape = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('#suggested-list .model-group')].map((g) => ({
      title: g.querySelector('h4').textContent,
      cards: g.querySelectorAll('.model-card').length,
      picks: g.querySelectorAll('.model-card .chip').length && [...g.querySelectorAll('.model-card-head .chip')].length,
      filled: [...g.querySelectorAll('.model-card-primary')].filter((b) => !b.classList.contains('ghost')).length,
    }));
    const first = document.querySelector('.model-card');
    return {
      groups,
      cards: document.querySelectorAll('.model-card').length,
      hasRam: /memory/.test(document.getElementById('suggested-box').textContent),
      fitChips: document.querySelectorAll('.model-card-badges .chip').length,
      overflowX: document.querySelector('#settings-modal .modal-content').scrollWidth > document.querySelector('#settings-modal .modal-content').clientWidth + 1,
      firstIsPick: !!first.querySelector('.model-card-head .chip'),
    };
  });
  check('five purpose groups of cards', shape.groups.length === 5 && shape.cards >= 30, shape);
  check('at most one filled button per group and one starting pick each', shape.groups.every((g) => g.filled <= 1 && g.picks === 1), shape.groups);
  check('cards say memory and fit', shape.hasRam && shape.fitChips >= 20);
  check('no horizontal scroll in the pane', !shape.overflowX);

  // 2. Download, progress, cancel.
  const card = page.locator('.model-card[data-model="qwen3.5:2b"]');
  await card.locator('.model-card-primary').click();
  await page.waitForFunction(() => document.querySelector('.model-card[data-model="qwen3.5:2b"]')?.dataset.state === 'downloading', null, { timeout: 15000 });
  await page.waitForTimeout(2500);
  const prog = await page.evaluate(() => {
    const c = document.querySelector('.model-card[data-model="qwen3.5:2b"]');
    return { value: c.querySelector('progress')?.value, max: c.querySelector('progress')?.max, text: c.querySelector('.model-progress-text')?.textContent, cancel: c.querySelector('.model-card-primary')?.textContent.trim() };
  });
  check('a download shows progress inline with a Cancel', prog.max > 1 && prog.value > 0 && /%/.test(prog.text) && prog.cancel === 'Cancel download', prog);
  await card.locator('.model-card-primary').click();
  await page.waitForFunction(() => document.querySelector('.model-card[data-model="qwen3.5:2b"]')?.dataset.state === 'available', null, { timeout: 15000 });
  check('Cancel returns the card to Download and says so',
    await page.evaluate(() => /cancelled/i.test(document.querySelector('.model-card[data-model="qwen3.5:2b"]').textContent)));

  // 3. Download another model: a bad name, then a pasted link.
  await page.fill('#custom-model-name', 'two words');
  await page.click('#custom-model-check');
  await page.waitForTimeout(600);
  const bad = await page.evaluate(() => ({ note: document.getElementById('custom-model-note').textContent, cls: document.getElementById('custom-model-note').className, cards: document.querySelectorAll('#custom-model-cards .model-card').length }));
  check('a bad name is refused with a reason and no card', /no spaces/.test(bad.note) && /error/.test(bad.cls) && bad.cards === 0, bad);
  await page.fill('#custom-model-name', 'https://huggingface.co/unsloth/gemma-3-4b-it-GGUF/blob/main/gemma-3-4b-it-Q4_K_M.gguf');
  await page.press('#custom-model-name', 'Enter');
  await page.waitForTimeout(800);
  const ok = await page.evaluate(() => ({ note: document.getElementById('custom-model-note').textContent, name: document.querySelector('#custom-model-cards .model-card')?.dataset.model, label: document.querySelector('#custom-model-cards .model-card-primary')?.textContent.trim() }));
  check('a pasted link is read, normalised and shown as a card', /Hugging Face/.test(ok.note) && ok.name === 'hf.co/unsloth/gemma-3-4b-it-GGUF:Q4_K_M' && ok.label === 'Download', ok);
  await page.locator('#custom-model-cards .model-card-primary').click();
  await page.waitForFunction(() => document.querySelector('#custom-model-cards .model-card')?.dataset.state === 'downloading', null, { timeout: 15000 });
  await page.waitForTimeout(2000);
  check('the custom download shows progress and Cancel the same way',
    await page.evaluate(() => { const c = document.querySelector('#custom-model-cards .model-card'); return !!c.querySelector('progress') && c.querySelector('.model-card-primary').textContent.trim() === 'Cancel download'; }));
  await page.locator('#custom-model-cards .model-card-primary').click();
  await page.waitForFunction(() => document.querySelector('#custom-model-cards .model-card')?.dataset.state === 'available', null, { timeout: 15000 });
  check('and Cancel stops it', true);

  // 4. The filter.
  const before = await page.evaluate(() => document.querySelectorAll('#suggested-list .model-card').length);
  await page.evaluate(() => document.getElementById('suggested-hide-big').closest('label').click());
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ n: document.querySelectorAll('#suggested-list .model-card').length, big: document.querySelectorAll('#suggested-list .model-card[data-fit="too_big"]').length, label: document.querySelector('#suggested-hide-wrap span').textContent }));
  check('hiding the ones too big removes them and counts them', after.n < before && after.big === 0 && /hidden/.test(after.label), { before, after });
  await page.evaluate(() => document.getElementById('suggested-hide-big').closest('label').click());

  // 5. A card's menu opens (and is not clipped by the pane).
  await page.evaluate(() => document.querySelector('.model-card[data-model="llama3.2"] .menu-wrap button').click());
  await page.waitForTimeout(400);
  const menu = await page.evaluate(() => [...document.querySelectorAll('.action-menu:not(.hidden) .menu-item')].map((i) => i.textContent.trim()));
  check('an installed card has Copy name and Remove in its menu', menu.includes('Copy name') && menu.includes('Remove'), menu);

  await browser.close();
  process.exit(failed ? 1 : 0);
})();
