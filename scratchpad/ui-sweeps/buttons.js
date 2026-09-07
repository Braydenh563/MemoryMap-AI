const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  const tabs=[null,'notes','library','chat','graph','timeline','reminders'];
  const collect=async(label)=>{
    const r=await page.evaluate(()=>{
      const res={};
      document.querySelectorAll('button').forEach(b=>{
        if(!b.checkVisibility||!b.checkVisibility())return;
        const r=b.getBoundingClientRect(); if(r.width<6||r.height<6)return;
        const c=getComputedStyle(b);
        const icon=b.classList.contains('icon-only')?'ICON':(b.textContent.trim().length<=1?'icon?':'text');
        const key=`${icon} bg=${c.backgroundColor} bd=${c.borderTopWidth} ${c.borderTopColor} sh=${c.boxShadow==='none'?'none':'shadow'} cls=${[...b.classList].filter(x=>!/^ph/.test(x)).slice(0,3).join('.')}`;
        res[key]=(res[key]||0)+1;
      });
      return res;
    });
    const rows=Object.entries(r).sort((a,b)=>b[1]-a[1]);
    console.log('\n== '+label+' ('+rows.length+' signatures)\n'+rows.map(([k,n])=>n+'\t'+k).join('\n'));
  };
  for(const t of tabs){ if(t){await page.click(`[data-tab="${t}"]`).catch(()=>{});await page.waitForTimeout(800);} await collect(t||'dashboard'); }
  await browser.close();
})();
