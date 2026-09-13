// A look at the Images sub-tab as it ships, for INBOX 174's last line ("the
// design of the images cards in the images subtab in the library just still
// isnt professional"). Seeds four pictures in four states, captures the grid.
const { boot, OUT } = require('./lib.js');
// Four 640x420 pictures, dark, light, warm and cool, so the card is judged
// over real photographs rather than over a 2x2 white square (which is what
// every earlier capture of this grid was looking at).
const PHOTOS = require((process.env.SCRATCH || '.') + '/photos.json');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 950 } });
  await page.evaluate(async (photos) => {
    const ids = [];
    for (const [name, b64] of Object.entries(photos)) {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const fd = new FormData();
      fd.append('file', new File([bytes], `${name}.png`, { type: 'image/png' }));
      fd.append('direct', 'true');
      const r = await fetch('/media/upload', {
        method: 'POST', body: fd,
        headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
      });
      ids.push((await r.json()).id);
    }
    await api(`/media/${ids[0]}/caption`, { method: 'POST', body: JSON.stringify({ text: 'A whiteboard photographed at an angle, covered in boxes and arrows that trace an ingest pipeline.' }) });
    await api(`/media/${ids[0]}/ocr`, { method: 'POST', body: JSON.stringify({ text: 'INGEST -> PARSE -> STORE\n' }) });
    await api(`/media/${ids[1]}/caption`, { method: 'POST', body: JSON.stringify({ text: 'A slide with a title and three bullets.' }) });
  }, PHOTOS);
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#library-subtabs button')].find((e) => /image/i.test(e.textContent || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(2500);
  // Only this run's pictures, so the grid under the lens is the four states
  // rather than a wall of earlier fixtures.
  await page.evaluate(() => {
    const box = document.querySelector('#library-images-search, .library-images-search input, input[placeholder*="Search filenames"]');
    if (box) { box.value = 'photo-'; box.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await page.waitForTimeout(1500);
  const shot = `${OUT}/imgcards-${process.env.THEME || 'light'}.png`;
  await page.screenshot({ path: shot, fullPage: false });
  console.log(shot);
  await browser.close();
})();
