// INBOX 678: "Show more" only on text that is actually clipped, and one
// line height clamped and opened. Seeds four notes once (marked "678:"), then
// in card view at the viewport given reports for each: whether it has the
// toggle, whether its text is clipped (scrollHeight vs clientHeight), the
// computed line-height and the first line box's height clamped and opened.
//   BASE=http://127.0.0.1:8822 VIEWPORT=1440x900 node rows678.js
const {boot}=require('./lib.js');
const [vw,vh]=(process.env.VIEWPORT||'1440x900').split('x').map(Number);
(async()=>{
  const {browser,page}=await boot({viewport:{width:vw,height:vh}});
  const ids=await page.evaluate(async()=>{
    const want={
      'spaced four':"678: spaced four\n\nSecond short line.\n\nThird short line.\n\nFourth short line.",
      'plain four':"678: plain four\nSecond line\nThird line\nFourth line",
      'long one':"678: long one. "+"A sentence that keeps going so the note is long enough to clip. ".repeat(14),
      'short':"678: short note.",
    };
    const all=await apiJson('/entries?limit=500').catch(()=>[]);
    const list=Array.isArray(all)?all:(all.items||all.entries||[]);
    const out={};
    for(const [k,c] of Object.entries(want)){ const f=list.find(e=>e.content===c); out[k]=f?f.id:(await apiJson('/entries',{method:'POST',body:JSON.stringify({content:c,category:'Work'})})).id; }
    return out;
  });
  await page.reload({waitUntil:'domcontentloaded'}); await page.waitForTimeout(4500);
  await page.evaluate(()=>switchTab('notes')); await page.waitForTimeout(1200);
  await page.evaluate(()=>setNotesViewMode('cards')); await page.waitForTimeout(1200);
  for(const [k,id] of Object.entries(ids)){
    const r=await page.evaluate(async(id)=>{
      const li=document.querySelector(`#entry-list > li[data-id="${id}"]`); if(!li) return 'not listed';
      li.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,250));
      const c=li.querySelector(':scope > .entry-content'); const more=li.querySelector(':scope > .entry-more');
      const line=(el)=>{ const range=document.createRange(); range.selectNodeContents(el); const rects=[...range.getClientRects()].filter(x=>x.height>0); return rects.length?+rects[0].height.toFixed(1):0; };
      const s=(x)=>`lh=${getComputedStyle(c).lineHeight} line=${line(c)} h=${c.clientHeight} sh=${c.scrollHeight} clamped=${c.classList.contains('entry-clamped')}`;
      const a=s(); let b='';
      if(more){ more.click(); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); b=s(); more.click(); }
      return `toggle=${!!more} | ${a}${b?' | opened '+b:''}`;
    },id);
    console.log(`${k.padEnd(12)} ${r}`);
  }
  await browser.close();
})();
