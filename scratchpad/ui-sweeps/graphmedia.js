// INBOX 183, the graph's half: "the graph popups dont render images or files,
// and idk what entities are".
//
// Two shapes of "a note with a picture", and the panel used to see one of them:
// a real attachment (`/entries/{id}/files`) drew its thumbnail, and a library
// upload referenced from the note's own markdown (`![alt](/media/...)`, which
// is what pasting, dropping and the AI all produce) drew nothing at all. A
// screenshot cannot tell "no picture" from "no picture yet", so every image
// here is measured by `naturalWidth`, which is only non-zero once the bytes
// have decoded.
//
// The entity half is copy, so it is checked as copy: the same sentence has to
// be reachable from the Show section's '?', from the legend, and from the node
// itself, and three copies that drift are worse than one that is missing.
//
//   BASE=http://127.0.0.1:8794 node scratchpad/ui-sweeps/graphmedia.js
const { boot } = require('./lib.js');

const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAADwEBAAyEAvUAAAAASUVORK5CYII=';

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 950 } });
  const findings = [];
  const check = (ok, what) => { if (!ok) findings.push(what); return ok; };

  const made = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const headers = { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() };
    const out = {};

    // 1. a note carrying the picture as an attachment
    const attached = await apiJson('/entries', {
      method: 'POST',
      body: JSON.stringify({ content: 'Graph media probe, attached picture' }),
    });
    const fd = new FormData();
    fd.append('file', new File([bytes], 'attached-probe.png', { type: 'image/png' }));
    await fetch(`/entries/${attached.id}/files`, { method: 'POST', body: fd, headers });
    out.attached = attached.id;

    // 2. a note carrying a file rather than a picture, for the kind and size
    const filed = await apiJson('/entries', {
      method: 'POST',
      body: JSON.stringify({ content: 'Graph media probe, attached file' }),
    });
    const fd2 = new FormData();
    const pdf = new TextEncoder().encode('%PDF-1.4\n' + 'x'.repeat(4000));
    fd2.append('file', new File([pdf], 'attached-probe.pdf', { type: 'application/pdf' }));
    await fetch(`/entries/${filed.id}/files`, { method: 'POST', body: fd2, headers });
    out.filed = filed.id;

    // 3. a note whose picture is a library upload named in its own markdown
    const fd3 = new FormData();
    fd3.append('file', new File([bytes], 'library-probe.png', { type: 'image/png' }));
    fd3.append('direct', 'true');
    const upload = await (
      await fetch('/media/upload', { method: 'POST', body: fd3, headers })
    ).json();
    const embedded = await apiJson('/entries', {
      method: 'POST',
      body: JSON.stringify({
        content: `Graph media probe, embedded picture\n\n![library probe](${upload.url || upload.path})`,
      }),
    });
    out.embedded = embedded.id;
    return out;
  }, PNG);
  console.log('probe notes       ', JSON.stringify(made));

  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(3500);

  const popup = async (id) =>
    page.evaluate(async (noteId) => {
      const node = gcNodes.find((n) => n.id === noteId);
      if (!node) return { missing: true };
      openGraphPopup({ clientX: 400, clientY: 300, stopPropagation() {} }, node);
      // The attachment path fetches the bytes and builds an object url, so the
      // wait has to cover a round trip, not just a paint.
      await new Promise((r) => setTimeout(r, 2200));
      const box = document.getElementById('graph-popup-media');
      return {
        hidden: box.classList.contains('hidden'),
        images: [...box.querySelectorAll('img')].map((i) => i.naturalWidth),
        cards: [...box.querySelectorAll('.file-card')].map((c) => ({
          name: (c.querySelector('.file-card-name') || {}).textContent || '',
          kind: (c.querySelector('.file-card-kind') || {}).textContent || '',
        })),
      };
    }, id);

  const attached = await popup(made.attached);
  console.log('attached picture  ', JSON.stringify(attached));
  check(!attached.hidden, 'the media box is hidden for a note with an attached picture');
  check(
    attached.images.length === 1 && attached.images[0] > 0,
    `attached picture drew ${JSON.stringify(attached.images)} natural widths, want one above 0`
  );

  const embedded = await popup(made.embedded);
  console.log('embedded picture  ', JSON.stringify(embedded));
  check(!embedded.hidden, 'the media box is hidden for a note whose picture is in its markdown');
  check(
    embedded.images.length === 1 && embedded.images[0] > 0,
    `embedded picture drew ${JSON.stringify(embedded.images)} natural widths, want one above 0`
  );

  const filed = await popup(made.filed);
  console.log('attached file     ', JSON.stringify(filed));
  check(filed.cards.length === 1, `a note with one file drew ${filed.cards.length} file cards`);
  if (filed.cards.length) {
    const kind = filed.cards[0].kind;
    check(kind.includes('PDF'), `the file card says "${kind}", with no kind in it`);
    check(/\d/.test(kind) && /B|KB|MB/.test(kind), `the file card says "${kind}", with no size in it`);
  }

  // --- what an entity is, in the three places it has to be the same ---------
  const copy = await page.evaluate(async () => {
    const help = document.getElementById('graph-show-help');
    const toggle = document.querySelector('[data-help-for="graph-show-help"]');
    const entities = document.getElementById('graph-entities');
    if (entities && !entities.checked) {
      entities.checked = true;
      entities.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 2600));
    }
    const legend = [...document.querySelectorAll('#graph-legend .legend-item')].map((b) => ({
      text: b.textContent.trim(),
      title: b.title || '',
    }));
    const entityNode = gcNodes.find((n) => n.type === 'entity');
    return {
      helpText: help ? help.textContent.replace(/\s+/g, ' ').trim() : null,
      helpHidden: help ? help.classList.contains('hidden') : null,
      toggleWired: Boolean(toggle && toggle.getAttribute('aria-expanded')),
      legendEntity: legend.find((l) => l.text.startsWith('Entity')) || null,
      tooltip: entityNode ? gcTooltip(entityNode) : null,
      entityNodes: gcNodes.filter((n) => n.type === 'entity').length,
    };
  });
  console.log('entity copy       ', JSON.stringify(copy));
  const SENTENCE = 'An entity is a person, place or thing the AI found named across your notes';
  check(Boolean(copy.helpText && copy.helpText.includes(SENTENCE)), 'the Show help does not say what an entity is');
  check(copy.helpHidden === true, 'the Show help popover is open before anyone asked for it');
  check(copy.toggleWired, 'the Show help button was never wired');
  if (copy.entityNodes > 0) {
    check(Boolean(copy.legendEntity), 'entities are on the map and the legend does not name them');
    check(
      Boolean(copy.legendEntity && copy.legendEntity.title.includes(SENTENCE)),
      `the legend entry says "${copy.legendEntity && copy.legendEntity.title}"`
    );
    check(
      Boolean(copy.tooltip && copy.tooltip.includes(SENTENCE)),
      `an entity node's tooltip says "${copy.tooltip}"`
    );
  } else {
    console.log('  (no entity in this notebook: the legend and tooltip checks were skipped)');
  }

  console.log(findings.length ? `FAIL: ${findings.length}\n  ` + findings.join('\n  ') : 'PASS');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
