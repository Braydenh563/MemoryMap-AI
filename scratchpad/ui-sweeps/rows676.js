// INBOX 676: the compact rows view, measured. For each viewport, collapsed
// and expanded, with the pointer on the row:
//  (a) the hover cluster (`.entry-actions`) against the row: inside it, and
//      centred on the row's first line (the chevron's centre is that line);
//      anything painted after the cluster's last button is listed;
//  (b) the vertical centre of title, snippet, category chip, tags and time
//      in a collapsed row: spread must be within 1px;
//  (c) the chevron in both states: size, border, fill, and the glyph's
//      transform (must be the same element, only the glyph turning);
//  (d) the toggle: the row's height sampled every animation frame through
//      an open and a close, the largest single-frame jump as a share of the
//      whole change, and an interrupted toggle (a second click mid-way) that
//      must reverse from the current height rather than snap.
//   BASE=http://127.0.0.1:8822 THEME=dark VIEWPORT=1920x1080 node rows676.js
const {boot}=require('./lib.js');
const [vw,vh]=(process.env.VIEWPORT||'1440x900').split('x').map(Number);
const ID=Number(process.env.ID||1);
(async()=>{
  const phone=vw<600;
  const {browser,page}=await boot({viewport:{width:vw,height:vh},...(phone?{hasTouch:true,isMobile:true}:{})});
  await page.evaluate(()=>switchTab('notes')); await page.waitForTimeout(1200);
  await page.evaluate(()=>setNotesViewMode('rows')); await page.waitForTimeout(600);
  const sel=`#entry-list > li[data-id="${ID}"]`;
  const hover=async()=>{ const b=await (await page.$(sel)).boundingBox(); if(!phone){ await page.mouse.move(b.x+b.width*0.4,b.y+Math.min(b.height/2,20)); } await page.waitForTimeout(450); };
  const measure=()=>page.evaluate((sel)=>{
    const li=document.querySelector(sel); const L=li.getBoundingClientRect();
    const cy=(el)=>{const r=el.getBoundingClientRect(); return r.top+r.height/2-L.top;};
    const chev=li.querySelector(':scope > .row-expand'); const glyph=chev&&chev.querySelector('i,svg');
    const cs=getComputedStyle(chev); const gs=glyph&&getComputedStyle(glyph);
    const acts=li.querySelector('.entry-actions'); const A=acts.getBoundingClientRect(); const as=getComputedStyle(acts);
    const vis=(e)=>e&&e.checkVisibility&&e.checkVisibility()&&e.getBoundingClientRect().width>0;
    const parts={title:li.querySelector(':scope > .entry-title'),snippet:li.querySelector(':scope > .entry-content'),
      category:li.querySelector('.entry-meta .chip.category'),tag:li.querySelector('.entry-meta .chip.tag'),time:li.querySelector('.entry-meta .entry-date')};
    const centres={}; for(const [k,e] of Object.entries(parts)) if(vis(e)) centres[k]=+cy(e).toFixed(1);
    // Painted things after the cluster's last button, inside the cluster's box.
    const kids=[...acts.querySelectorAll('button, .menu-wrap, span, i')].filter(vis);
    const lastBtn=[...acts.querySelectorAll(':scope > button, :scope > .menu-wrap > button')].filter(vis).pop();
    const stray=lastBtn?kids.filter(k=>k.getBoundingClientRect().left>=lastBtn.getBoundingClientRect().right-1).map(k=>k.tagName.toLowerCase()+'.'+[...k.classList].join('.')):[];
    // What paints right of the cluster in the row (the "stray circle").
    const R=[]; for(const e of li.querySelectorAll('*')){ if(!vis(e)) continue; const r=e.getBoundingClientRect(); if(r.left>=A.right-1 && r.width>4 && r.top<L.bottom) R.push(e.tagName.toLowerCase()+'.'+[...e.classList].join('.')+` ${Math.round(r.width)}x${Math.round(r.height)}`); }
    const C=chev.getBoundingClientRect();
    return {li:{h:+L.height.toFixed(1)}, chevron:{w:Math.round(C.width),h:Math.round(C.height),cy:+cy(chev).toFixed(1),border:cs.borderTopWidth+' '+cs.borderTopColor,bg:cs.backgroundColor,shadow:cs.boxShadow,glyph:glyph&&glyph.className,glyphTransform:gs&&gs.transform,glyphTransition:gs&&gs.transition},
      actions:{opacity:as.opacity,top:+(A.top-L.top).toFixed(1),bottom:+(A.bottom-L.top).toFixed(1),cy:+cy(acts).toFixed(1),right:+(L.right-A.right).toFixed(1),inside:A.top>=L.top-0.5&&A.bottom<=L.bottom+0.5&&A.right<=L.right+0.5,bg:as.backgroundColor,stray,rightOf:R},
      centres, spread:Object.keys(centres).length?+(Math.max(...Object.values(centres))-Math.min(...Object.values(centres))).toFixed(1):0};
  },sel);
  const out={vp:`${vw}x${vh}`,theme:process.env.THEME||'light'};
  await hover(); out.collapsed=await measure();
  const chevId1=await page.evaluate((sel)=>{const b=document.querySelector(sel+' > .row-expand'); b.dataset.probe='1'; return 1;},sel);
  // (d) open, sampled per frame.
  const sample=(clicks)=>page.evaluate(async({sel,clicks})=>{
    const hs=[]; window.__gaps=[]; let last=performance.now(); const t0=last;
    const btn=()=>document.querySelector(sel+' > .row-expand');
    btn().click();
    await new Promise((res)=>{ const step=()=>{ const el=document.querySelector(sel); hs.push(+el.getBoundingClientRect().height.toFixed(1)); const now=performance.now(); window.__gaps.push(Math.round(now-last)); last=now; const t=now-t0;
      if(clicks.includes(hs.length)) btn().click();
      if(t<900) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
    return hs;
  },{sel,clicks});
  const jump=(hs)=>{ const total=Math.abs(hs[hs.length-1]-hs[0])||1; let max=0; const first=hs[0]; for(let i=1;i<hs.length;i++) max=Math.max(max,Math.abs(hs[i]-hs[i-1])); return {from:first,to:hs[hs.length-1],frames:hs.length,maxJump:+max.toFixed(1),maxJumpShare:+(max/total).toFixed(2)}; };
  const openHs=await sample([]);
  out.open={...jump(openHs),maxFrameMs:await page.evaluate(()=>Math.max(...window.__gaps.slice(1)))};
  await hover(); out.expanded=await measure();
  out.sameChevron=await page.evaluate((sel)=>document.querySelector(sel+' > .row-expand').dataset.probe==='1',sel);
  const closeHs=await sample([]);
  out.close=jump(closeHs);
  // Interrupted: open, then click again at frame 5; the height must turn
  // back from where it was (no frame-to-frame jump bigger than a normal one).
  const intHs=await sample([5]);
  const peak=Math.max(...intHs);
  // Share against the distance actually travelled (up to the peak and back).
  let imax=0; for(let i=1;i<intHs.length;i++) imax=Math.max(imax,Math.abs(intHs[i]-intHs[i-1]));
  out.interrupt={peak,back:intHs[intHs.length-1],maxJump:+imax.toFixed(1),maxJumpShareOfPeak:+(imax/((peak-intHs[0])||1)).toFixed(2),trace:intHs.slice(0,14).join(' ')};
  out.openTrace=openHs.slice(0,16).join(' ');
  console.log(JSON.stringify(out,null,1));
  if(process.env.SHOT){ await page.evaluate((sel)=>document.querySelector(sel+' > .row-expand').click(),sel); await page.waitForTimeout(600); await hover();
    const b=await (await page.$(sel)).boundingBox(); await page.screenshot({path:(process.env.SCRATCH||'.')+`/rows676-${vw}-${out.theme}.png`,clip:{x:Math.max(0,b.x-8),y:Math.max(0,b.y-8),width:Math.min(b.width+16,vw),height:Math.min(b.height+16,500)}}); }
  await browser.close();
})();
