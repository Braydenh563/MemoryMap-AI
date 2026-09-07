const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  const collect=async(label)=>{
    const r=await page.evaluate(()=>{
      const sel='h1,h2,h3,h4,h5,.setting-subhead,.dash-section-label,.eyebrow,.section-label,legend';
      const out=[];
      const els=[...document.querySelectorAll(sel)].filter(e=>e.checkVisibility&&e.checkVisibility());
      for(const e of els){
        const c=getComputedStyle(e);
        const caps=c.textTransform==='uppercase';
        // next visible element sibling that is a heading-like
        let n=e.nextElementSibling; while(n&&!(n.checkVisibility&&n.checkVisibility()))n=n.nextElementSibling;
        const nIs=n&&n.matches(sel);
        const nc=nIs?getComputedStyle(n):null;
        const sig=`${e.tagName.toLowerCase()}${e.className?'.'+[...e.classList].slice(0,2).join('.'):''} ${caps?'CAPS':'sent'} ${parseFloat(c.fontSize).toFixed(1)}px w${c.fontWeight}`;
        out.push({sig, text:e.textContent.trim().slice(0,28), adj:nIs?`${n.tagName.toLowerCase()}${n.className?'.'+[...n.classList].slice(0,2).join('.'):''} ${nc.textTransform==='uppercase'?'CAPS':'sent'} ${parseFloat(nc.fontSize).toFixed(1)}px w${nc.fontWeight}`:null, adjText:nIs?n.textContent.trim().slice(0,24):null});
      }
      return out;
    });
    const sigs={}; r.forEach(x=>{sigs[x.sig]=(sigs[x.sig]||0)+1;});
    console.log('\n== '+label+'\n'+Object.entries(sigs).sort((a,b)=>b[1]-a[1]).map(([k,n])=>n+'\t'+k).join('\n'));
    const adj=r.filter(x=>x.adj);
    if(adj.length) console.log('-- adjacent headings:\n'+adj.map(x=>`  [${x.sig}] "${x.text}"  ->  [${x.adj}] "${x.adjText}"`).join('\n'));
  };
  for(const t of [null,'notes','library','chat','graph','timeline','reminders']){ if(t){await page.click(`[data-tab="${t}"]`).catch(()=>{});await page.waitForTimeout(700);} await collect(t||'dashboard'); }
  await page.click('#settings-btn'); await page.waitForTimeout(700);
  for(const s of ['models','personas','tools','memory','websearch','appearance','preferences','data','account','extras','about']){ await page.click(`#settings-modal [data-section="${s}"]`).catch(()=>{}); await page.waitForTimeout(350); await collect('settings:'+s); }
  await browser.close();
})();
