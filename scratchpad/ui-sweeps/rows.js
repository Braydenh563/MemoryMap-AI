const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  for(const t of ['notes','library','chat','reminders','dashboard']){
    await page.click(`[data-tab="${t}"]`).catch(()=>{});await page.waitForTimeout(700);
    const r=await page.evaluate(()=>{
      const vis=e=>e.checkVisibility&&e.checkVisibility();
      const out=[];
      document.querySelectorAll('.card .row, .card .toolbar, .library-toolbar, .card > header, .card-head, .card .card-header').forEach(r=>{
        if(!vis(r))return; if(r.closest('.entry-list li, .dash-widget'))return;
        const s=getComputedStyle(r);
        out.push(`${r.tagName.toLowerCase()}#${r.id||''}.${[...r.classList].slice(0,3).join('.')} gap=${s.gap} mt=${s.marginTop} mb=${s.marginBottom} h=${Math.round(r.getBoundingClientRect().height)}`);
      });
      const h2=[...document.querySelectorAll('.card h2')].filter(vis).map(h=>{const s=getComputedStyle(h);const p=h.parentElement;return `h2 "${h.textContent.trim().slice(0,16)}" parent=${p.tagName.toLowerCase()}.${[...p.classList].slice(0,2).join('.')} mt=${s.marginTop} mb=${s.marginBottom}`;});
      return out.concat(h2);
    });
    console.log('== '+t+'\n  '+r.join('\n  '));
  }
  await browser.close();
})();
