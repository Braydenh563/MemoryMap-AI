// The skill editor's "Check it worked" row (CHAT_PLAN decision 10b, and the
// open item `archive/agent-remaining/brief-13-harness.md` 2: "nothing in the
// app reads a skill's verify block except skills.normalise").
//
//   BASE=http://127.0.0.1:8981 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules node scratchpad/ui-sweeps/skillverify.js
//
// What it measures, rather than looks at: the controls exist and are visible
// inside the fold, they stand at the app's own control height, the row does
// not overflow the section, the number hides for "unchanged" (a number beside
// "unchanged" is a setting being ignored), a skill saved through the editor
// carries the block into `/preferences`, and editing that skill again paints
// the same values back. Zero page errors throughout.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };

  await page.click('#settings-btn');
  await page.waitForTimeout(500);
  await page.click('#settings-modal [data-section="skills"]');
  await page.waitForTimeout(500);

  // The fold is closed at rest, like the tools picker above it.
  const closed = await page.evaluate(() => {
    const select = document.getElementById('skill-verify-tool');
    const fold = select && select.closest('details');
    return { exists: Boolean(select), open: fold ? fold.open : null };
  });
  check('the row exists', closed.exists, JSON.stringify(closed));
  check('the fold is closed at rest', closed.open === false, `open=${closed.open}`);

  await page.evaluate(() => {
    document.getElementById('skill-verify-tool').closest('details').open = true;
    // The number is hidden at rest (the default predicate is "unchanged"), so
    // the shape below is measured with a predicate that has a number.
    const expect = document.getElementById('skill-verify-expect');
    expect.value = 'max';
    expect.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(300);

  const shape = await page.evaluate(() => {
    const ids = ['skill-verify-tool', 'skill-verify-expect', 'skill-verify-value'];
    const out = { heights: {}, options: [], visible: {}, overflow: null };
    for (const id of ids) {
      const el = document.getElementById(id);
      // A native <select> is enhanced into a shell plus an opener, so the
      // measurable box is the shell when there is one (DESIGN.md's select
      // recipe), not the hidden native control.
      const box = el.closest('.select-shell') || el;
      out.heights[id] = Math.round(box.getBoundingClientRect().height);
      out.visible[id] = box.checkVisibility();
    }
    out.options = [...document.getElementById('skill-verify-tool').options].map((o) => o.value);
    const section = document.getElementById('settings-skills');
    const row = document.getElementById('skill-verify-tool').closest('.row');
    out.overflow = Math.round(
      row.getBoundingClientRect().right - section.getBoundingClientRect().right
    );
    out.check = Math.round(
      document.getElementById('skill-verify-untagged').getBoundingClientRect().height
    );
    return out;
  });
  console.log('    heights', JSON.stringify(shape.heights), 'tools', JSON.stringify(shape.options));
  check(
    'every control is visible',
    Object.values(shape.visible).every(Boolean),
    JSON.stringify(shape.visible)
  );
  check(
    'the counting tools are offered, and nothing else',
    [...shape.options].sort().join(',') === ',count_notes,list_notes',
    shape.options.join(',')
  );
  const hs = Object.values(shape.heights);
  check(
    'the three controls are one height',
    Math.max(...hs) - Math.min(...hs) <= 1,
    JSON.stringify(shape.heights)
  );
  check('the row stays inside the section', shape.overflow <= 0, `${shape.overflow}px past the edge`);

  // The number is hidden beside "unchanged" and shown beside a predicate that
  // compares against one.
  const toggling = await page.evaluate(() => {
    const expect = document.getElementById('skill-verify-expect');
    const value = document.getElementById('skill-verify-value');
    const read = () => value.checkVisibility();
    const set = (v) => {
      expect.value = v;
      expect.dispatchEvent(new Event('change', { bubbles: true }));
    };
    set('unchanged');
    const atRest = read();
    set('max');
    const withMax = read();
    return { atRest, withMax };
  });
  check(
    'the number hides beside "unchanged" and shows beside "at most"',
    toggling.atRest === false && toggling.withMax === true,
    JSON.stringify(toggling)
  );

  // Save a skill through the editor and read the block back off the server.
  await page.fill('#skill-name', 'Verify sweep');
  await page.fill('#skill-prompt', 'Tag every note that has no tags yet.');
  await page.evaluate(() => {
    for (const box of document.querySelectorAll('#skill-tool-list input')) {
      if (['tag_note', 'list_notes', 'count_notes'].includes(box.value)) box.checked = true;
    }
    document.getElementById('skill-verify-tool').value = 'count_notes';
    const expect = document.getElementById('skill-verify-expect');
    expect.value = 'max';
    expect.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('skill-verify-value').value = '0';
    document.getElementById('skill-verify-untagged').checked = true;
  });
  await page.click('#skill-add');
  await page.waitForTimeout(1200);

  const status = await page.textContent('#skill-status');
  // `apiJson`, not `fetch`: the app carries a session token on every request
  // and a bare fetch from the page answers 401.
  const stored = await page.evaluate(async () => {
    const prefs = await window.apiJson('/preferences');
    return (prefs.skills || []).find((s) => s.name === 'Verify sweep') || null;
  });
  check('the editor saved it', Boolean(stored), status.trim());
  check(
    'the block reached the server whole',
    stored &&
      JSON.stringify(stored.verify) ===
        JSON.stringify({
          tool: 'count_notes',
          field: 'count',
          expect: { max: 0 },
          args: { untagged: true },
        }),
    JSON.stringify(stored && stored.verify)
  );

  // Editing it again paints the same values back.
  await page.waitForTimeout(400);
  const painted = await page.evaluate(async () => {
    const row = [...document.querySelectorAll('#skill-list li')].find((li) =>
      li.textContent.includes('Verify sweep')
    );
    const edit =
      row && [...row.querySelectorAll('button')].find((b) => /edit/i.test(b.textContent));
    if (edit) edit.click();
    await new Promise((r) => setTimeout(r, 800));
    return {
      tool: document.getElementById('skill-verify-tool').value,
      expect: document.getElementById('skill-verify-expect').value,
      value: document.getElementById('skill-verify-value').value,
      untagged: document.getElementById('skill-verify-untagged').checked,
    };
  });
  check(
    'editing the skill paints its check back',
    painted.tool === 'count_notes' &&
      painted.expect === 'max' &&
      painted.value === '0' &&
      painted.untagged === true,
    JSON.stringify(painted)
  );

  // This one writes, unlike most sweeps, so it puts the notebook back: it is
  // in the merge gate's own list and a gate that leaves a skill behind every
  // time it runs is a gate that changes what the next sweep measures.
  const left = await page.evaluate(async () => {
    const prefs = await window.apiJson('/preferences');
    const keep = (prefs.skills || []).filter((s) => s.name !== 'Verify sweep');
    await window.apiJson('/preferences', {
      method: 'PUT',
      body: JSON.stringify({ skills: keep }),
    });
    const after = await window.apiJson('/preferences');
    return (after.skills || []).filter((s) => s.name === 'Verify sweep').length;
  });
  check('the sweep cleans up after itself', left === 0, `${left} left behind`);

  check('no page errors', errors.length === 0, errors.join(' | ') || 'none');
  console.log(fails.length ? `FAILED: ${fails.join(', ')}` : 'all checks passed');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
