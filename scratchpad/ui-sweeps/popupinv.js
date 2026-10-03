// INBOX 456, the owner: "make sure all the popup windows and panels are the
// same design and style." One measured row per popup surface.
//
// For each surface this opens it the way a person would where that is cheap
// (a real opener: openSheet, confirmDialog, openHelpChat, openFinder, a '?'
// press, the notification bell) and otherwise by taking the `hidden` class
// off a static overlay or calling `showModal()` on a `<dialog>` (the same
// shortcut dialogheads.js takes), then reads getComputedStyle for the shell:
// radius, padding, border, ground (colour, image, blur), shadow, width, the
// head (height, title size and weight), the close control (kind, size, its
// offset from the card's top and right) and the scrim.
//
//   BASE=http://127.0.0.1:8818 W=1440 THEME=light OUT=/tmp/pop.json node popupinv.js
//   (W=390 gets a phone context; THEME=dark for dark; ONLY=a,b narrows.)
//
// The JSON is read by scratchpad/popup-inventory.md's table and by
// popupinv-check.js, which asserts the recipe.
const { boot } = require('./lib.js');
const fs = require('fs');
const AXE = process.env.A11Y ? fs.readFileSync(process.env.AXE_JS || '/tmp/axe-core/package/axe.min.js', 'utf8') : '';

const W = +(process.env.W || 1440);
const PHONE = W < 600;
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);

