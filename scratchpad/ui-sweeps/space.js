const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  const out={};
  for(const t of [null,'notes','library','chat','graph','timeline','reminders']){
    if(t){await page.click(`[data-tab="${t}"]`).catch(()=>{});await page.waitForTimeout(700);}
    const r=await page.evaluate(()=>{
      const vis=e=>e.checkVisibility&&e.checkVisibility();
      const cards=[...document.querySelectorAll('.card')].filter(vis);
      const pad={},radius={},gaps=[];
      cards.forEach(c=>{const s=getComputedStyle(c);const k=`${s.paddingTop}/${s.paddingRight}/${s.paddingBottom}/${s.paddingLeft}`;pad[k]=(pad[k]||0)+1;radius[s.borderTopLeftRadius]=(radius[s.borderTopLeftRadius]||0)+1;});
      // vertical gaps between consecutive top-level cards in main column
      const main=document.querySelector('main')||document.body;
      const rects=cards.filter(c=>!c.closest('.card:not(:scope)')||true).map(c=>c.getBoundingClientRect()).filter(r=>r.width>400).sort((a,b)=>a.top-b.top);
      for(let i=1;i<rects.length;i++){const g=Math.round(rects[i].top-rects[i-1].bottom); if(g>=0&&g<80) gaps.push(g);}
      const h2s={}; document.querySelectorAll('.card > h2, .card > .row h2, .card h2').forEach(h=>{if(!vis(h))return;const s=getComputedStyle(h);const k=`mt=${s.marginTop} mb=${s.marginBottom} fs=${s.fontSize}`;h2s[k]=(h2s[k]||0)+1;});
      const rows={}; document.querySelectorAll('.card .row, .card .toolbar, .card .entries-toolbar, .library-toolbar').forEach(r=>{if(!vis(r))return;const s=getComputedStyle(r);const k=`gap=${s.gap} mb=${s.marginBottom} mt=${s.marginTop}`;rows[k]=(rows[k]||0)+1;});
      const mainS=getComputedStyle(document.querySelector('main')||document.body);
      return {n:cards.length,pad,radius,gaps:[...new Set(gaps)].join(','),h2s,rows,mainPad:`${mainS.paddingTop}/${mainS.paddingRight}/${mainS.paddingBottom}/${mainS.paddingLeft} gap=${mainS.gap}`};
    });
    out[t||'dashboard']=r;
  }
  for(const [k,v] of Object.entries(out)){console.log('== '+k+' cards='+v.n+' main='+v.mainPad+' cardgaps='+v.gaps);console.log('  pad:',JSON.stringify(v.pad));console.log('  radius:',JSON.stringify(v.radius));console.log('  h2:',JSON.stringify(v.h2s));console.log('  rows:',JSON.stringify(v.rows));}
  await browser.close();
})();
