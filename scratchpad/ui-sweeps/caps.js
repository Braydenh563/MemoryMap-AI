const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  const all={};
  const collect=async(label)=>{
    const r=await page.evaluate(()=>{
      const out={};
      document.querySelectorAll('body *').forEach(e=>{
        if(!(e instanceof HTMLElement))return;
        if(e.closest('button, .chip, kbd, .seg, .tag, #tab-bar, #status-bar, .status-bar'))return;
        const c=getComputedStyle(e);
        if(c.textTransform!=='uppercase')return;
        if(!e.checkVisibility||!e.checkVisibility())return;
        const txt=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('').slice(0,20);
        if(!txt)return;
        const key=`${e.tagName.toLowerCase()}${e.className?'.'+[...e.classList].slice(0,2).join('.'):''} | ${parseFloat(c.fontSize).toFixed(1)}px w${c.fontWeight} ls=${c.letterSpacing} ${c.color}`;
        (out[key]=out[key]||{n:0,ex:txt}).n++;
      });
      return out;
    });
    for(const [k,v] of Object.entries(r)){ (all[k]=all[k]||{n:0,ex:v.ex,where:new Set()}); all[k].n+=v.n; all[k].where.add(label); }
  };
  for(const t of [null,'notes','library','chat','graph','timeline','reminders']){ if(t){await page.click(`[data-tab="${t}"]`).catch(()=>{});await page.waitForTimeout(700);} await collect(t||'dashboard'); }
  await page.click('#settings-btn'); await page.waitForTimeout(700);
  for(const s of ['models','tools','appearance','preferences','data','about']){ await page.click(`#settings-modal [data-section="${s}"]`).catch(()=>{}); await page.waitForTimeout(350); await collect('settings:'+s); }
  console.log(Object.entries(all).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`${v.n}\t${k}\t"${v.ex}"\t[${[...v.where].slice(0,4).join(',')}]`).join('\n'));
  await browser.close();
})();
