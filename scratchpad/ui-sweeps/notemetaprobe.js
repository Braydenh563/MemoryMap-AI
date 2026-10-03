// Probe one card's details line at W (default 390, touch): every child's box.
// VIEW=rows for the rows view.
const {boot}=require('./lib.js');
(async()=>{
  const w=+(process.env.W||390),phone=w<600;
  const {browser,page}=await boot({viewport:{width:w,height:900},...(phone?{hasTouch:true,isMobile:true}:{})});
  await page.evaluate((rows)=>{switchTab("notes");window.showNotesSection&&showNotesSection("browse");if(rows){notesViewMode="rows";renderEntries();}},!!process.env.VIEW);
  await page.waitForTimeout(1500);
  console.log(JSON.stringify(await page.evaluate((id)=>{
    const li=document.querySelector(`#entry-list > li[data-id="${id}"]`);
    const meta=li.querySelector(":scope > .entry-meta");const M=meta.getBoundingClientRect();
    const all=[...meta.querySelectorAll("*")].filter((e)=>e.parentElement===meta||e.parentElement.classList.contains("entry-meta-end")||e.parentElement.classList.contains("entry-actions"));
    return {meta:[Math.round(M.left),Math.round(M.right),Math.round(M.top),Math.round(M.height)],cw:meta.clientWidth,sw:meta.scrollWidth,kids:all.map((e)=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return `${e.className}|${e.hidden?"H":""}|${Math.round(r.left)}-${Math.round(r.right)} y${Math.round(r.top)} h${Math.round(r.height)} ${cs.display} ${cs.position} ml${cs.marginLeft}`;})};
  },process.env.ID||"5"),null,1));
  await browser.close();
})();
