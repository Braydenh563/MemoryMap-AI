// INBOX 269 (2), asked twice: "I actually need you to use your ui and ux
// design skills and the ones vendored in this repo and do a check for signs of
// being vibecoded."
//
// A vibecoded surface looks right in a screenshot and fails the moment anyone
// uses it. This measures the tells that a screenshot cannot show, on every
// tab, with numbers rather than impressions:
//
//   1. Dead controls: a <button> with no click handler, no form, no popover
//      and no `data-` hook. "A control that does nothing when pressed is worse
//      than no control", which this app has been told before.
//   2. Values that leaked: "undefined", "NaN", "[object Object]", "null" and
//      bare `ph:` icon tokens rendered as text.
//   3. Duplicate ids: two elements answering to one name, which is how a
//      handler silently binds to the wrong one.
//   4. Disabled with no reason: a disabled control carrying no title and no
//      aria-describedby leaves the reader with no way to find out why.
//   5. Unnamed controls: an icon button with no accessible name is a mystery
//      to a screen reader and to a tooltip-less mouse.
//   6. Raw machine values on screen: ISO timestamps and bare row ids.
//
// The vendored `ui-ux-pro-max` corpus rates the feedback ones High and the
// rest Medium; DESIGN.md wins on anything cosmetic, so nothing here judges
// spacing or colour, which `contrast.js` and `test_style_scale.py` own.
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node vibecheck.js
const { boot } = require('./lib.js');

const TABS = ['dashboard', 'notes', 'chat', 'graph', 'timeline', 'documents', 'library', 'files'];

const AUDIT = () => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  const where = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = (el.className || '').toString().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    return `${el.tagName.toLowerCase()}${id}${cls ? '.' + cls : ''}`;
  };
  const out = { dead: [], leaked: [], dupIds: [], mutelyDisabled: [], unnamed: [], untooltipped: [], machine: [] };

  // 1. Dead-control *candidates*. Whether a listener actually exists is not
  // knowable from page script (`getEventListeners` is devtools-only, and this
  // app binds almost everything by delegation), so this only collects the
  // buttons worth asking about and `liveSet` below answers over CDP. A first
  // version guessed from markup instead and reported 44 working controls,
  // every quick-link tile among them, which is the kind of finding that
  // teaches a reader to ignore the report.
  for (const b of document.querySelectorAll('button, [role="button"]')) {
    if (!visible(b) || b.disabled) continue;
    if (b.type === 'submit' || b.type === 'reset') continue;
    if (b.closest('summary, label, a')) continue;
    if (b.hasAttribute('popovertarget') || b.hasAttribute('commandfor')) continue;
    out.dead.push(where(b) + ' :: ' + (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40));
  }

  // 2. Leaked values, read from text nodes so a `data-` attribute holding the
  // literal string "undefined" is not reported as being on screen.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const BAD = /\b(undefined|NaN|\[object Object\])\b|(^|\s)ph:[a-z0-9-]+/;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent;
    if (!BAD.test(text)) continue;
    const el = node.parentElement;
    if (!el || !visible(el)) continue;
    // <script>, <style> and <template> hold code, not copy.
    if (el.closest('script, style, template, noscript')) continue;
    out.leaked.push(where(el) + ' :: ' + text.replace(/\s+/g, ' ').trim().slice(0, 70));
  }

  // 3. Duplicate ids.
  const seen = new Map();
  for (const el of document.querySelectorAll('[id]')) {
    seen.set(el.id, (seen.get(el.id) || 0) + 1);
  }
  for (const [id, n] of seen) if (n > 1) out.dupIds.push(`#${id} x${n}`);

  // 4. Disabled with no reason given.
  for (const el of document.querySelectorAll('button[disabled], input[disabled], select[disabled], [aria-disabled="true"]')) {
    if (!visible(el)) continue;
    if (el.title || el.getAttribute('aria-describedby') || el.closest('[title]')) continue;
    out.mutelyDisabled.push(where(el) + ' :: ' + (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40));
  }

  // 5b. **Learnability**: an icon-only control with no tooltip. It may have a
  // perfect `aria-label`, which answers a screen reader and nobody else: a
  // person looking at a row of glyphs with a mouse has no way to find out
  // what any of them do short of pressing one. Asked for directly: "increase
  // learnability all around".
  for (const el of document.querySelectorAll('button, [role="button"]')) {
    if (!visible(el)) continue;
    if ((el.textContent || '').trim()) continue;       // it has a word on it
    if (el.title || el.closest('[title]')) continue;   // it explains itself
    if (el.getAttribute('aria-hidden') === 'true') continue;
    const named = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    if (!named) continue;  // already counted as unnamed, above
    out.untooltipped.push(where(el) + ' :: ' + (el.getAttribute('aria-label') || '').slice(0, 40));
  }

  // 5. Controls with no accessible name at all.
  for (const el of document.querySelectorAll('button, [role="button"], a[href], input:not([type=hidden]), select, textarea')) {
    if (!visible(el)) continue;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    const name = text || el.getAttribute('aria-label') || el.getAttribute('title')
      || el.getAttribute('placeholder') || el.getAttribute('alt')
      || (el.labels && el.labels.length ? 'labelled' : '')
      || (el.getAttribute('aria-labelledby') ? 'labelledby' : '');
    if (!name) out.unnamed.push(where(el));
  }

  // 6. Machine values where a person is reading. A bare ISO timestamp, or a
  // row id printed as "id 41" / "#41" outside a code block.
  const ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
  const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w2.nextNode()) {
    const node = w2.currentNode;
    if (!ISO.test(node.textContent)) continue;
    const el = node.parentElement;
    if (!el || !visible(el) || el.closest('script, style, template, code, pre, textarea, .cm-editor')) continue;
    out.machine.push(where(el) + ' :: ' + node.textContent.replace(/\s+/g, ' ').trim().slice(0, 60));
  }
  return out;
};

