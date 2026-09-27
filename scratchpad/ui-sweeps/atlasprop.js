// Does Atlas's hand hold the bell and the lantern? In the companion's bell
// and lantern acts, the distance from the prop's top (the bell's crown, the
// lantern's string) to the nearest point of the right arm's outline, in the
// drawing's units, per look. Target: under 2.
//   BASE=... SCRATCH=.. node atlasprop.js
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:614}});
  const rows=await page.evaluate(async()=>{
    const out=[];
    for(const look of ['masculine','feminine']) for(const act of ['bell','lantern']){
      localStorage.setItem('atlas-look',look);
      document.getElementById('nm-buddy')?.remove();
      const h=document.createElement('div'); h.id='nm-buddy'; h.className=`nmb-act-${act}`; h.dataset.pose='stand';
      h.style.position='fixed'; h.style.left='300px'; h.style.top='200px'; h.style.width='64px'; h.style.height='92px';
      const fig=atlasFigure(); h.append(fig); document.body.append(h);
      fig.querySelectorAll('*').forEach(e=>{e.style.transition='none'; e.style.animation='none';});
      await new Promise(r=>setTimeout(r,200));
      const body=fig.querySelector('.atl-layer-body'); const rig=body.querySelector('.atl-rig');
      const inv=rig.getScreenCTM().inverse();
      const arm=body.querySelector('.nmb-arm-r path.atl-skin');
      const m=inv.multiply(arm.getScreenCTM()); const L=arm.getTotalLength();
      const pts=[]; for(let i=0;i<=120;i++){const q=arm.getPointAtLength(L*i/120); pts.push(new DOMPoint(q.x,q.y).matrixTransform(m));}
      const tip=pts.reduce((a,p)=>Math.hypot(p.x-37.4,p.y-41)>Math.hypot(a.x-37.4,a.y-41)?p:a,pts[0]);
      const prop=body.querySelector(act==='bell'?'.nmp-bell .atl-prop-bell':'.nmp-lantern .atl-prop-string');
      const pm=inv.multiply(prop.getScreenCTM());
      const top=act==='bell'?new DOMPoint(48.2,63.2).matrixTransform(pm):new DOMPoint(48.2,61).matrixTransform(pm);
      out.push(`${look.padEnd(9)} ${act.padEnd(7)} tip ${tip.x.toFixed(1)},${tip.y.toFixed(1)}  prop top ${top.x.toFixed(1)},${top.y.toFixed(1)}  gap to the hand's outline ${Math.min(...pts.map(p=>Math.hypot(p.x-top.x,p.y-top.y))).toFixed(1)}`);
      h.remove();
    }
    localStorage.removeItem('atlas-look');
    return out;
  });
  console.log(rows.join('\n'));
  await browser.close();
})();
