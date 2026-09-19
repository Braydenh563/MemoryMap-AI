// INBOX 260: does Battery-efficient mode stop the dashboard's constellation?
// Sampled off the art canvas itself, not the first p5 canvas on the page
// (which is a hidden lock-screen emblem and never moves).
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  await page.waitForTimeout(6000);
  await page.evaluate(() => { try { switchTab('dashboard'); } catch (e) {} });
  await page.waitForTimeout(4000);
  const sample = () => page.evaluate(() => {
    const c = document.querySelector('.art-holder canvas');
    if (!c) return null;
    const t = document.createElement('canvas'); t.width = 40; t.height = 40;
    t.getContext('2d').drawImage(c, 0, 0, 40, 40);
    return t.getContext('2d').getImageData(0, 0, 40, 40).data.join(',');
  });
  const state = async (label) => {
    const a = await sample();
    await page.waitForTimeout(1600);
    const b = await sample();
    console.log(label.padEnd(14), a === null ? 'no art canvas' : (a === b ? 'STILL' : 'MOVING'));
    return a !== null && a !== b;
  };
  //: The preference is stored server-side and survives a run, so the
  //: starting state is whatever the last run left. Set it off explicitly.
  await page.evaluate(() => { try { openSettingsModal('preferences'); } catch (e) {} });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const b = document.getElementById('pref-battery-mode'); if (b && b.checked) b.click(); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { try { closeSettingsModal(); switchTab('dashboard'); } catch (e) {} });
  await page.waitForTimeout(4000);
  const before = await state('battery off:');
  await page.evaluate(() => { try { openSettingsModal('preferences'); } catch (e) {} });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const b = document.getElementById('pref-battery-mode'); if (b && !b.checked) b.click(); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { try { closeSettingsModal(); switchTab('dashboard'); } catch (e) {} });
  await page.waitForTimeout(4000);
  const after = await state('battery on:');
  console.log('flag:', await page.evaluate(() => batteryModeOn()));
  // and back off again
  await page.evaluate(() => { try { openSettingsModal('preferences'); } catch (e) {} });
  await page.waitForTimeout(1800);
  await page.evaluate(() => { const b = document.getElementById('pref-battery-mode'); if (b && b.checked) b.click(); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { try { closeSettingsModal(); switchTab('dashboard'); } catch (e) {} });
  await page.waitForTimeout(4000);
  const again = await state('battery off:');
  await browser.close();
  console.log(before && !after && again ? 'PASS: moving, stopped, moving again' : 'FAIL');
})();