// Injected: measure one surface. `cardSel` is the visible shell, `scrimSel`
// (optional) the element that paints the scrim (an overlay, or a <dialog>
// whose ::backdrop does).
const MEASURE = ([cardSel, scrimSel, headSel, closeSel]) => {
  const q = (s, root = document) => [...root.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0) || null;
  const card = q(cardSel);
  if (!card) return { missing: cardSel };
  const cs = getComputedStyle(card);
  const r = card.getBoundingClientRect();
  const short = (s) => String(s).replace(/\s+/g, ' ').slice(0, 70);
  const out = {
    card: card.tagName.toLowerCase() + (card.id ? '#' + card.id : '') + '.' + [...card.classList].join('.'),
    radius: cs.borderTopLeftRadius + (cs.borderBottomLeftRadius !== cs.borderTopLeftRadius ? '/' + cs.borderBottomLeftRadius : ''),
    padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' '),
    border: cs.borderTopWidth === '0px' || cs.borderTopStyle === 'none' ? 'none' : `${cs.borderTopWidth} ${cs.borderTopColor}`,
    bg: cs.backgroundColor,
    bgImage: cs.backgroundImage === 'none' ? '' : short(cs.backgroundImage),
    blur: cs.backdropFilter === 'none' || !cs.backdropFilter ? 'none' : short(cs.backdropFilter),
    shadow: cs.boxShadow === 'none' ? 'none' : short(cs.boxShadow),
    width: Math.round(r.width), height: Math.round(r.height),
    left: Math.round(r.left), top: Math.round(r.top),
  };
  // Head: the named head, else the first of the usual heads, else the
  // title's own row.
  const headCandidates = headSel ? [headSel] : ['.dialog-head', '.sheet-head', '[class*="-head"]:not([class*="-head-"])', 'header'];
  let head = null;
  for (const s of headCandidates) { head = q(s, card); if (head) break; }
  const title = q('.dialog-head-title, .sheet-title, .notif-heading strong, .monitor-title, .tour-title, #graph-popup-title, #graph-new-title, h2, h3, h4, strong', head || card);
  if (head) {
    const hr = head.getBoundingClientRect();
    out.head = head.tagName.toLowerCase() + '.' + [...head.classList].join('.');
    out.headH = Math.round(hr.height);
    out.headTop = Math.round(hr.top - r.top);
  }
  if (title) {
    const ts = getComputedStyle(title);
    out.title = title.tagName.toLowerCase() + '.' + [...title.classList].join('.');
    out.titleSize = ts.fontSize;
    out.titleWeight = ts.fontWeight;
  }
  // The '?' beside the title: its box and how far it sits from the title's
  // right edge (the recipe is "the title, then its '?' right beside it").
  const hb = head ? [...head.querySelectorAll('[data-help-for]')].find((b) => b.getBoundingClientRect().width > 0) : null;
  if (hb && title) {
    const hr = hb.getBoundingClientRect(); const tr = title.getBoundingClientRect();
    out.helpW = Math.round(hr.width); out.helpGap = Math.round(hr.left - tr.right);
    out.helpClass = [...hb.classList].includes('dialog-head-btn') ? 'recipe' : 'own';
  }
  // Close: a button in the head (or the card) that names itself close, back
  // or dismiss, else the lightbox-style .lightbox-close, else the last head
  // button.
  const btns = [...(head || card).querySelectorAll('button')].filter((b) => b.getBoundingClientRect().width > 0);
  const closeRe = /close|dismiss|back|hide|done/i;
  let close = closeSel ? q(closeSel, card) : null;
  if (!close) close = btns.find((b) => closeRe.test((b.getAttribute('aria-label') || '') + ' ' + b.id + ' ' + b.className)) || null;
  if (!close) close = [...card.querySelectorAll('button')].find((b) => b.getBoundingClientRect().width > 0 && closeRe.test((b.getAttribute('aria-label') || '') + ' ' + b.id + ' ' + b.className)) || null;
  if (close) {
    const cr = close.getBoundingClientRect(); const ccs = getComputedStyle(close);
    const word = (close.textContent || '').trim();
    out.close = `${close.tagName.toLowerCase()}.${[...close.classList].join('.')}`;
    out.closeKind = word ? `text "${word.slice(0, 12)}"` : 'icon';
    out.closeW = Math.round(cr.width); out.closeH = Math.round(cr.height);
    out.closeRight = Math.round(r.right - cr.right); out.closeTop = Math.round(cr.top - r.top);
    out.closeRadius = ccs.borderTopLeftRadius;
    out.closeBorder = ccs.borderTopWidth === '0px' ? 'none' : ccs.borderTopWidth;
    out.closeBg = ccs.backgroundColor;
  } else out.close = 'none';
  const scrim = scrimSel ? q(scrimSel) : null;
  if (scrim) {
    const ss = scrim.tagName === 'DIALOG' ? getComputedStyle(scrim, '::backdrop') : getComputedStyle(scrim);
    out.scrim = ss.backgroundColor;
    out.scrimBlur = ss.backdropFilter === 'none' || !ss.backdropFilter ? 'none' : short(ss.backdropFilter);
  } else out.scrim = 'none';
  out.z = cs.zIndex;
  out.pos = cs.position;
  return out;
};

