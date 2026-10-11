// INBOX 803 (the owner): "when I click the capture a note textbox in the
// capture subtab for the first time, it adjusts a bit because the line numbers
// werent originally showing." Turns Line numbers on, opens Capture, types
// nothing, and measures where the first line's text starts (viewport x of the
// first character) before the first click and after it. A shift is the bug.
//   BASE=http://127.0.0.1:8868 W=1440 node scratchpad/ui-sweeps/capturegutter.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.evaluate((v) => prefs.set('doc-gutter', v), process.env.OFF ? '0' : '1');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  if (await page.isVisible('#lock-password').catch(() => false)) { await page.fill('#lock-password', 'testpassword123'); await page.click('#lock-submit'); }
  await page.waitForTimeout(3000);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(600);
  await page.click('[role=tab][data-section="capture"]');
  await page.waitForTimeout(1500);
  const read = () => page.evaluate(() => {
    const ta = document.getElementById('entry-content');
    const wrap = ta.closest('.gutter-wrap');
    const cm = wrap && wrap.querySelector('.cm-editor');
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    //: Where the first character's text starts: the CodeMirror line's content,
    //: or the textarea's own padding box edge.
    const line = cm && cm.querySelector('.cm-line');
    const lineRect = line ? line.getBoundingClientRect() : null;
    const cs = getComputedStyle(ta);
    const gutter = wrap && wrap.querySelector('.doc-gutter');
    const kids = [...ta.closest('.note-composer').children].map((e) => `${e.id || e.className.toString().slice(0, 18)}@${Math.round(e.getBoundingClientRect().y * 10) / 10}+${Math.round(e.getBoundingClientRect().height * 10) / 10}`).join(' ');
    const tb = document.getElementById('note-toolbar'); const tcs = getComputedStyle(tb);
    return {
      tb: `${tb.className} h=${tcs.height} pad=${tcs.paddingTop}/${tcs.paddingBottom} mb=${tcs.marginBottom} items=${[...tb.children].filter((c) => c.offsetParent).length}`,
      kids,
      surface: cm ? 'codemirror' : 'textarea',
      textX: cm ? (lineRect ? +(lineRect.x + parseFloat(getComputedStyle(line).paddingLeft || 0)).toFixed(1) : null) : +(ta.getBoundingClientRect().x + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)).toFixed(1),
      box: r(cm || ta), gutterHidden: gutter ? gutter.classList.contains('hidden') : null, gutterW: gutter ? r(gutter).w : null,
      cmGutterW: cm ? (r(cm.querySelector('.cm-gutters')) || {}).w ?? 0 : null, hasGutterClass: ta.classList.contains('has-gutter'),
    };
  });
  const before = await read();
  await page.click('#entry-content, .gutter-wrap .cm-content').catch(() => {});
  await page.waitForTimeout(1500);
  const after = await read();
  console.log('before', JSON.stringify(before));
  console.log('after ', JSON.stringify(after));
  const shift = before.textX !== null && after.textX !== null ? +(after.textX - before.textX).toFixed(1) : 'n/a';
  console.log(`first-line text x shifts ${shift}px on the first click; box top ${before.box && before.box.y} to ${after.box && after.box.y}, height ${before.box && before.box.h} to ${after.box && after.box.h}`);
  await browser.close();
  process.exit(shift === 0 ? 0 : 1);
})();
