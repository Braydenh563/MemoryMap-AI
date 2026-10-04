// The graph options panel: does it fit or scroll inside, at both sizes.
// BASE=http://127.0.0.1:8796 [THEME=dark] node scratchpad/ui-sweeps/graphoptfit.js
const {boot}=require('./lib.js');
(async()=>{
for (const vp of [{width:1440,height:900},{width:390,height:844}]) {
  const phone = vp.width < 600;
  const {browser,page}=await boot({viewport:vp, ...(phone?{hasTouch:true,isMobile:true}:{})});
  await page.click('[data-tab="graph"]');await page.waitForTimeout(900);
  //: Open only if it is closed: the open state is remembered between runs.
  if (await page.evaluate(()=>document.getElementById('graph-options').classList.contains('hidden') || !document.getElementById('graph-options').offsetParent)) {
    await page.click('#graph-options-toggle');await page.waitForTimeout(600);
  }
  const r = await page.evaluate(()=>{
    const p = document.getElementById('graph-options');
    const cs = getComputedStyle(p), b = p.getBoundingClientRect();
    const zoom = [...document.querySelectorAll('.graph-zoom button, #graph-zoom-in, #graph-zoom-out')]
      .filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect());
    const hit = zoom.filter(z=>z.top < b.bottom && z.bottom > b.top && z.left < b.right && z.right > b.left).length;
    return {scrollH:p.scrollHeight, clientH:p.clientHeight, scrollW:p.scrollWidth, clientW:p.clientWidth,
      overflowY:cs.overflowY, overscroll:cs.overscrollBehaviorY, maxH:cs.maxHeight,
      top:Math.round(b.top), bottom:Math.round(b.bottom), vh:innerHeight, vw:innerWidth,
      coversZoomButtons:hit, parent:p.parentElement.className, scroller: (()=>{
        for (let e = p; e && e !== document.body; e = e.parentElement) {
          const c = getComputedStyle(e);
          if (/(auto|scroll)/.test(c.overflowY)) {
            const r = e.getBoundingClientRect();
            return {cls: e.className, scrollH: e.scrollHeight, clientH: e.clientHeight, overscroll: c.overscrollBehaviorY,
              top: Math.round(r.top), bottom: Math.round(r.bottom)};
          }
        }
        return null; })()};
  });
  if (!phone) {
    //: Wheel past the end of the list: the panel reaches the bottom, and the
    //: notches after it must not move anything behind it.
    const c = await page.evaluate(()=>{ const p=document.getElementById('graph-options'); const b=p.getBoundingClientRect(); return {x:b.left+b.width/2, y:b.top+b.height/2}; });
    await page.mouse.move(c.x, c.y);
    for (let i=0;i<8;i++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(60); }
    r.wheel = await page.evaluate(()=>{ const p=document.getElementById('graph-options'); return {atEnd: p.scrollTop + p.clientHeight >= p.scrollHeight - 1, pageScroll: document.scrollingElement.scrollTop}; });
  }
  console.log(vp.width+'x'+vp.height, process.env.THEME||'light', JSON.stringify(r));
  await browser.close();
}})();
