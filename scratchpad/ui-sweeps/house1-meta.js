const {boot}=require('/tmp/claude-0/-home-user-MemoryMap-AI/6f4e131c-09dc-5f55-a233-ea4892b9aa72/scratchpad/wt-house1/scratchpad/ui-sweeps/lib.js');
(async()=>{
 for (const w of [320,390,1440]){
  const {browser,page}=await boot({viewport:{width:w,height:800},hasTouch:w<500,isMobile:w<500});
  await page.evaluate(()=>switchTab('notes')); await page.waitForTimeout(4000);
  const r=await page.evaluate(()=>{
   const out={};
   const li=[...document.querySelectorAll('#entry-list li')].filter(e=>e.offsetParent);
   let worstMeta=0,worstLi=0,n=0,ex=null;
   for(const l of li){
     const lr=l.getBoundingClientRect(); const p=l.parentElement.getBoundingClientRect();
     worstLi=Math.max(worstLi,lr.right-p.right);
     const m=l.querySelector('.note-meta, .entry-meta');
     if(m){const mr=m.getBoundingClientRect(); const d=mr.right-lr.right; if(d>worstMeta){worstMeta=d; ex=m.className+' w'+Math.round(mr.width)+' sw'+m.scrollWidth+' cw'+m.clientWidth;} if(mr.width>lr.width)n++}
   }
   return {cards:li.length,worstMetaOverCardRight:worstMeta,worstLiOverList:worstLi,metaWiderThanCard:n,ex,docScroll:document.documentElement.scrollWidth};
  });
  console.log(w,JSON.stringify(r));
  await browser.close();
 }
})();
