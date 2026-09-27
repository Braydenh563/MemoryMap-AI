// A hovered settings row keeps its muted hint readable: for every
// `.check-row` and `.setting-check` in Settings, hover it with the real
// pointer, then read the contrast of each muted text inside against the
// row's composited fill (every ancestor's background alpha-blended down to
// the page). Target 4.5:1 in both themes. Prints the worst few.
//   BASE=... THEME=dark SCRATCH=.. node rowhover.js
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1440,height:900}});
  await page.evaluate(()=>document.getElementById('settings-btn').click()); await page.waitForTimeout(900);
  const sections=await page.evaluate(()=>[...document.querySelectorAll('#settings-modal [data-section]')].map(b=>b.dataset.section));
  const results=[];
  for(const s of sections){
    await page.evaluate((s)=>document.querySelector(`#settings-modal [data-section="${s}"]`).click(),s); await page.waitForTimeout(250);
    const n=await page.evaluate(()=>{ window.__rows=[...document.querySelectorAll('#settings-modal .settings-section:not(.hidden) :is(.check-row, .setting-check)')].filter(r=>r.checkVisibility()&&r.querySelector('.muted, .setting-hint, small')); return window.__rows.length; });
    for(let i=0;i<Math.min(n,6);i++){
      const box=await page.evaluate((i)=>{ const r=window.__rows[i]; r.scrollIntoView({block:'center'}); const b=r.getBoundingClientRect(); return {x:b.left+b.width-30,y:b.top+b.height/2}; },i);
      await page.mouse.move(box.x,box.y); await page.waitForTimeout(250);
      const res=await page.evaluate((i)=>{
        const parse=(s)=>{const m=s.match(/\(([^)]+)\)/); if(!m) return [0,0,0,0]; const p=m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return s.startsWith('color(')?[p[1]*255,p[2]*255,p[3]*255,p.length>4?p[4]:1]:[p[0],p[1],p[2],p.length>3?p[3]:1];};
        const over=(t,b)=>{const a=t[3]+b[3]*(1-t[3]); return [0,1,2].map(k=>(t[k]*t[3]+b[k]*b[3]*(1-t[3]))/(a||1)).concat([a]);};
        const lum=(c)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);};
        const ground=(el)=>{const chain=[]; for(let n=el;n&&n.nodeType===1;n=n.parentElement) chain.push(parse(getComputedStyle(n).backgroundColor)); let g=parse(getComputedStyle(document.body).backgroundColor); if(!g[3]) g=[255,255,255,1]; for(const c of chain.reverse()) g=over(c,g); return g;};
        const r=window.__rows[i]; const out=[];
        for(const t of r.querySelectorAll('.muted, .setting-hint, small')){ if(!t.checkVisibility()||!t.textContent.trim()) continue; const g=ground(t); const fg=over(parse(getComputedStyle(t).color),g); const L1=lum(fg),L2=lum(g); out.push({ratio:(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05), text:t.textContent.trim().slice(0,30), row:r.getAttribute('for')||r.className, fill:getComputedStyle(r).backgroundColor}); }
        return out;
      },i);
      for(const x of res) results.push({...x, s});
    }
  }
  results.sort((a,b)=>a.ratio-b.ratio);
  console.log(`${results.length} hovered hints; worst:`);
  for(const x of results.slice(0,6)) console.log(`  ${x.ratio.toFixed(2)}:1  ${x.s.padEnd(12)} fill=${x.fill}  "${x.text}"`);
  await browser.close();
})();
