// The notice family (the consistency pass): every visible callout, banner,
// hint or inline status box across the main surfaces and Settings, keyed by
// what it looks like (fill, edge, left rule, radius, padding, type size), so
// several recipes for one job show up as several signatures.
//   BASE=... W=1093 THEME=dark SCRATCH=.. node notices.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1093);
(async()=>{
  const {browser,page}=await boot({viewport:{width:W,height:W<600?844:614}});
  const collect=(label)=>page.evaluate((label)=>{
    const out=[];
    for(const el of document.querySelectorAll('[class*="notice"], [class*="banner"], [class*="callout"], [class*="-hint"], [class*="warning"], [class*="empty-state"], .help-body:not(.hidden), [role="alert"], p.status:not(:empty)')){
      if(!el.checkVisibility()) continue; const r=el.getBoundingClientRect(); if(r.width<40||r.height<14||r.top>innerHeight) continue;
      const c=getComputedStyle(el);
      const boxed=c.backgroundColor!=='rgba(0, 0, 0, 0)'||parseFloat(c.borderTopWidth)>0||parseFloat(c.borderLeftWidth)>0;
      if(!boxed) continue;
      const sig=`bg=${c.backgroundColor} bd=${c.borderTopWidth} ${c.borderTopColor} left=${c.borderLeftWidth} r=${c.borderTopLeftRadius} pad=${c.paddingTop}/${c.paddingLeft} fs=${c.fontSize}`;
      out.push({label,name:'.'+[...el.classList].slice(0,3).join('.')+(el.id?'#'+el.id:''),sig});
    }
    return out;
  },label);
  const all=[];
  const tab=async(n)=>{ await page.evaluate((n)=>{ if(typeof switchTab==='function') switchTab(n); },n); await page.waitForTimeout(900); };
  for(const t of ['dashboard','notes','chat','graph','timeline','library','reminders']){ await tab(t); all.push(...await collect(t)); }
  await page.evaluate(()=>document.getElementById('settings-btn')?.click()); await page.waitForTimeout(900);
  const sections=await page.evaluate(()=>[...document.querySelectorAll('#settings-modal [data-section]')].map(b=>b.dataset.section));
  for(const s of sections){ await page.evaluate((s)=>document.querySelector(`#settings-modal [data-section="${s}"]`)?.click(),s); await page.waitForTimeout(250); all.push(...await collect('settings/'+s)); }
  const by={}; for(const x of all){ (by[x.sig]=by[x.sig]||new Set()).add(`${x.label} ${x.name}`); }
  console.log(`${Object.keys(by).length} notice signatures`);
  for(const [sig,set] of Object.entries(by).sort((a,b)=>b[1].size-a[1].size)) console.log(`${String(set.size).padStart(3)}  ${sig}\n       ${[...set].slice(0,4).join(' | ')}`);
  await browser.close();
})();
