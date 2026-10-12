// Settings as rows, measured (WORLD_CLASS_PLAN 25f, gate 25.4).
//
//   BASE=http://127.0.0.1:8859 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/settingsrows.js
//
// For every row in settings-rows.js's SETTING_ROWS and LOOK_ROWS:
//   - found: the row comes up when its own name is typed into the Settings
//     search (`findSettings`, settings-find.js)
//   - rest: not marked changed in a fresh notebook
//   - changed: after the control is moved off its default, the row carries
//     `.setting-modified` and a visible reset
//   - reset: after the reset is pressed, the mark is gone and (for a notebook
//     setting) GET /preferences holds the default again
// A row whose control is not visible (a desktop-only row, a panel shown only
// when its switch is on) is reported as hidden and not driven.
// Then the settings file: export, change two settings, import, compare.
// Writes scratchpad/ui-sweeps/out/settingsrows.json and prints a summary.
const fs = require('fs');
const path = require('path');
const { boot } = require('./lib.js');

const OUTDIR = path.join(__dirname, 'out');
fs.mkdirSync(OUTDIR, { recursive: true });

async function openAt(page, id) {
  return page.evaluate(async (id) => {
    const el = document.getElementById(id);
    const pane = el && el.closest('.settings-section');
    if (!pane) return null;
    const name = pane.id.slice('settings-'.length);
    if (!document.getElementById('settings-modal').classList.contains('hidden')) showSettingsSection(name);
    else await openSettingsModal(name);
    return name;
  }, id);
}

function rowsInPage() {
  return [...SETTING_ROWS, ...LOOK_ROWS.map((r) => ({ ...r, look: true }))];
}

async function probe(page, row) {
  return page.evaluate((row) => {
    const el = document.getElementById(row.id);
    const rowEl = settingRowEl(row);
    const visible = !!(el && (row.seg ? el : (el.type === 'checkbox' || el.type === 'radio') ? rowEl : el).getClientRects().length);
    const name = rowEl ? settingRowName(row, rowEl) : '';
    const hits = name ? findSettings(name.split(' ').slice(0, 5).join(' '), 40) : [];
    const found = hits.some((hit) => hit.el === rowEl || hit.el.contains(el) || rowEl?.contains(hit.el) || (el?.labels && [...el.labels].includes(hit.el)));
    const button = rowEl?.querySelector(`.setting-reset[data-setting-key="${row.key}"]`);
    return {
      name,
      visible,
      found,
      modified: !!rowEl?.classList.contains('setting-modified'),
      resetShown: !!(button && !button.hidden && button.getClientRects().length),
      now: settingNow(row),
      h: rowEl ? Math.round(rowEl.getBoundingClientRect().height) : 0,
    };
  }, row);
}

//: Moves the control off its default the way a person would.
async function nudge(page, row) {
  return page.evaluate((row) => {
    const el = document.getElementById(row.id);
    const fire = (t) => { t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); };
    if (row.radio) {
      const other = [...document.querySelectorAll(`#settings-modal input[name="${row.radio}"]`)].find((r) => !r.checked);
      if (!other) return false;
      other.click();
      return true;
    }
    if (row.seg) {
      const other = [...el.querySelectorAll('button')].find((b) => !b.classList.contains('active'));
      if (!other) return false;
      other.click();
      return true;
    }
    if (el.type === 'checkbox') { el.click(); return true; }
    if (el.tagName === 'SELECT') {
      const other = [...el.options].find((o) => o.value !== el.value && !o.disabled);
      if (!other) return false;
      el.value = other.value;
      fire(el);
      return true;
    }
    if (el.type === 'range' || el.type === 'number') {
      const min = Number(el.min || 0), max = Number(el.max || 100), step = Number(el.step) || 1;
      const now = Number(el.value);
      el.value = String(now + step <= max ? now + step : Math.max(min, now - step));
      fire(el);
      return true;
    }
    el.value = el.value ? '' : 'http://127.0.0.1:9';
    fire(el);
    return true;
  }, row);
}

async function serverValue(page, key) {
  return page.evaluate(async (key) => (await apiJson('/preferences'))[key], key);
}

