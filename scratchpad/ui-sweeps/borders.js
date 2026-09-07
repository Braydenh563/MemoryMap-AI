const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  const tabs=[null,'notes','library','chat','graph','timeline','whiteboard'];
  const out={};
  const collect=async(label)=>{
    const r=await page.evaluate(()=>{
      const res={};
      const isSurface=e=>e.matches('.card, .settings-section, .modal-card, .glass, .settings-group, .sidebar-panel');
      const bordered=e=>{const c=getComputedStyle(e);return parseFloat(c.borderTopWidth)>0&&c.borderTopStyle!=='none'&&c.borderTopColor!=='rgba(0, 0, 0, 0)';};
      document.querySelectorAll('body *').forEach(e=>{
        if(!(e instanceof HTMLElement))return;
        const rect=e.getBoundingClientRect(); if(rect.width<8||rect.height<8)return;
        if(!e.checkVisibility||!e.checkVisibility())return;
        if(!bordered(e))return;
        if(e.matches('input,select,textarea,button,summary'))return;
        let depth=0,p=e.parentElement;while(p){if(bordered(p))depth++;p=p.parentElement;}
        const key=e.tagName.toLowerCase()+'.'+[...e.classList].slice(0,3).join('.')+' d'+depth+(isSurface(e)?' S':'');
        res[key]=(res[key]||0)+1;
      });
      return res;
    });
    out[label]=r;
  };
  for(const t of tabs){
    if(t){await page.click(`[data-tab="${t}"]`).catch(()=>{});await page.waitForTimeout(900);}
    await collect(t||'dashboard');
  }
  await page.click('#settings-btn').catch(async()=>{await page.click('[data-action="settings"]').catch(()=>{});});
  await page.waitForTimeout(900);
  const secs=await page.$$eval('#settings-modal [data-section]',els=>els.map(e=>e.dataset.section));
  console.log('sections',secs.slice(0,20));
  for(const s of secs){await page.click(`#settings-modal [data-section="${s}"]`).catch(()=>{});await page.waitForTimeout(400);await collect('settings:'+s);}
  for(const [k,v] of Object.entries(out)){
    const rows=Object.entries(v).filter(([kk])=>/ d[1-9]/.test(kk)).sort((a,b)=>b[1]-a[1]);
    if(rows.length) console.log('\n== '+k+' (nested hairlines)\n'+rows.map(([kk,n])=>n+'\t'+kk).join('\n'));
  }
  await browser.close();
})();
