// The README's Notes shot in the dark theme, and its Ask shot: a real question
// asked of a seeded notebook, answered through the app's own Ask path, with
// the citations the app itself draws.
//
// The owner, 2026-09-28: retake the Notes screenshot in dark, and add one of
// the Ask sub-tab "showing a proper question and a sample AI answer". The
// earlier Notes shot was taken on a data dir other sweeps had used, and its
// first card was "Sweep image note", a fixture's leftover; this one starts
// from an empty data dir and seeds only notes a person could have written.
//
// **What is real and what is stood in.** The notes, the search that picks the
// matching records, the grounding that numbers the citations and every pixel
// of the page are the app's own. The model is `scratchpad/fake_answer_server.py`
// with FAKE_ANSWER_FILE set: this sandbox has no model, so the words of the
// answer are written here (ANSWER below), in the notes' own vocabulary, and the
// app grounds them against the retrieved notes exactly as it would a real
// model's. A citation that did not land would be missing from the picture, not
// drawn in by this script.
//
//   bash scratchpad/ui-sweeps/serve.sh 8871 /tmp/mm-readme   # a FRESH data dir
//   SEED=1 BASE=http://127.0.0.1:8871 OUT=docs/screenshots \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/readme-ask.js
//
// SEED=1 once per data dir; a retake leaves it off. ONLY=notes or ONLY=ask
// takes one of the two.
process.env.THEME = process.env.THEME || 'dark';
const { boot } = require('./lib.js');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..', '..');
const PY = process.env.SWEEP_PY || '/home/user/MemoryMap-AI/.venv/bin/python';
const OUT = process.env.OUT || 'docs/screenshots';
const FAKE_PORT = Number(process.env.FAKE_PORT || 8872);
const FAKE = `http://127.0.0.1:${FAKE_PORT}/v1`;
const MODEL = 'local-model';

//: Oldest first: the Notes list sorts newest first, so the last five here are
//: the cards on screen. Each is an ordinary `POST /entries` with the category
//: and tags the app itself uses; nothing is special-cased for the camera.
const NOTES = [
  ['# Questions for Thursday\n\nWho owns the migration after launch, and what happens to the old export format when it goes.', ['work', 'meetings'], 'Work'],
  ['# Dentist\n\nCall about the appointment on Thursday, and ask about the retainer while I am there.', ['admin', 'health'], 'Personal'],
  ['# Reading list\n\n- Designing Data-Intensive Applications\n- The Design of Everyday Things\n- Four Thousand Weeks', ['reading', 'books'], 'Reading'],
  ['# Passport renewal\n\nMine expires in June. Renew it before the Kyoto trip in April: the online form takes about three weeks.', ['travel', 'admin'], 'Travel'],
  ['# Why the graph felt slow\n\nIt was not the physics. The simulation kept ticking after leaving the tab, so every other screen paid for it. Stopping it on navigate fixed the whole class.', ['engineering', 'performance'], 'Work'],
  ['# Tomato soup\n\nRoast the tomatoes first, then add a little smoked paprika. Blend half and leave the rest chunky.', ['cooking', 'recipes'], 'Personal'],
  ['# Kyoto, getting around\n\nBuy an ICOCA card at Kansai airport; it covers the buses and the Keihan line. The JR pass is not worth it for a Kyoto-only week.', ['travel', 'kyoto'], 'Travel'],
  ['# Physio, left knee\n\nFoam roll the IT band after every long run. Single-leg squats twice a week, three sets of ten.', ['running', 'health'], 'Health'],
  ['# Mind map idea\n\nA node on a board can be a real note, so the map and the notebook stay one thing. Tab adds a branch, Enter one beside it.', ['ideas', 'boards'], 'Ideas'],
  ['# Retro: what actually helped\n\nMeasuring before changing. What did not: reading the source instead of running it, twice in one week.', ['work', 'retro'], 'Work'],
  ['# Podcast notes: habits\n\nMaking the good thing the easy thing beats willpower. Lay the running kit out the night before.', ['habits', 'podcasts'], 'Reading'],
  ['# Kyoto, what to book first\n\nThe ryokan in Arashiyama fills six months out, so book it before anything else. Trains can wait; that cannot.', ['travel', 'kyoto'], 'Travel'],
  ['# Birthday plans for Mum\n\nBook the table at the Italian place for the 14th and order the lemon cake by the Friday before.', ['family', 'plans'], 'Personal'],
  ['# Reading: Thinking in Systems\n\nStocks and flows, and why a delay inside a feedback loop makes a system oscillate instead of settle.', ['reading', 'systems'], 'Reading'],
  ['# Meeting with Sam\n\nAgreed the Q4 plan: three workstreams, review on the 20th. Sam owns the migration; I take the export format.', ['work', 'meetings'], 'Work'],
  ['# Bread, third attempt\n\nLonger cold proof, 20 hours. Better crumb, still pale on the bottom: try the stone one shelf lower next time.', ['cooking', 'baking'], 'Personal'],
  ['# Kyoto, day plans\n\nFushimi Inari at dawn, before the crowds. Kiyomizu-dera and the Higashiyama walk on the same afternoon. Keep one day free for Nara.', ['travel', 'kyoto'], 'Travel'],
  ['# Half marathon, week 4\n\nEasy pace is still too fast. Slow the Tuesday run down until it is boring, then hold it for three weeks.', ['running', 'health'], 'Health'],
];

