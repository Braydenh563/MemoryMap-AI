// PLAN P4: typing latency in the documents editor with the preview open. Loads
// a ~20k-word document, switches to Split, types 40 characters, and reports
// the keydown event durations (PerformanceObserver 'event' entries) plus the
// preview render count — the cost the per-keystroke re-render was paying.
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  await page.click('[data-tab="library"]');await page.waitForTimeout(500);
  await page.click('[data-target="library-view-docs"]');await page.waitForTimeout(700);
  const row=await page.$('.doc-list-item'); if(!row){console.log('no document');await browser.close();return;}
  await row.click();await page.waitForTimeout(1200);
  await page.evaluate(()=>{const words=[];for(let i=0;i<20000;i++)words.push(i%17===0?'\n\n## Section '+i:'word'+i);const t=document.getElementById('doc-content');t.value='# Big document\n\n'+words.join(' ');t.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForTimeout(800);
  const split=await page.$('#doc-view-split, [data-doc-view="split"], button[data-view="split"]'); if(split){await split.click();await page.waitForTimeout(800);}
  await page.evaluate(()=>{window.__evt=[];window.__renders=0;const orig=window.renderMarkdown;window.renderMarkdown=function(...a){window.__renders++;return orig.apply(this,a);};const po=new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='keydown'||e.name==='input')window.__evt.push({n:e.name,d:e.duration});});po.observe({type:'event',durationThreshold:16,buffered:true});});
  await page.focus('#doc-content');await page.keyboard.press('End');
  await page.keyboard.type(' the quick brown fox jumps over the lazy dog',{delay:40});
  await page.waitForTimeout(1200);
  const r=await page.evaluate(()=>{const ds=window.__evt.map(e=>e.d);ds.sort((a,b)=>a-b);const p=q=>ds.length?ds[Math.min(ds.length-1,Math.floor(q*ds.length))]:0;return {slowEvents:ds.length,p50:p(.5),p95:p(.95),max:ds[ds.length-1]||0,renders:window.__renders,preview:!!document.querySelector('#doc-preview:not(.hidden)')};});
  console.log(JSON.stringify(r));
  await browser.close();
})();
