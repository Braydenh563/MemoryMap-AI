// INBOX 455 (1): what fitting every details line costs. SEED=n adds n notes
// with 6 to 12 tags first (once per data dir). Then: the notes in the list,
// the time of one fitNoteMetas pass over all of them, and of a window resize
// from 1440 to 1100 (the observer's own pass).
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1440,height:900}});
  if(process.env.SEED) await page.evaluate(async(n)=>{for(let i=0;i<n;i++){const tags=Array.from({length:6+i%7},(_,k)=>`topic-${(i*3+k)%40}`);await apiJson('/entries',{method:'POST',body:JSON.stringify({content:`Note ${i}: meeting next Friday about the plan`,tags})});}},+process.env.SEED);
  await page.evaluate(()=>{switchTab("notes");window.showNotesSection&&showNotesSection("browse");});
  await page.waitForTimeout(2500);
  const r=await page.evaluate(()=>{
    const metas=[...document.querySelectorAll(".note-meta")];
    const t0=performance.now();fitNoteMetas(metas);const one=performance.now()-t0;
    return {notes:metas.length,folded:metas.filter((m)=>m.querySelector(".note-meta-more:not([hidden])")).length,passMs:Math.round(one*10)/10};
  });
  const t1=Date.now();
  await page.setViewportSize({width:1100,height:900});
  const resize=await page.evaluate(()=>new Promise((res)=>{const t=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>res(Math.round(performance.now()-t))));}));
  console.log(JSON.stringify({...r,twoFramesAfterResizeMs:resize,wall:Date.now()-t1}));
  await browser.close();
})();
