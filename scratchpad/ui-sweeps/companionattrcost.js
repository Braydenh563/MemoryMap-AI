// What one attribute or class change on #nm-buddy costs in style recalc, for
// Atlas: each is set, the style forced (a computed-style read), timed, and put
// back; median of 7. Env: BASE.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => {
    localStorage.setItem('atlas-look', 'masculine'); localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(3500);
  const r = await page.evaluate(async () => {
    clearTimeout(nmb.timer);
    const buddy = document.getElementById('nm-buddy');
    const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
    const time = (set, unset) => {
      const xs = [];
      for (let i = 0; i < 7; i += 1) {
        getComputedStyle(buddy).opacity;
        set(); const t = performance.now(); getComputedStyle(buddy).opacity; getComputedStyle(buddy.querySelector('.atl-layer-body')).opacity; xs.push(performance.now() - t);
        unset(); getComputedStyle(buddy).opacity;
      }
      return +med(xs).toFixed(2);
    };
    const out = {};
    for (const [k, v] of [['data-route', 'float'], ['data-pose', 'float'], ['data-perch', 'card'], ['data-legs', 'dangle'], ['data-side', 'l'], ['data-travel', 'float'], ['data-atlas-variant', 'x'], ['data-gait', 'feminine'], ['data-lean', 'l']]) {
      const had = buddy.getAttribute(k);
      out[k] = time(() => buddy.setAttribute(k, v), () => (had === null ? buddy.removeAttribute(k) : buddy.setAttribute(k, had)));
    }
    for (const c of ['nmb-walking', 'nmb-moving', 'nmb-float', 'nmb-act-wave', 'nmb-attend']) {
      out[`.${c}`] = time(() => buddy.classList.add(c), () => buddy.classList.remove(c));
    }
    out.style_transform = time(() => { buddy.style.transform = 'translate(10px, 20px)'; }, () => { buddy.style.transform = ''; });
    out.arm_rotate = time(() => { buddy.querySelector('.nmb-arm-l').style.rotate = '10deg'; }, () => { buddy.querySelector('.nmb-arm-l').style.rotate = ''; });
    out.layer_rotate = time(() => { buddy.querySelector('.atl-layer-lower').style.rotate = '10deg'; }, () => { buddy.querySelector('.atl-layer-lower').style.rotate = ''; });
    out.nodes = buddy.querySelectorAll('*').length;
    return out;
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
