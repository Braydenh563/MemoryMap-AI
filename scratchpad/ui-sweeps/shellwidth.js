// The shell never scrolls sideways: at 320, 360 and 390 wide, in every text
// size and every density, on every tab, document.documentElement.scrollWidth
// must not pass innerWidth. (OPEN.md: at 360 with Text size Large + Density
// Spacious the shell was 368px wide, header controls plus five 74px tabs.)
// On a mobile context `innerWidth` grows to fit overflowing content (it read
// 368 at a 360 viewport), so the bound is the viewport the sweep asked for.
// Prints the widest offender when one fails. TABS=notes,chat to narrow.
const { boot } = require('./lib.js');
const SIZES = (process.env.SIZES || 'small,normal,large').split(',');
const DENSITIES = ['compact', 'comfortable', 'spacious'];
const WIDTHS = (process.env.WIDTHS || '320,360,390').split(',').map(Number);
let fails = 0;

(async () => {
  for (const width of WIDTHS) {
    const { browser, page } = await boot({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true });
    // The seven tabs, not the four the dock shows: the other three are in More.
    const tabs = process.env.TABS ? process.env.TABS.split(',') : ['dashboard', 'notes', 'chat', 'graph', 'library', 'timeline', 'reminders'];
    const sizes = await page.evaluate(() => [...document.querySelectorAll('#fontsize-seg button')].map((b) => b.dataset.fontsize));
    const sizeKeys = sizes.filter(Boolean).length ? sizes.filter(Boolean) : SIZES;
    for (const size of sizeKeys) {
      for (const density of DENSITIES) {
        await page.evaluate(([s, d]) => {
          localStorage.setItem('fontsize', s);
          localStorage.setItem('density', d);
          applyAppearance();
        }, [size, density]);
        await page.waitForTimeout(150);
        for (const tab of tabs) {
          await page.evaluate((t) => switchTab(t), tab);
          await page.waitForTimeout(250);
          const m = await page.evaluate((W) => {
            const de = document.documentElement;
            let worst = null;
            for (const el of document.querySelectorAll('body *')) {
              const r = el.getBoundingClientRect();
              if (r.width && r.right > W + 0.5 && el.offsetParent !== null && !el.closest('.hidden, [hidden]')) {
                if (!worst || r.right > worst.right) worst = { sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className).split(' ').join('.').slice(0, 60), right: Math.round(r.right) };
              }
            }
            return { sw: de.scrollWidth, bw: document.body.scrollWidth, iw: W, inner: innerWidth, size: de.dataset.fontsize || de.style.fontSize, worst };
          }, width);
          if (m.sw > m.iw || m.bw > m.iw) {
            fails++;
            console.log(`FAIL ${width} size=${size} density=${density} tab=${tab}: scrollWidth=${m.sw} body=${m.bw} inner=${m.iw} worst=${JSON.stringify(m.worst)}`);
          }
        }
      }
    }
    console.log(`${width}: ${sizeKeys.length} sizes x ${DENSITIES.length} densities x ${tabs.length} tabs checked (${tabs.join(',')}; sizes ${sizeKeys.join(',')})`);
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : 'ALL OK');
  process.exit(fails ? 1 : 0);
})();
