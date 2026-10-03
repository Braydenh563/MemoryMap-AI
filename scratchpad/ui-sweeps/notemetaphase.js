// Where a fitNoteMetas pass spends its time: how many lines are drawn (the
// rest wait for `contentvisibilityautostatechange`), two bare forced layouts
// of those lines (a class on and off), then the pass, three times each.
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1440,height:900}});
  await page.evaluate(()=>{switchTab("notes");window.showNotesSection&&showNotesSection("browse");});
  await page.waitForTimeout(2500);
  console.log(JSON.stringify(await page.evaluate(()=>{
    const metas=[...document.querySelectorAll(".note-meta")];
    const drawn=metas.filter((m)=>m.checkVisibility({contentVisibilityAuto:true}));
    const out={lines:metas.length,drawn:drawn.length,runs:[]};
    for(let i=0;i<3;i++){
      let t=performance.now();
      for(const m of drawn)m.classList.add("is-measuring");void drawn[0].scrollWidth;
      for(const m of drawn)m.classList.remove("is-measuring");void drawn[0].scrollWidth;
      const layout=performance.now()-t;
      t=performance.now();fitNoteMetas(metas);void metas[0].scrollWidth;
      out.runs.push({twoLayouts:Math.round(layout*10)/10,pass:Math.round((performance.now()-t)*10)/10});
    }
    return out;
  })));
  await browser.close();
})();
