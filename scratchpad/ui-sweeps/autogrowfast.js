// autoGrow's fast path (settings-panes.js `autoGrowStillFits`) leaves every
// box exactly the height the full measure would give it.
//
// In the chat composer and the Reminders magic-add box: type a long run a key
// at a time; after every tenth key, the height the box has is compared with
// the height the full path gives it from scratch (its memory cleared, then
// `autoGrow` run). Then a line break per key up to the cap (the box must stop
// growing and scroll), then Backspace to empty (it must come back to its
// empty height). 0 mismatches is the pass.
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/autogrowfast.js
const { boot } = require('./lib.js');

const results = [];
const check = (label, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

async function probe(page, id) {
  return page.evaluate((i) => {
    const el = document.getElementById(i);
    const had = { h: el.style.height, o: el.style.overflowY };
    const keep = el._autoGrownValue;
    delete el._autoGrownValue;
    autoGrow(el);
    const full = { h: el.style.height, o: el.style.overflowY };
    el._autoGrownValue = keep;
    return { had, full, same: had.h === full.h && had.o === full.o };
  }, id);
}

(async () => {
  const { browser, page } = await boot({});
  try {
    for (const target of [
      { id: 'chat-input', open: () => page.evaluate(() => { switchTab('chat'); }) },
      { id: 'magic-reminder-input', open: () => page.evaluate(() => { switchTab('reminders'); }) },
    ]) {
      await target.open();
      await page.waitForTimeout(1500);
      const exists = await page.evaluate((i) => { const el = document.getElementById(i); if (!el) return false; el.disabled = false; return el.getClientRects().length > 0; }, target.id);
      if (!exists) { console.log(`skip ${target.id}: not on screen`); continue; }
      await page.click(`#${target.id}`);
      const empty = await page.evaluate((i) => document.getElementById(i).style.height, target.id);
      let mismatches = 0;
      const text = 'a long sentence that wraps across the composer more than once so the box has to grow with it ';
      for (let n = 0; n < 160; n++) {
        await page.keyboard.type(text[n % text.length]);
        if (n % 10 === 9) {
          const p = await probe(page, target.id);
          if (!p.same) { mismatches += 1; console.log('  mismatch', JSON.stringify(p)); }
        }
      }
      const grown = await page.evaluate((i) => document.getElementById(i).style.height, target.id);
      check(`${target.id}: a key at a time, the height matches the full measure`, mismatches === 0, `${mismatches} mismatches; empty ${empty}, after 160 keys ${grown}`);
      for (let n = 0; n < 40; n++) await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('x');
      const cap = await probe(page, target.id);
      check(`${target.id}: past the cap it stops and scrolls, as the full measure says`, cap.same && cap.had.o === 'auto', JSON.stringify(cap.had));
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(200);
      const back = await page.evaluate((i) => document.getElementById(i).style.height, target.id);
      check(`${target.id}: emptied, it is its empty height again`, back === empty, `${back} (empty was ${empty})`);
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((x) => !x).length;
  console.log(`${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
