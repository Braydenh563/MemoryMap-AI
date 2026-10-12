// Where Atlas's arms go per mood and variant, measured rather than looked
// at: each arm outline sampled through its live transform into the
// drawing's own units, the hand taken as the point farthest from the
// shoulder, and the share of the arm lying out on the orbit rings' band
// (y 24 to 43, clear of the body) counted. MOODS=sleepy,happy,... (default
// every mood). A sleepy arm must not lie on the rings. POSE=lie (or sit,
// hang, curl...) measures the companion figure in that pose instead, where the
// pose's own arm rules outrank the mood's. ACT=wave (or bell...) adds the
// companion's act class, its resting frame (animations off).
//   BASE=... MOODS=sleepy SCRATCH=.. node atlasarms.js
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:614}});
  const moods=process.env.MOODS?process.env.MOODS.split(','):null;
  const pose=process.env.POSE||(process.env.ACT?'stand':''); const act=process.env.ACT||'';
  const rows=await page.evaluate(async({moods,pose,act,before})=>{
    const out=[];
    const list=moods||Object.keys(ATLAS_MOODS);
    for(const look of ['masculine','feminine']){
      localStorage.setItem('atlas-look',look);
      for(const mood of list){
        for(const v of [0,1,2]){
          let svg, host=null;
          if(pose){
            document.getElementById('nm-buddy')?.remove();
            host=document.createElement('div'); host.id='nm-buddy'; host.dataset.pose=pose; if(act) host.classList.add('nmb-act-'+act); host.dataset.atlasVariant=String(v);
            host.style.position='fixed'; host.style.left='0'; host.style.top='0'; host.style.width='64px'; host.style.height='92px';
            const fig=atlasFigure(); host.append(fig); document.body.append(host);
            fig.querySelectorAll('.nm-atlas').forEach(x=>{x.dataset.atlasMood=mood;});
            svg=fig.querySelector('.atl-layer-body');
          } else {
            svg=atlasDraw(240,'calm','full'); svg.dataset.atlasMood=mood; svg.dataset.atlasVariant=String(v);
            svg.style.position='fixed'; svg.style.left='0'; svg.style.top='0'; document.body.append(svg);
          }
          // BEFORE=1: without atlas-lazy.css (calm's arm variants, Brief 34 continues).
          if(before) document.querySelector('link[href*="atlas-lazy"]')?.remove();
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          // Transitions off: read the settled angle.
          svg.querySelectorAll('.nmb-arm').forEach(a=>{a.style.transition='none'; a.style.animation='none';});
          await new Promise(r=>requestAnimationFrame(r));
          // In the rig's own units: the pose turns the rig, the rings with it.
          const inv=(svg.querySelector('.atl-rig')||svg).getScreenCTM().inverse();
          const res=[];
          for(const side of ['l','r']){
            const arm=svg.querySelector(`.nmb-arm-${side}:not(:has(.atl-edge))`) || svg.querySelector(`.nmb-arm-${side}`);
            const path=arm.querySelector('path.atl-skin')||arm.querySelector('path');
            const m=inv.multiply(path.getScreenCTM());
            const L=path.getTotalLength(); const pts=[];
            for(let i=0;i<=60;i++){const p=path.getPointAtLength(L*i/60); pts.push(new DOMPoint(p.x,p.y).matrixTransform(m));}
            const sh=side==='l'?[24.6,41]:[37.4,41];
            const hand=pts.reduce((a,p)=>Math.hypot(p.x-sh[0],p.y-sh[1])>Math.hypot(a.x-sh[0],a.y-sh[1])?p:a,pts[0]);
            const onRing=pts.filter(p=>p.y>24&&p.y<43&&Math.abs(p.x-31)>9).length/pts.length;
            // The arm's angle off hanging straight down, outward positive.
            const ang=Math.atan2((hand.x-sh[0])*(side==='l'?-1:1), hand.y-sh[1])*180/Math.PI;
            res.push(`${side}: hand ${hand.x.toFixed(1)},${hand.y.toFixed(1)} ang ${ang.toFixed(0)} on-rings ${(onRing*100).toFixed(0)}%`);
          }
          out.push(`${look.padEnd(9)} ${mood.padEnd(10)}${pose?' '+pose:''} v${v}  ${res.join('  ')}`);
          (host||svg).remove();
        }
      }
    }
    localStorage.removeItem('atlas-look');
    return out;
  },{moods,pose,act,before:!!process.env.BEFORE});
  console.log(rows.join('\n'));
  await browser.close();
})();
