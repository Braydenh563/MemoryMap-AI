// Every heading that shares a row with buttons (a card's head, a panel's
// title bar): the heading's centre against the row's buttons', over the main
// tabs and Settings. A stray heading margin shows as an offset (the
// `.card h2` margin that put dialog and sheet titles 4.8px high).
//   BASE=... W=1440 SCRATCH=.. node headrows.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1093);
(async()=>{
  const {browser,page}=await boot({viewport:{width:W,height:W<600?844:(W>=1440?900:614)}});
  const collect=(label)=>page.evaluate((label)=>{
    const out=[];
    for(const h of document.querySelectorAll('h1, h2, h3, h4')){
      if(!h.checkVisibility()) continue;
      const row=h.parentElement; const rc=getComputedStyle(row);
      if(!rc.display.includes('flex')||rc.flexDirection.startsWith('column')) continue;
      const btns=[...row.querySelectorAll(':scope > button, :scope > * > button, :scope > .menu-wrap > button')].filter(b=>b.checkVisibility()&&b.getBoundingClientRect().height>=20);
      if(!btns.length) continue;
      const c=(e)=>{const b=e.getBoundingClientRect(); return (b.top+b.bottom)/2;};
      const hb=h.getBoundingClientRect(); if(hb.top>innerHeight||hb.bottom<0) continue;
      const off=Math.max(...btns.map(b=>Math.abs(c(b)-c(h))));
      if(off>1.5) out.push(`${label.padEnd(20)} ${(h.tagName+'.'+[...h.classList].join('.')+(h.id?'#'+h.id:'')).padEnd(40)} "${h.textContent.trim().slice(0,22)}" off=${off.toFixed(1)}px mb=${getComputedStyle(h).marginBottom} mt=${getComputedStyle(h).marginTop} row-align=${rc.alignItems}`);
    }
    return out;
  },label);
  const all=[];
  const tab=async(n)=>{ await page.evaluate((n)=>{ if(typeof switchTab==='function') switchTab(n); },n); await page.waitForTimeout(900); };
  for(const t of ['dashboard','notes','chat','graph','timeline','library','reminders']){ await tab(t); all.push(...await collect(t)); }
  await page.evaluate(()=>document.getElementById('settings-btn')?.click()); await page.waitForTimeout(900);
  const sections=await page.evaluate(()=>[...document.querySelectorAll('#settings-modal [data-section]')].map(b=>b.dataset.section));
  for(const s of sections){ await page.evaluate((s)=>document.querySelector(`#settings-modal [data-section="${s}"]`)?.click(),s); await page.waitForTimeout(250); all.push(...await collect('settings/'+s)); }
  console.log(`${[...new Set(all)].length} heading rows off by more than 1.5px`);
  console.log([...new Set(all)].join('\n'));
  await browser.close();
})();
