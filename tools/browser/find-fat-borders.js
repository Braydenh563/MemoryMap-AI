// Sweep every input, textarea and select in the app for the "3px fingerprint".
//
// `border: none` — whether the app writes it or the browser's own stylesheet
// does — sets the border *style* to none and leaves the *width* at its initial
// `medium`. The Appearance system forces `border-style: var(--border-style)
// !important` onto every input so a user's chosen style cannot be defeated by a
// stray local rule, and that brings `medium` back: 3px, on a control every
// stylesheet involved believes has no border. It is invisible in the source and
// obvious on screen, which is how it has been reported three times now (the
// popup agent's input, the ask composer, the OCR "Find in what was read" box).
//
// Two `!important`s are settled by specificity, and the Appearance rule is
// (0,5,1) — so the answering rule needs an id, not a class. That is the part
// that gets forgotten; this script is how you find out you forgot it.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers SCRATCH=<dir> node tools/browser/find-fat-borders.js
//
// Expected output: "3px-border controls: 0".
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  // Overlays and dialogs hold several of the app's most-customised fields, and
  // a hidden element still computes styles — so reveal them all rather than
  // sweeping only what happens to be on the first screen.
  await page.evaluate(() => {
    document.querySelectorAll('.modal-overlay, .modal, dialog, .tab-page')
      .forEach((n) => n.classList.remove('hidden'));
  });
  await page.waitForTimeout(1200);
  const hits = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('input, textarea, select').forEach((el) => {
      // Every border this app draws deliberately is 1px; 3px is the fingerprint.
      if (parseFloat(getComputedStyle(el).borderTopWidth) < 2.5) return;
      out.push({
        tag: el.tagName, type: el.type || '-', id: el.id || '-',
        cls: String(el.className).slice(0, 44),
        parent: el.parentElement
          ? `${el.parentElement.tagName}.${String(el.parentElement.className).slice(0, 30)}`
          : '-',
      });
    });
    return out;
  });
  console.log(`3px-border controls: ${hits.length}`);
  hits.forEach((h) => console.log(` ${h.tag}[${h.type}] #${h.id} .${h.cls}  in ${h.parent}`));
  await browser.close();
  process.exitCode = hits.length ? 1 : 0;
})();
