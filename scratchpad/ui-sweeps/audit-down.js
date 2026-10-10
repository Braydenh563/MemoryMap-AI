// Brief 43 item 5 (audit 2026-10-10): the server goes away mid-session. The
// page is already loaded (the shell is served by the server, so a reload would
// show the browser's own page); every request after that is refused the way a
// dead localhost port refuses it. Per tab, and per Settings section: what does
// a person see?
//   blank    the tab shows under 40 characters, no failed notice, no banner:
//            a surface that fails silently
//   said     some text on screen says the server cannot be reached
//   stale    the tab keeps what it already drew (not blank, but says nothing)
//   BASE=... node audit-down.js
const { boot } = require('./lib.js');
const SAYS = /can.?t reach|couldn.?t (reach|load|read)|not (running|responding|reachable)|connection|offline|server is|try again|failed|unavailable/i;
(async () => {
  const { browser, ctx, page } = await boot();
  const tabs = await page.evaluate(() => [...document.querySelectorAll('#tab-bar button')].map((b) => b.dataset.tab));
  // Visit nothing first: lazy tabs have never loaded their script. Cut the server.
  let blocked = 0;
  await ctx.route('**/*', (route) => { blocked += 1; route.abort('connectionrefused'); });
  const rows = [];
  const seenAfter = async () => page.evaluate((says) => {
    const re = new RegExp(says, 'i');
    const banner = [...document.querySelectorAll('[role="alert"], [role="status"], .toast, .banner, .offline-banner, #server-banner')]
      .filter((e) => e.checkVisibility && e.checkVisibility()).map((e) => e.textContent.trim()).filter(Boolean);
    return { banner: banner.filter((t) => re.test(t)).slice(0, 2), anyBanner: banner.length };
  }, SAYS.source);
  for (const t of tabs) {
    await page.evaluate((n) => { try { switchTab(n); } catch (e) {} }, t);
    await page.waitForTimeout(2500);
    const info = await page.evaluate(([n, says]) => {
      const re = new RegExp(says, 'i');
      const el = document.getElementById('tab-' + n);
      if (!el) return { missing: true };
      const text = (el.innerText || '').trim();
      return { len: text.length, failed: el.querySelectorAll('.is-failed, .surface-failed').length, says: re.test(text), sample: text.replace(/\s+/g, ' ').slice(0, 90) };
    }, [t, SAYS.source]);
    const b = await seenAfter();
    const said = info.says || info.failed > 0 || b.banner.length > 0;
    const verdict = said ? 'said' : info.len < 40 ? 'BLANK' : 'stale';
    rows.push({ tab: t, verdict, ...info, banner: b.banner });
    console.log(String(t).padEnd(11), verdict.padEnd(6), `len ${info.len} failed ${info.failed}`, JSON.stringify(b.banner), '|', info.sample);
  }
  console.log(`tabs ${rows.length}: said ${rows.filter((r) => r.verdict === 'said').length}, stale ${rows.filter((r) => r.verdict === 'stale').length}, BLANK ${rows.filter((r) => r.verdict === 'BLANK').length}; requests refused ${blocked}`);
  await browser.close();
})();
