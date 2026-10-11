// Brief 94 (b): autocorrect outside the editor, measured. Per box: a typo
// finished with a space is corrected, the underline sits on the word for five
// seconds, a click on it, Backspace and Ctrl+Z each put the word back, the
// toast carries Undo, a search box is never touched and the switch turns it
// off. BASE=... [THEME=dark] node autocorrect94.js 1440|390
const {boot} = require('./lib.js');
(async () => {
  const width = Number(process.argv[2] || 1440);
  const phone = width < 600;
  const {browser, page} = await boot({viewport: {width, height: phone ? 844 : 900}, ...(phone ? {hasTouch: true, isMobile: true} : {})});
  const out = {width, theme: process.env.THEME || 'light', boxes: {}};
  const tab = async (name, section) => {
    await page.evaluate(([n, s]) => {
      document.getElementById(`tab-btn-${n}`)?.click();
      if (s) document.querySelector(`[role=tab][data-section="${s}"]`)?.click();
    }, [name, section]);
    await page.waitForTimeout(700);
  };
  const value = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    const view = el.parentElement?.querySelector('.note-surface .cm-content');
    return view && el.id === 'entry-content' ? view.textContent : el.value;
  }, sel);
  const clear = async (sel) => {
    await page.click(sel, {force: true}).catch(() => {});
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
  };
  //: Distinct slips per box: a word put back is left alone for the session.
  const slips = [['teh', 'hwo', 'seperate', 'somthing'], ['adn', 'cna', 'recieve', 'mroe'], ['taht', 'whre', 'beleive', 'featrues'], ['thsi', 'knoe', 'goverment', 'wierd']];
  const one = async (name, sel, focusSel = sel) => {
    const r = {};
    const [a, b, c, d] = slips.shift();
    await clear(focusSel);
    await page.waitForFunction(() => typeof autocorrectFind === 'function', null, {timeout: 5000}).catch(() => {});
    await page.keyboard.type(`I ran ${a} `, {delay: 20});
    await page.waitForTimeout(150);
    r.corrected = await value(sel);
    r.mark = await page.evaluate(() => {
      const m = document.querySelector('.autocorrect-mark');
      if (!m || m.hidden) return null;
      const b = m.getBoundingClientRect();
      const cs = getComputedStyle(m);
      const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return {w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.left), y: Math.round(b.top), border: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`, onTop: top === m};
    });
    //: The word measured on its own: a Range over the editor's text, or the
    //: field's font through a canvas for a plain box.
    r.word = await page.evaluate(([s, fixed]) => {
      const el = document.querySelector(s);
      const cm = el.parentElement?.querySelector('.note-surface .cm-content');
      if (cm && el.id === 'entry-content') {
        const walker = document.createTreeWalker(cm, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const i = n.textContent.indexOf(fixed);
          if (i < 0) continue;
          const range = document.createRange();
          range.setStart(n, i); range.setEnd(n, i + fixed.length);
          const b = range.getBoundingClientRect();
          return {x: Math.round(b.left), w: Math.round(b.width), bottom: Math.round(b.bottom)};
        }
        return null;
      }
      const cs = getComputedStyle(el);
      const c = document.createElement('canvas').getContext('2d');
      c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const r = el.getBoundingClientRect();
      const x = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft) + c.measureText(el.value.slice(0, el.value.indexOf(fixed))).width;
      return {x: Math.round(x), w: Math.round(c.measureText(fixed).width)};
    }, [sel, r.corrected.trim().split(' ').pop()]);
    //: The word's own box, measured independently, for the underline's offset.
    r.toast = await page.evaluate(() => {
      const t = [...document.querySelectorAll('.toast')].pop();
      return t ? {text: t.querySelector('.toast-msg')?.textContent, undo: [...t.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Undo')} : null;
    });
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(100);
    r.backspace = await value(sel);
    await clear(focusSel);
    await page.keyboard.type(`${b} `, {delay: 20});
    await page.waitForTimeout(100);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);
    r.ctrlz = await value(sel);
    await clear(focusSel);
    await page.keyboard.type(`${c} `, {delay: 20});
    await page.waitForTimeout(150);
    const m = await page.$('.autocorrect-mark');
    if (m) await m.click();
    await page.waitForTimeout(100);
    r.click = await value(sel);
    await clear(focusSel);
    await page.keyboard.type(`${d} `, {delay: 20});
    await page.waitForTimeout(5300);
    r.markAfter5s = await page.evaluate(() => Boolean(document.querySelector('.autocorrect-mark:not([hidden])')));
    r.keptAfter5s = await value(sel);
    await clear(focusSel);
    out.boxes[name] = r;
  };
  await tab('notes', 'capture');
  await one('entry-title', '#entry-title');
  await one('entry-content', '#entry-content', '#entry-content ~ .note-surface .cm-content, #entry-content');
  await tab('notes', 'ask');
  await one('question', '#question');
  await tab('chat');
  await one('chat-input', '#chat-input');
  // A search box is never touched.
  await page.evaluate(() => openSettingsModal());
  await page.waitForTimeout(800);
  if (await page.isVisible('#settings-search')) {
    await page.click('#settings-search');
    await page.keyboard.type('untill ', {delay: 20});
    out.searchUntouched = (await page.inputValue('#settings-search')) === 'untill ';
  }
  await page.evaluate(() => closeSettingsModal());
  // The switch.
  await page.evaluate(() => { prefsCache.autocorrect = false; });
  await clear('#chat-input');
  await page.keyboard.type('tommorow ', {delay: 20});
  out.offUntouched = (await page.inputValue('#chat-input')) === 'tommorow ';
  await page.evaluate(() => { prefsCache.autocorrect = true; });
  out.errors = await page.evaluate(() => (window.__errors || []).length);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
