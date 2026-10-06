// INBOX 455 (1): a note card's details line. Per card at 1440, 1100, 820 and
// 390 (touch): the card height, the date's offset from the card's right and
// bottom edges, how many lines the details line takes, and whether anything
// in it pokes past its box. VIEW=rows measures the rows view instead.
// Seed with seed-notemeta.js first.
const {boot}=require('./lib.js');
const WIDTHS=[1440,1100,820,390];
(async()=>{
  const out={};
  for(const w of WIDTHS){
    const phone=w<600;
    const {browser,page}=await boot({viewport:{width:w,height:900},...(phone?{hasTouch:true,isMobile:true}:{})});
    await page.evaluate((rows)=>{switchTab("notes");window.showNotesSection&&showNotesSection("browse");notesViewMode=rows?"rows":"cards";renderEntries();},process.env.VIEW==="rows");
    await page.waitForTimeout(1500);
    out[w]=await page.evaluate(()=>[...document.querySelectorAll("#entry-list > li[data-id]")].slice(0,10).map((li)=>{
      const L=li.getBoundingClientRect();
      const meta=li.querySelector(":scope > .entry-meta");
      const M=meta.getBoundingClientRect();
      const d=li.querySelector(".entry-date");
      const D=d?d.getBoundingClientRect():null;
      const kids=[...meta.querySelectorAll(":scope > *, :scope > .entry-meta-end > .entry-date")].filter((e)=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).position!=="absolute";});
      const tops=new Set(kids.map((e)=>Math.round(e.getBoundingClientRect().top+e.getBoundingClientRect().height/2)));
      const lines=[...tops].sort((a,b)=>a-b).reduce((acc,t)=>(acc.length&&t-acc[acc.length-1]<6?acc:[...acc,t]),[]).length;
      const past=kids.filter((e)=>e.getBoundingClientRect().right>M.right+1||e.getBoundingClientRect().left<M.left-1).length;
      const more=meta.querySelector(".note-meta-more:not([hidden])");
      return {id:li.dataset.id,h:Math.round(L.height),dateR:D?Math.round(L.right-D.right):null,dateB:D?Math.round(L.bottom-D.bottom):null,dateCY:D?Math.round(D.top+D.height/2-(M.top+M.height/2)):null,lines,metaH:Math.round(M.height),past,more:more?more.textContent.trim():"",tags:meta.querySelectorAll(".chip.hashtag:not([hidden])").length};
    }));
    await browser.close();
  }
  for(const w of WIDTHS){
    const rows=out[w];
    const xs=new Set(rows.map((r)=>r.dateR)),bs=new Set(rows.map((r)=>r.dateB));
    console.log(`${w}: dateR {${[...xs]}} dateB {${[...bs]}} wrapped ${rows.filter((r)=>r.lines>1).length}/${rows.length} past ${rows.reduce((a,r)=>a+r.past,0)} heights ${rows.map((r)=>r.h).join(",")}`);
    if(process.env.DETAIL) console.log(JSON.stringify(rows));
  }
})();
