// Brief 34 continues, step 5 (INBOX 752, the owner: "so incredibly smoothe
// between everything and every event"). The corner Atlas on the dashboard:
// 1. Reaction latency, from the end of the 1.5s debounce (the moment
//    `setAtlasMood` is called, INBOX 773) to the first frame that has the
//    new mood on the companion's drawing. TRIALS (5).
// 2. Snaps: every frame for MS (60000), the hands' and the head's centres
//    relative to the figure; a snap is a jump over 4px in one frame out of
//    under 1px a frame for the three frames before (a start with no ease).
// 3. Idle variety: the distinct things it does in that time (its act, its
//    pose, its tail's act, its arm variant), as `kind:value`.
//   BASE=... MS=60000 node atlassmooth.js
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1440,height:900}});
  await page.evaluate(()=>{ localStorage.removeItem('nm-buddy-spots'); const b=document.getElementById('avatar-buddy'); b.value='atlas'; b.dispatchEvent(new Event('change',{bubbles:true})); revealTab('dashboard'); });
  await page.waitForTimeout(6000);
  const lat=await page.evaluate(async(n)=>{
    const out=[]; const moods=['proud','worried','happy','confused','delighted','thinking','shy'];
    for(let i=0;i<n;i++){
      const mood=moods[i%moods.length];
      const t0=performance.now(); setAtlasMood(mood,2000,{quiet:true});
      const t=await new Promise(res=>{const f=()=>{const s=document.querySelector('#nm-buddy .atl-layer-body'); if(s&&s.dataset.atlasMood===mood) res(performance.now()-t0); else requestAnimationFrame(f);}; requestAnimationFrame(f);});
      out.push(Math.round(t)); await new Promise(r=>setTimeout(r,3000));
    }
    return out;
  }, +(process.env.TRIALS||5));
  const res=await page.evaluate(async(ms)=>{
    const buddy=document.getElementById('nm-buddy');
    const c=(el)=>{if(!el)return null; const r=el.getBoundingClientRect(); return r.width?[r.left+r.width/2,r.top+r.height/2]:null;};
    const parts=()=>{const box=buddy.querySelector('.atl-figure-box'); const b=c(box); return {b, h:[...buddy.querySelectorAll('.atl-layer-body .atl-hand')].slice(0,2).map(c), head:c(buddy.querySelector('.atl-layer-body .atl-head'))};};
    const hist={}; let snaps=0; const seen=new Set(); const where=[];
    const t0=performance.now();
    await new Promise(done=>{const f=()=>{
      const p=parts(); if(p.b){
        const pts={head:p.head, hl:p.h[0], hr:p.h[1]};
        for(const [k,v] of Object.entries(pts)){ if(!v) continue; const rel=[v[0]-p.b[0], v[1]-p.b[1]]; const H=hist[k]||(hist[k]=[]); H.push(rel); if(H.length>5) H.shift();
          if(H.length===5){ const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]); const jump=d(H[4],H[3]); const before=Math.max(d(H[3],H[2]),d(H[2],H[1]),d(H[1],H[0])); if(jump>4&&before<1){snaps++; where.push(`${k}@${Math.round(performance.now()-t0)}:${buddy.className.match(/nmb-act-\w+/)?.[0]||buddy.dataset.pose}`);} } }
      }
      const tail=buddy.querySelector('.atl-figure-box')?.atlasTail;
      seen.add('act:'+((buddy.className.match(/nmb-act-[\w-]+/)||[''])[0])); seen.add('pose:'+buddy.dataset.pose); if(tail) seen.add('tail:'+tail.act); seen.add('arms:'+buddy.dataset.atlasVariant); seen.add('mood:'+atlasMoodNow);
      if(performance.now()-t0<ms) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f);});
    return {snaps, where:where.slice(0,10), distinct:[...seen].filter(x=>!/:(undefined)?$/.test(x))};
  }, +(process.env.MS||60000));
  console.log(JSON.stringify({latencyMs:lat, snapsPerRun:res.snaps, snapAt:res.where, distinct:res.distinct.length, list:res.distinct}));
  await browser.close();
})();