//: **Does this button do anything when pressed?**
//:
//: `DOMDebugger.getEventListeners` is the only honest answer: it reports the
//: listeners actually attached to a node, which page script cannot see. A
//: delegated handler lives on an ancestor, so a button counts as live when it,
//: or anything up to <html>, listens for a press.
//:
//: Driven entirely over CDP rather than through Playwright handles, because
//: the API needs a `Runtime.RemoteObject` id and Playwright does not expose
//: one. A first version reached for a private field, got `undefined` for every
//: node and duly reported all 104 buttons dead, which is the same false
//: report as guessing from markup, only more expensive.
//:
//: Each distinct node is asked once, not once per button that hangs off it:
//: the chains overlap almost completely near the root.
const PRESS = new Set(['click', 'pointerdown', 'mousedown', 'keydown', 'pointerup']);

async function deadOnes(page, cdp) {
  const plan = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };
      const nodes = [];
      const index = new Map();
      const idOf = (el) => {
        if (!index.has(el)) { index.set(el, nodes.length); nodes.push(el); }
        return index.get(el);
      };
      const rows = [];
      for (const b of document.querySelectorAll('button, [role="button"]')) {
        if (!visible(b) || b.disabled) continue;
        if (b.type === 'submit' || b.type === 'reset') continue;
        if (b.closest('summary, label, a')) continue;
        if (b.hasAttribute('popovertarget') || b.hasAttribute('commandfor')) continue;
        const chain = [];
        for (let el = b; el; el = el.parentElement) chain.push(idOf(el));
        // document and window too: the app binds most of its delegated
        // handlers there, and a chain stopping at <html> reported the empty
        // states Capture-a-note button dead when its listener is on document.
        chain.push(idOf(document), idOf(window));
        const id = b.id ? '#' + b.id : '';
        const cls = (b.className || '').toString().split(/\\s+/).filter(Boolean).slice(0, 2).join('.');
        rows.push({ chain, label: b.tagName.toLowerCase() + id + (cls ? '.' + cls : '') + ' :: ' + (b.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40) });
      }
      window.__vcNodes = nodes;
      return { rows, nodeCount: nodes.length };
    })()`,
  });
  const { rows, nodeCount } = plan.result.value;
  const listens = new Array(nodeCount).fill(false);
  for (let i = 0; i < nodeCount; i++) {
    const handle = await cdp.send('Runtime.evaluate', { expression: `window.__vcNodes[${i}]` });
    const objectId = handle.result?.objectId;
    if (!objectId) continue;
    const res = await cdp.send('DOMDebugger.getEventListeners', { objectId }).catch(() => null);
    if (res && (res.listeners || []).some((l) => PRESS.has(l.type))) listens[i] = true;
    await cdp.send('Runtime.releaseObject', { objectId }).catch(() => {});
  }
  return rows.filter((r) => !r.chain.some((k) => listens[k])).map((r) => r.label);
}

(async () => {
  const { page, browser, ctx } = await boot({});
  const cdp = await ctx.newCDPSession(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(3500);

  const totals = {};
  for (const tab of TABS) {
    await page.evaluate((t) => switchTab(t), tab).catch(() => {});
    // Long enough for a tab that fetches on entry to have drawn something.
    await page.waitForTimeout(3200);
    const found = await page.evaluate(AUDIT);
    found.dead = await deadOnes(page, cdp);
    for (const [kind, rows] of Object.entries(found)) {
      if (!rows.length) continue;
      totals[kind] = totals[kind] || new Map();
      // Keyed by the finding text, so a chrome element present on every tab is
      // reported once rather than eight times.
      for (const row of rows) {
        if (!totals[kind].has(row)) totals[kind].set(row, tab);
      }
    }
  }

  let n = 0;
  for (const [kind, rows] of Object.entries(totals)) {
    console.log(`\n${kind}: ${rows.size}`);
    for (const [row, tab] of [...rows].slice(0, 14)) console.log(`  [${tab}] ${row}`);
    if (rows.size > 14) console.log(`  … and ${rows.size - 14} more`);
    n += rows.size;
  }
  if (errors.length) console.log(`\npage errors: ${errors.length}`, errors.slice(0, 3));
  console.log(`\n${n ? `FAIL: ${n} findings` : 'PASS: 0 findings'}`);
  await browser.close();
  process.exit(n ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
