// INBOX 224: the Atlas chat, rebuilt on the popup agent's recipe, and one copy
// of it rather than a second box printed inside Settings, Help.
const { boot } = require('./lib.js');

async function shape(page) {
  return await page.evaluate(() => {
    const sheet = document.querySelector('[data-sheet="guide"]');
    const card = sheet && sheet.querySelector('.sheet-card');
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        x: Math.round(b.x), y: Math.round(b.y),
        w: Math.round(b.width), h: Math.round(b.height),
        right: Math.round(window.innerWidth - b.right),
        bottom: Math.round(window.innerHeight - b.bottom),
      };
    };
    const parts = ['.atlas-intro', '.atlas-starters', '#help-chat-messages', '.atlas-composer'];
    const cardBox = card && card.getBoundingClientRect();
    return {
      card: r(card),
      corner: !!(card && card.classList.contains('sheet-card-corner')),
      head: sheet && sheet.querySelector('.sheet-head') ? sheet.querySelector('.sheet-head').textContent.replace(/\s+/g, ' ').trim() : null,
      mark: !!(card && card.querySelector('.atlas-mark i.ph')),
      name: card && card.querySelector('.atlas-name') ? card.querySelector('.atlas-name').textContent : null,
      line: card && card.querySelector('.atlas-line') ? card.querySelector('.atlas-line').textContent.replace(/\s+/g, ' ').trim() : null,
      starters: [...(card ? card.querySelectorAll('.atlas-starters button') : [])].map((b) => b.textContent.trim()),
      composer: card ? [...card.querySelectorAll('.atlas-composer > *')].map((el) => el.id || el.className) : [],
      kebab: !!(card && card.querySelector('#help-chat-menu [aria-haspopup="menu"]')),
      // Nothing may be wider than the card it sits in.
      wider: cardBox
        ? parts.filter((sel) => {
            const el = card.querySelector(sel);
            return el && el.getBoundingClientRect().width > cardBox.width + 1;
          })
        : [],
      // One Atlas surface in the whole document, not two.
      surfaces: document.querySelectorAll('#help-chat-group').length,
      inSettings: !!document.querySelector('#settings-help #help-chat-group'),
      settingsRow: !!document.querySelector('#settings-help .atlas-row'),
      settingsChips: document.querySelectorAll('#atlas-row-starters button').length,
    };
  });
}

(async () => {
  for (const width of [1440, 1024, 390]) {
    const { browser, page } = await boot({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await page.evaluate(() => openHelpChat());
    await page.waitForTimeout(700);
    console.log(`224 sheet @${width}:`, JSON.stringify(await shape(page)));

    // A turn retires the starters and the empty state; the source line sits
    // under the answer. The model is stubbed: this sandbox has none.
    await page.evaluate(() => {
      renderHelpChatMessage('user', 'Where do reminders live?');
      renderHelpChatMessage(
        'assistant',
        'The Reminders tab groups them by Overdue, Today, Upcoming and Done.',
        [{ label: 'Reminders', tab: 'reminders' }],
        ['Reminders', 'Shortcuts']
      );
    });
    await page.waitForTimeout(300);
    console.log(`224 after a turn @${width}:`, JSON.stringify(await page.evaluate(() => {
      const card = document.querySelector('[data-sheet="guide"] .sheet-card');
      const source = card.querySelector('.help-chat-source');
      return {
        startersHidden: card.querySelector('.atlas-starters').classList.contains('hidden'),
        emptyHidden: document.getElementById('help-chat-empty').hidden,
        source: source ? source.textContent : null,
        bubbles: card.querySelectorAll('.help-chat-msg').length,
        kebabRows: (() => {
          const opener = card.querySelector('#help-chat-menu [aria-haspopup="menu"]');
          opener.click();
          return [...card.querySelectorAll('#help-chat-menu [role="menuitem"]')].map((r) => r.textContent.trim());
        })(),
      };
    })));

    // Contrast inside the sheet, the same maths contrast.js uses (WCAG, the
    // first non-transparent background up the tree), over every element in the
    // card that owns text. THEME=dark runs the other theme.
    console.log(`224 contrast @${width}:`, JSON.stringify(await page.evaluate(() => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      const parse = (c) => {
        if (!c || c === 'transparent') return null;
        const m = c.match(/^rgba?\(([^)]+)\)$/);
        if (m) {
          const p = m[1].split(/[\s,\/]+/).map(Number);
          return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
        }
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = '#000';
        cx.fillStyle = c;
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
      };
      const lum = ({ r, g, b }) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => {
        const l1 = lum(a), l2 = lum(b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };
      const bgOf = (el) => {
        for (let e = el; e; e = e.parentElement) {
          const c = parse(getComputedStyle(e).backgroundColor);
          if (c && c.a >= 0.9) return c;
        }
        return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
      };
      const card = document.querySelector('[data-sheet="guide"] .sheet-card');
      const rows = [];
      for (const el of card.querySelectorAll('*')) {
        const text = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).length;
        if (!text || !el.checkVisibility()) continue;
        const cs = getComputedStyle(el);
        const fg = parse(cs.color);
        if (!fg || fg.a < 1) continue;
        const size = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight, 10) >= 700;
        const need = size >= 18.66 || (bold && size >= 14) ? 3 : 4.5;
        rows.push({
          what: el.id || el.className || el.tagName,
          ratio: Math.round(ratio(fg, bgOf(el)) * 100) / 100,
          need,
        });
      }
      return {
        theme: document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
        measured: rows.length,
        under: rows.filter((r) => r.ratio < r.need),
        lowest: rows.sort((a, b) => a.ratio - b.ratio)[0],
      };
    })));

    // Escape and the X both close.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const afterEscape = await page.evaluate(() => !!document.querySelector('[data-sheet="guide"]'));
    await page.evaluate(() => openHelpChat());
    await page.waitForTimeout(400);
    await page.click('[data-sheet="guide"] .sheet-close');
    await page.waitForTimeout(300);
    const afterX = await page.evaluate(() => ({
      open: !!document.querySelector('[data-sheet="guide"]'),
      // and the one copy went home rather than being destroyed with the sheet
      home: !!document.querySelector('#atlas-host #help-chat-group'),
    }));
    console.log(`224 closing @${width}:`, JSON.stringify({ afterEscape, afterX }));
    await browser.close();
  }
})();
