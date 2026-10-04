// Does a second fit of every details line change what folded? It must not:
// a difference means the first fit ran against a stale line.
const {boot}=require('./lib.js');
(async()=>{
  const w=+(process.env.W||390),phone=w<600;
  const {browser,page}=await boot({viewport:{width:w,height:900},...(phone?{hasTouch:true,isMobile:true}:{})});
  await page.evaluate(()=>{switchTab("notes");window.showNotesSection&&showNotesSection("browse");});
  await page.waitForTimeout(+(process.env.WAIT||1500));
  const count=()=>page.evaluate(()=>[...document.querySelectorAll("#entry-list > li[data-id] > .note-meta")].map((m)=>m.querySelectorAll(":scope > [data-tag][hidden]").length+"/"+m.clientWidth+"/"+m.scrollWidth).join(" "));
  console.log("first ", await count());
  await page.evaluate(()=>fitNoteMetas([...document.querySelectorAll(".note-meta")]));
  console.log("second", await count());
  await browser.close();
})();