(async () => {
  const { browser, page } = await boot(PHONE
    ? { viewport: { width: W, height: 844 }, hasTouch: true, isMobile: true }
    : { viewport: { width: W, height: 900 } });
  const wait = (ms) => page.waitForTimeout(ms);
  const raf = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const results = {};
  const kinds = {};

  // Static overlay by id: show it by the class, hide it again.
  const staticOverlay = (id, card = '.modal-card') => ({
    kind: 'modal', card: `#${id} ${card}`, scrim: `#${id}`,
    open: (p) => p.evaluate((i) => document.getElementById(i).classList.remove('hidden'), id),
    close: (p) => p.evaluate((i) => document.getElementById(i).classList.add('hidden'), id),
  });
  const dlg = (id) => ({
    kind: 'dialog', card: `#${id}`, scrim: `#${id}`,
    open: (p) => p.evaluate((i) => { const d = document.getElementById(i); if (!d.open) d.showModal(); }, id),
    close: (p) => p.evaluate((i) => { const d = document.getElementById(i); if (d.open) d.close(); }, id),
  });
  const sheet = (name, extra = '') => ({
    kind: 'sheet', card: `[data-sheet="${name}"] .sheet-card${extra}`, scrim: `[data-sheet="${name}"]`,
    open: (p) => p.evaluate((n) => {
      openSheet({ label: 'Sample sheet', name: n, build: (card) => { const l = document.createElement('div'); l.className = 'sheet-list'; const b = document.createElement('button'); b.className = 'sheet-row'; b.textContent = 'A row'; l.append(b); card.append(l); } });
    }, name),
    close: (p) => p.evaluate((n) => { document.querySelector(`[data-sheet="${n}"] .sheet-close`)?.click(); document.querySelector(`[data-sheet="${n}"]`)?.remove(); }, name),
  });

  const SURFACES = {
    // --- modal overlays ---
    'settings-modal': { ...staticOverlay('settings-modal'), head: '.modal-card > .row', closeSel: '#settings-close' },
    'doc-ai-panel': { ...staticOverlay('doc-ai-panel', '.doc-ai-card'), tab: 'documents' },
    'extract-panel': { ...staticOverlay('extract-panel'), head: '.modal-card > .row', closeSel: '#extract-close' },
    'history-overlay': staticOverlay('history-overlay'),
    'connections-overlay': staticOverlay('connections-overlay'),
    'binned-overlay': staticOverlay('binned-overlay'),
    'skill-run-overlay': { ...staticOverlay('skill-run-overlay'), head: '.modal-card > .row', closeSel: '#skill-run-cancel' },
    'shortcuts-overlay': staticOverlay('shortcuts-overlay'),
    'meeting-overlay': staticOverlay('meeting-overlay'),
    'features-overlay': staticOverlay('features-overlay'),
    'onboarding-overlay': { ...staticOverlay('onboarding-overlay'), head: '.__none' },
    'ocr-workspace': { ...staticOverlay('ocr-workspace', '.ocr-card'), head: '.ocr-head-top' },
    'confirm-dialog': {
      kind: 'modal', card: '.confirm-overlay .confirm-card', scrim: '.confirm-overlay',
      open: (p) => p.evaluate(() => { window.__c = confirmDialog('Delete this note?\n\nThis cannot be undone.'); }),
      close: (p) => p.evaluate(() => { document.querySelector('.confirm-overlay')?.remove(); }),
    },
    // --- native dialogs ---
    'space-create-dialog': dlg('space-create-dialog'),
    'space-delete-dialog': dlg('space-delete-dialog'),
    'doc-storage-dialog': dlg('doc-storage-dialog'),
    'doc-template-dialog': dlg('doc-template-dialog'),
    'quick-note': dlg('quick-note'),
    'doc-history-dialog': dlg('doc-history-dialog'),
    'doc-ai-history-dialog': dlg('doc-ai-history-dialog'),
    'doc-word-goal-dialog': dlg('doc-word-goal-dialog'),
    'tensions-dialog': dlg('tensions-dialog'),
    'dash-widgets-dialog': dlg('dash-widgets-dialog'),
    'doc-dictionary-dialog': dlg('doc-dictionary-dialog'),
    // --- lock-overlay dialogs (palettes) ---
    'command-palette-overlay': {
      kind: 'palette', card: '#command-palette-overlay .command-palette-card', scrim: '#command-palette-overlay', head: '.command-palette-head',
      open: (p) => p.evaluate(() => document.getElementById('command-palette-overlay').classList.remove('hidden')),
      close: (p) => p.evaluate(() => document.getElementById('command-palette-overlay').classList.add('hidden')),
    },
    'finder-overlay': {
      kind: 'palette', card: '#finder-overlay .finder-card', scrim: '#finder-overlay', head: '.finder-head',
      open: (p) => p.evaluate(() => document.getElementById('finder-overlay').classList.remove('hidden')),
      close: (p) => p.evaluate(() => document.getElementById('finder-overlay').classList.add('hidden')),
    },
    'palette-overlay': {
      kind: 'palette', card: '#palette-overlay > .card, #palette-overlay > div', scrim: '#palette-overlay',
      open: (p) => p.evaluate(() => document.getElementById('palette-overlay').classList.remove('hidden')),
      close: (p) => p.evaluate(() => document.getElementById('palette-overlay').classList.add('hidden')),
    },
    'improve-overlay': {
      kind: 'palette', card: '#improve-overlay > .card, #improve-overlay > div', scrim: '#improve-overlay',
      open: (p) => p.evaluate(() => document.getElementById('improve-overlay').classList.remove('hidden')),
      close: (p) => p.evaluate(() => document.getElementById('improve-overlay').classList.add('hidden')),
    },
    'sketch-overlay': {
      kind: 'palette', card: '#sketch-overlay > .card, #sketch-overlay > div', scrim: '#sketch-overlay',
      open: (p) => p.evaluate(() => document.getElementById('sketch-overlay').classList.remove('hidden')),
      close: (p) => p.evaluate(() => document.getElementById('sketch-overlay').classList.add('hidden')),
    },
    // --- sheets ---
    'sheet (openSheet)': sheet('inv'),
    'sheet corner (Atlas guide)': {
      kind: 'sheet', card: '[data-sheet="guide"] .sheet-card', scrim: '[data-sheet="guide"]',
      open: (p) => p.evaluate(() => openHelpChat()),
      close: (p) => p.evaluate(() => { document.querySelector('[data-sheet="guide"] .sheet-close')?.click(); }),
    },
    // --- side panels / floating panels ---
    'notif-panel': {
      kind: 'panel', card: '#notif-panel', head: '.notif-head',
      open: (p) => p.click('#notif-btn'),
      close: (p) => p.evaluate(() => { document.getElementById('notif-panel').classList.add('hidden'); }),
    },
    'agent-monitor': {
      kind: 'panel', card: '#agent-monitor', head: '.panel-head',
      open: (p) => p.evaluate(() => document.getElementById('agent-monitor').classList.remove('hidden')),
      close: (p) => p.evaluate(() => document.getElementById('agent-monitor').classList.add('hidden')),
    },
    'chat-model-panel': {
      kind: 'panel', card: '#chat-model-panel',
      open: (p) => p.evaluate(() => document.getElementById('chat-model-panel').classList.remove('hidden')),
      close: (p) => p.evaluate(() => document.getElementById('chat-model-panel').classList.add('hidden')),
    },
    'status-clock-detail': {
      kind: 'panel', card: '#status-clock-detail',
      open: (p) => p.evaluate(() => document.getElementById('status-clock-detail').classList.remove('hidden')),
      close: (p) => p.evaluate(() => document.getElementById('status-clock-detail').classList.add('hidden')),
    },
    'tour-card': {
      kind: 'panel', card: '#tour-card', head: '.tour-head',
      open: (p) => p.evaluate(() => document.getElementById('tour-card').classList.remove('hidden')),
      close: (p) => p.evaluate(() => document.getElementById('tour-card').classList.add('hidden')),
    },
    // --- the media viewer: its own dark ground and a round X, by design ---
    'lightbox (media viewer)': {
      kind: 'viewer', card: '.lightbox', scrim: '.lightbox', head: '.__none', closeSel: '.lightbox-close',
      open: (p) => p.evaluate(() => openLightbox([{ filename: 'inventory.gif', getUrl: async () => 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }])),
      close: (p) => p.evaluate(() => { document.querySelector('.lightbox')?.remove(); }),
    },
    // --- popovers ---
    'help-popover': {
      kind: 'popover', card: '.help-popover',
      tab: 'dashboard',
      open: async (p) => {
        await p.evaluate(() => { document.getElementById('settings-modal').classList.remove('hidden'); });
        await p.waitForTimeout(300);
        await p.evaluate(() => { const b = [...document.querySelectorAll('#settings-modal [data-help-for]')].find((x) => x.getBoundingClientRect().width > 0); b && b.click(); });
      },
      close: (p) => p.evaluate(() => { document.querySelectorAll('.help-popover').forEach((e) => e.remove()); document.getElementById('settings-modal').classList.add('hidden'); }),
    },
  };

  // Surfaces that need a tab first.
  const TABBED = {
    'graph-popup': { tab: 'graph', kind: 'panel', card: '#graph-popup', head: '.graph-popup-head', open: (p) => p.evaluate(() => document.getElementById('graph-popup').classList.remove('hidden')), close: (p) => p.evaluate(() => document.getElementById('graph-popup').classList.add('hidden')) },
    'graph-new': { tab: 'graph', kind: 'panel', card: '#graph-new', head: '.row', open: (p) => p.evaluate(() => document.getElementById('graph-new').classList.remove('hidden')), close: (p) => p.evaluate(() => document.getElementById('graph-new').classList.add('hidden')) },
    'graph-options': { tab: 'graph', kind: 'panel', card: '#graph-options', open: (p) => p.evaluate(() => document.getElementById('graph-options').classList.remove('hidden')), close: (p) => p.evaluate(() => document.getElementById('graph-options').classList.add('hidden')) },
    'graph-help-panel': { tab: 'graph', kind: 'popover', card: '#graph-help-panel', open: (p) => p.evaluate(() => document.getElementById('graph-help-panel').classList.remove('hidden')), close: (p) => p.evaluate(() => document.getElementById('graph-help-panel').classList.add('hidden')) },
    'wb-navigator': { tab: 'whiteboard', kind: 'panel', card: '#wb-navigator', open: (p) => p.evaluate(() => { let e = document.getElementById('wb-navigator'); while (e && e !== document.body) { e.classList.remove('hidden'); e = e.parentElement; } }), close: (p) => p.evaluate(() => { document.getElementById('wb-navigator').classList.add('hidden'); }) },
  };
  Object.assign(SURFACES, TABBED);

  for (const [name, s] of Object.entries(SURFACES)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    try {
      if (s.tab) {
        await page.evaluate((t) => { if (typeof switchTab === 'function') switchTab(t); else { const b = document.querySelector('[data-tab="' + t + '"]'); b && b.click(); } }, s.tab);
        await wait(700);
      }
      await s.open(page);
      await wait(450);
      await raf();
      const m = await page.evaluate(MEASURE, [s.card, s.scrim || null, s.head || null, s.closeSel || null]);
      m.kind = s.kind;
      results[name] = m;
      if (process.env.A11Y && !m.missing) {
        // axe on the shell alone (WCAG 2.2 AA tags): names, roles, contrast of
        // plain text over a solid ground. The tab sweeps never open a popup.
        await page.evaluate(AXE);
        const found = await page.evaluate(async (sel) => {
          const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0);
          const r = await window.axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
          return r.violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length} ${v.nodes[0].target.join(' ').slice(0, 70)}`);
        }, s.card);
        m.axe = found;
        if (found.length) console.log(`  AXE ${name}: ${found.join(' | ')}`);
      }
      if (process.env.SHOTS && !m.missing) {
        const pad = 16;
        const clip = { x: Math.max(0, m.left - pad), y: Math.max(0, m.top - pad), width: Math.min(W - Math.max(0, m.left - pad), m.width + pad * 2), height: Math.min(900 - Math.max(0, m.top - pad), m.height + pad * 2) };
        fs.mkdirSync('/tmp/pop18/shots', { recursive: true });
        await page.screenshot({ path: `/tmp/pop18/shots/${process.env.TAG || 'a'}-${name.replace(/[^a-z0-9]+/gi, '_')}.png`, clip });
      }
    } catch (e) {
      results[name] = { error: String(e).slice(0, 120) };
    }
    try { await s.close(page); } catch (e) { /* closing is best effort */ }
    await page.keyboard.press('Escape').catch(() => {});
    await wait(150);
  }
  fs.writeFileSync(process.env.OUT || '/tmp/pop.json', JSON.stringify(results, null, 1));
  console.log(`${Object.keys(results).length} surfaces, ${Object.values(results).filter((r) => r.missing || r.error).length} not measured -> ${process.env.OUT || '/tmp/pop.json'}`);
  for (const [k, v] of Object.entries(results)) if (v.missing || v.error) console.log('  not measured:', k, v.missing || v.error);
  await browser.close();
})();