const QUESTION = 'What do I still need to sort out before the Kyoto trip?';

//: Written the way a good small model answers this: a short lead, one bullet
//: per thing to do, and the part already done. Every sentence reuses the words
//: of the note it comes from, which is what lets the app's grounding number it.
const ANSWER = [
  'Your days are already planned: Fushimi Inari at dawn, Kiyomizu-dera and the Higashiyama walk on the same afternoon, and one day kept free for Nara.',
  '',
  'Three things are still to do, in the order your notes put them:',
  '',
  '- **Book the ryokan in Arashiyama first.** It fills six months out, so book it before anything else; the trains can wait.',
  '- **Renew your passport.** It expires in June and the Kyoto trip is in April, and the online form takes about three weeks.',
  '- **Buy an ICOCA card at Kansai airport.** It covers the buses and the Keihan line, and the JR pass is not worth it for a Kyoto-only week.',
].join('\n');

const FOLLOWUPS = [
  'When does the Arashiyama ryokan need booking by?',
  'What did I plan for the free day in Nara?',
].join('\n');

function waitForFake() {
  return new Promise((resolve) => {
    let tries = 0;
    const poke = () => {
      const req = http.get(`http://127.0.0.1:${FAKE_PORT}/v1/models`, (res) => { res.resume(); resolve(true); });
      req.on('error', () => (++tries > 40 ? resolve(false) : setTimeout(poke, 250)));
    };
    poke();
  });
}

