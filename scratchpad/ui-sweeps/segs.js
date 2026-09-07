const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  const segs={}, labels={};
  const collect=async(label)=>{
    const r=await page.evaluate(()=>{
      const segs=[], labels={};
      document.querySelectorAll('.seg, .segmented-control, [role="tablist"]').forEach(s=>{
        if(!s.checkVisibility())return;
        const c=getComputedStyle(s);
        const kids=[...s.querySelectorAll(':scope > button, :scope > label')];
        const role=s.getAttribute('role')||(kids.some(k=>k.getAttribute('role')==='tab')?'tabs':kids.some(k=>k.querySelector('input[type=radio]'))?'radio':kids.some(k=>k.hasAttribute('aria-pressed'))?'pressed':'?');
        segs.push({id:s.id||'', cls:[...s.classList].slice(0,3).join('.'), role, n:kids.length, bg:c.backgroundColor, bd:c.borderTopWidth+' '+c.borderTopColor, radius:c.borderTopLeftRadius, first:(kids[0]?.textContent||'').trim().slice(0,14)});
      });
      document.querySelectorAll('#settings-modal .row > label, #settings-modal .setting-label, #settings-modal .setting-row > label').forEach(l=>{
        if(!l.checkVisibility())return;
        const c=getComputedStyle(l); const key=`${c.flexBasis}/${c.width==='auto'?'auto':Math.round(parseFloat(c.width))}/${c.minWidth}`;
        labels[key]=(labels[key]||0)+1;
      });
      return {segs,labels};
    });
    r.segs.forEach(s=>{const k=`${s.cls} ${s.role} bg=${s.bg} bd=${s.bd} r=${s.radius}`; (segs[k]=segs[k]||{n:0,ex:[]}); segs[k].n++; if(segs[k].ex.length<3)segs[k].ex.push(label+':'+(s.id||s.first));});
    for(const [k,v] of Object.entries(r.labels)){labels[k]=(labels[k]||0)+v;}
  };
  for(const t of [null,'notes','library','chat','graph','timeline','reminders']){ if(t){await page.click(`[data-tab="${t}"]`).catch(()=>{});await page.waitForTimeout(700);} await collect(t||'dashboard'); }
  await page.click('#settings-btn'); await page.waitForTimeout(700);
  for(const s of ['models','personas','tools','memory','websearch','appearance','preferences','data','account']){ await page.click(`#settings-modal [data-section="${s}"]`).catch(()=>{}); await page.waitForTimeout(350); await collect('settings:'+s); }
  console.log('SEGS\n'+Object.entries(segs).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`${v.n}\t${k}\t${v.ex.join(' | ')}`).join('\n'));
  console.log('\nLABEL COLS (flex-basis/width/min-width)\n'+Object.entries(labels).sort((a,b)=>b[1]-a[1]).map(([k,n])=>n+'\t'+k).join('\n'));
  await browser.close();
})();