async function main() {
  const { browser, page } = await boot();
  await page.evaluate(() => openSettingsModal('models'));
  await page.waitForTimeout(2500);
  const rows = await page.evaluate(rowsInPage);
  const defaults = await page.evaluate(() => apiJson('/preferences/defaults'));
  const out = [];
  for (const row of rows) {
    const section = await openAt(page, row.id);
    await page.waitForTimeout(1400);
    const rest = await probe(page, row);
    const rec = { key: row.key, id: row.id, section, ...rest };
    if (!rest.visible) { rec.hidden = true; out.push(rec); continue; }
    if (!(await nudge(page, row))) { rec.noOther = true; out.push(rec); continue; }
    await page.waitForTimeout(900);
    const changed = await probe(page, row);
    rec.changedMarked = changed.modified && changed.resetShown;
    //: The marks' own share of any change in height: the row measured with
    //: them, then with them taken out (a control can reveal rows of its own).
    rec.grew = await page.evaluate((row) => {
      const rowEl = settingRowEl(row);
      const marks = [...rowEl.querySelectorAll('.setting-reset, .setting-scope')];
      const h1 = rowEl.getBoundingClientRect().height;
      marks.forEach((m) => { m.dataset.d = m.style.display; m.style.display = 'none'; });
      rowEl.classList.remove('setting-modified');
      const h0 = rowEl.getBoundingClientRect().height;
      marks.forEach((m) => { m.style.display = m.dataset.d; });
      rowEl.classList.add('setting-modified');
      return Math.round(h1 - h0);
    }, row);
    await page.evaluate((row) => {
      const b = settingRowEl(row)?.querySelector(`.setting-reset[data-setting-key="${row.key}"]`);
      if (b) b.click();
    }, row);
    await page.waitForTimeout(1500);
    const after = await probe(page, row);
    rec.resetCleared = !after.modified && !after.resetShown;
    if (!row.look) {
      const value = await serverValue(page, row.key);
      rec.serverDefault = JSON.stringify(value) === JSON.stringify(defaults[row.key]) || (row.ui !== undefined && Number(value) === row.ui);
      rec.serverValue = value;
    }
    out.push(rec);
  }

  // The settings file, round trip.
  const file = await page.evaluate(async () => {
    const before = await settingsFileSnapshot();
    await apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ recycle_bin_days: 3, auto_link_enabled: !before.preferences.auto_link_enabled }) });
    localStorage.setItem('shadow-intensity', '40');
    const t0 = performance.now();
    const result = await applySettingsFile(before);
    const ms = Math.round(performance.now() - t0);
    const after = await settingsFileSnapshot();
    const diff = Object.keys(before.preferences).filter((k) => JSON.stringify(before.preferences[k]) !== JSON.stringify(after.preferences[k]));
    return { applied: result.applied, skipped: result.skipped, ms, diff, shadow: localStorage.getItem('shadow-intensity'), shadowBefore: before.this_browser['shadow-intensity'] ?? null, keys: Object.keys(before.preferences).length, browserKeys: Object.keys(before.this_browser).length };
  });

  fs.writeFileSync(path.join(OUTDIR, 'settingsrows.json'), JSON.stringify({ rows: out, file }, null, 2));
  const driven = out.filter((r) => !r.hidden && !r.noOther);
  const count = (f) => out.filter(f).length;
  console.log(`rows ${out.length}; found by search ${count((r) => r.found)}; hidden ${count((r) => r.hidden)}; no other value ${count((r) => r.noOther)}`);
  console.log(`marked at rest ${count((r) => r.modified)}: ${out.filter((r) => r.modified).map((r) => r.key).join(', ')}`);
  console.log(`driven ${driven.length}; marked when changed ${driven.filter((r) => r.changedMarked).length}; cleared by reset ${driven.filter((r) => r.resetCleared).length}; server back to default ${driven.filter((r) => r.serverDefault).length} of ${driven.filter((r) => !LOOK(r)).length}`);
  for (const r of out) {
    const bad = !r.found || r.modified || (!r.hidden && !r.noOther && (!r.changedMarked || !r.resetCleared || r.serverDefault === false));
    if (bad) console.log('  ', JSON.stringify(r));
  }
  console.log('row height change when marked (px):', JSON.stringify(driven.filter((r) => r.grew).map((r) => [r.key, r.grew])));
  console.log('file:', JSON.stringify(file));
  await browser.close();
}

function LOOK(r) {
  return r.serverDefault === undefined;
}

main().catch((e) => { console.error(e); process.exit(1); });