//: The same three artefacts of this sandbox that readmeshots.js hides, for the
//: same reasons it gives: a "Search AI didn't load" badge (no
//: sentence-transformers here, by CLAUDE.md section 7), the first-run
//: embedding monitor, and its toast.
const tidy = (page) => page.evaluate(() => {
  for (const el of document.querySelectorAll('.ai-status-wrap')) el.style.visibility = 'hidden';
  document.getElementById('agent-monitor')?.classList.add('hidden');
  document.getElementById('toast-box')?.replaceChildren();
});

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-ask-'));
  fs.writeFileSync(path.join(tmp, 'answer.md'), ANSWER);
  fs.writeFileSync(path.join(tmp, 'followups.txt'), FOLLOWUPS);
  const fake = spawn(PY, [path.join(ROOT, 'scratchpad', 'fake_answer_server.py'), String(FAKE_PORT)], {
    cwd: ROOT,
    env: {
      ...process.env,
      FAKE_ANSWER_FILE: path.join(tmp, 'answer.md'),
      FAKE_FOLLOWUPS_FILE: path.join(tmp, 'followups.txt'),
      FAKE_DELAY_MS: '15',
      //: A neutral name for the badge a reader sees, not a fixture's.
      FAKE_MODEL: MODEL,
    },
    stdio: 'ignore',
  });
  const fakeUp = await waitForFake();
  const { browser, page } = await boot();
  const done = [];
  try {
    if (process.env.SEED) {
      const made = await page.evaluate(async (notes) => {
        const out = [];
        for (const [content, tags, category] of notes) {
          const r = await api('/entries', { method: 'POST', body: JSON.stringify({ content, tags, category }) });
          out.push(r.status);
          //: One at a time: "newest first" sorts on `created_at`.
          await new Promise((r2) => setTimeout(r2, 150));
        }
        return out;
      }, NOTES);
      console.log('seeded', JSON.stringify(made));
    }
    //: The model is connected after the notes are in, so seeding files them
    //: by the categories given rather than asking the stand-in to.
    const provider = await page.evaluate(async ({ base, model }) => {
      const r = await api('/models/provider', { method: 'POST', body: JSON.stringify({ provider: 'openai', base_url: base }) });
      await api('/models/chat-model', { method: 'POST', body: JSON.stringify({ name: model }) }).catch(() => null);
      return r.status;
    }, { base: FAKE, model: MODEL });
    console.log('fake up', fakeUp, 'provider', provider);
    //: The status poll is what the offline notice and the model picker read,
    //: and it last ran before the model was connected: asked for now rather
    //: than waited for, or the shot says "No model is connected" over an
    //: answer the model wrote.
    await page.evaluate(() => refreshModelStatus());
    await page.waitForTimeout(1200);
    //: Through the app, as readmeshots.js explains: the server-side theme
    //: preference wins over anything put in storage before boot.
    await page.evaluate(() => applyThemeChoice('dark', true));
    await page.waitForTimeout(900);

    const shoot = async (file) => {
      await tidy(page);
      await page.mouse.move(1439, 899);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.waitForTimeout(600);
      const p = `${OUT}/${file}.png`;
      await page.screenshot({ path: p });
      done.push({ file, bytes: fs.statSync(p).size });
    };

    if (!process.env.ONLY || process.env.ONLY === 'notes') {
      await page.evaluate(() => switchTab('notes'));
      await page.evaluate(() => window.showNotesSection && showNotesSection('browse'));
      await page.evaluate(() => window.loadEntries && loadEntries());
      await page.waitForTimeout(3000);
      await shoot('notes');
    }

    if (!process.env.ONLY || process.env.ONLY === 'ask') {
      await page.evaluate(() => switchTab('notes'));
      await page.evaluate(() => showNotesSection('ask'));
      await page.waitForTimeout(900);
      //: Typed and sent the way a person does: the box, then the Ask button.
      await page.fill('#question', QUESTION);
      await page.click('#ask-btn');
      await page.waitForFunction(() => !document.getElementById('ai-answer').classList.contains('is-generating'),
        null, { timeout: 60000 }).catch(() => null);
      //: Follow-ups arrive after the answer, on a second call.
      await page.waitForTimeout(3500);
      const state = await page.evaluate(() => ({
        answer: document.getElementById('ai-answer').innerText.slice(0, 120),
        cites: document.querySelectorAll('#ai-answer sup, #ai-answer .cite, #ai-answer a[data-note-id], #ai-answer .citation').length,
        records: document.querySelectorAll('#raw-results > li').length,
        followups: document.querySelectorAll('#ask-followups button').length,
      }));
      console.log('ask', JSON.stringify(state));
      //: The question stays in the box, as it does after asking.
      await page.fill('#question', QUESTION);
      await shoot('ask');
    }
  } finally {
    console.log(JSON.stringify(done));
    await browser.close();
    fake.kill();
  }
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
