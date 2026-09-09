// The README's eight screenshots, recaptured. HANDOVER done-when item 5b, and
// the owner's own note: "I think the screen shots on the readme need an
// update from all the ui changes."
//
// Light theme at 1440x900, which is what the existing set is and what the
// README's 850px-wide <img> tags are sized for. One file per tab, written
// straight over docs/screenshots/.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const PW = 'testpassword123';
const BASE = process.env.BASE || 'http://127.0.0.1:8800';
const OUT = process.env.OUT || 'docs/screenshots';

// Documents is a Library sub-tab, so it is reached differently from the rest.
const SHOTS = [
  { file: 'dashboard', tab: 'dashboard' },
  { file: 'notes', tab: 'notes' },
  { file: 'chat', tab: 'chat' },
  { file: 'graph', tab: 'graph' },
  { file: 'library', tab: 'library' },
  { file: 'timeline', tab: 'timeline' },
  { file: 'reminders', tab: 'reminders' },
  { file: 'documents', tab: 'library', sub: 'documents' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('onboardingDone', '1');
      //: The graph's own defaults spread 59 notes into a field of dots with
      //: no readable structure, which is not what the README's caption
      //: describes ("a map of notes coloured by category, with links between
      //: related notes"). Gravity at 85 pulls the map into something a
      //: reader can see the shape of. Both are ordinary settings a person can
      //: reach from the graph's own controls, not a state only a script can
      //: produce.
      localStorage.setItem('graph-gravity', '85');
      localStorage.setItem('graph-spread', '35');
    } catch (e) {}
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  await page.fill('#lock-password', PW);
  await page.click('#lock-submit');
  await page.waitForTimeout(3500);
  await page.evaluate(() => { const o = document.getElementById('onboarding-overlay'); if (o) o.classList.add('hidden'); });
  //: **One thing is hidden, and only this one.** `#ai-status` shows a red
  //: badge here reading "Search AI didn't load, ModuleNotFound", because this
  //: sandbox deliberately never installs `sentence-transformers` (CLAUDE.md
  //: section 7 forbids it). That is an artefact of the machine the shots are
  //: taken on, not a state a person who installed the app would see, so
  //: leaving it in would misrepresent the app rather than document it.
  //: Nothing else in these captures is altered: no state is faked, no empty
  //: panel is filled, and the data is whatever `seed.js` and its companions
  //: put there.
  //: `el.style` rather than `addStyleTag`: this app's CSP is `style-src
  //: 'self'` with no nonce, so an injected stylesheet is refused outright
  //: (CLAUDE.md section 6 item 4, and it refused this one on the first try).
  //: Re-applied after every tab switch, since a tab that re-renders its own
  //: status bar would put the chip back.
  const hideSandboxBadge = () => page.evaluate(() => {
    for (const el of document.querySelectorAll('.ai-status-wrap')) el.style.visibility = 'hidden';
  });
  await hideSandboxBadge();

  const done = [];
  for (const shot of SHOTS) {
    await page.click(`[data-tab="${shot.tab}"]`).catch(() => {});
    await page.waitForTimeout(2500);
    if (shot.sub === 'documents') {
      // The app's own route in, the same one `docopen.js` uses: a click on a
      // list row did not open the editor, and the README's caption describes
      // the editor rather than a list of one row.
      const opened = await page.evaluate(async () => {
        const r = await api('/documents');
        const list = await r.json();
        if (!list.length) return 'no documents';
        switchTab('documents');
        await openDocument(list[0].id);
        return 'opened ' + list[0].id;
      });
      await page
        .waitForSelector('#doc-editor .cm-content', { state: 'visible', timeout: 15000 })
        .catch(() => {});
      await page.waitForTimeout(2000);
      if (!String(opened).startsWith('opened')) console.log('NOTE:', opened);
    }
    // Nothing hovered, nothing focused: a focus ring in a marketing shot
    // reads as a rendering fault.
    await hideSandboxBadge();
    await page.mouse.move(1439, 899);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.waitForTimeout(600);
    const path = `${OUT}/${shot.file}.png`;
    await page.screenshot({ path });
    done.push({ file: shot.file, bytes: fs.statSync(path).size });
  }
  console.log(JSON.stringify(done, null, 1));
  await browser.close();
})();
