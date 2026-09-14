// INBOX 207, the widened half: the header's icon buttons on the header's own
// ground. Seams, heights against a tab button, gaps, in both themes.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({});
  const read = async () => await page.evaluate(() => {
    const clusters = [...document.querySelectorAll('.header-cluster')];
    const tab = document.querySelector('#tab-bar button');
    const seams = clusters.flatMap((c) => [...c.querySelectorAll('*')]).filter((el) => el.offsetParent).filter((el) => {
      const cs = getComputedStyle(el);
      return cs.boxShadow !== 'none' && /inset/.test(cs.boxShadow);
    }).length;
    const shells = clusters.filter((c) => {
      const cs = getComputedStyle(c);
      return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
    }).length;
    const outlined = clusters.flatMap((c) => [...c.querySelectorAll('button')]).filter((b) => b.offsetParent).filter((b) => {
      const cs = getComputedStyle(b);
      return parseFloat(cs.borderTopWidth) > 0 || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent');
    }).map((b) => `${b.id}:${getComputedStyle(b).backgroundColor}/${getComputedStyle(b).borderTopWidth}`);
    return {
      theme: document.documentElement.dataset.mode || document.documentElement.getAttribute('data-theme') || 'n/a',
      clusters: clusters.length,
      seams,
      shells,
      outlined: outlined.length, outlinedWhich: outlined,
      clusterHeights: clusters.map((c) => Math.round(c.getBoundingClientRect().height * 10) / 10),
      buttonHeights: clusters.flatMap((c) => [...c.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => Math.round(b.getBoundingClientRect().height * 10) / 10)),
      tabHeight: tab ? Math.round(tab.getBoundingClientRect().height * 10) / 10 : null,
      gaps: clusters.map((c) => getComputedStyle(c).gap),
      headerOverflow: document.querySelector('header').scrollWidth - document.querySelector('header').clientWidth,
    };
  });
  console.log('207b light:', JSON.stringify(await read()));
  await page.click('#theme-btn');
  await page.waitForTimeout(600);
  console.log('207b dark:', JSON.stringify(await read()));
  await browser.close();
})();
