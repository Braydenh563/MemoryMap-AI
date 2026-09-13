// INBOX 205 first half: a '?' popover is on top of the surface that opened
// it, in the palette, in Settings and on a plain page.
const { boot } = require('./lib.js');

async function onTop(page, triggerSel, panelId) {
  return await page.evaluate(([sel, id]) => {
    const panel = document.getElementById(id);
    const trigger = document.querySelector(sel);
    if (!panel || !trigger) return { missing: true };
    trigger.click();
    const r = panel.getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
    return {
      z: getComputedStyle(panel).zIndex,
      inPanel: !!(hit && panel.contains(hit)),
      hit: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]}` : 'none',
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    };
  }, [triggerSel, panelId]);
}

(async () => {
  const { browser, page } = await boot({});

  await page.keyboard.press('Control+Shift+A');
  await page.waitForTimeout(700);
  console.log('205 in the palette:', JSON.stringify(await onTop(page, '[data-help-for="command-palette-help"]', 'command-palette-help')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await page.click('#settings-btn');
  await page.waitForTimeout(1200);
  await page.click('#settings-nav button[data-pane="ai"], [data-pane="ai"]').catch(() => {});
  await page.waitForTimeout(600);
  console.log('205 in Settings:', JSON.stringify(await onTop(page, '[data-help-for="backend-help"]', 'backend-help')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  await page.click('#tab-bar button[data-tab="notes"]');
  await page.waitForTimeout(400);
  await page.click('#notes-subtabs button[data-section="capture"]');
  await page.waitForTimeout(400);
  console.log('205 on a page:', JSON.stringify(await onTop(page, '#capture-help', 'capture-help-hint')));
  await browser.close();
})();
