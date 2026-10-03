// Cards drawn only once scrolled to (content-visibility) are fitted then:
// after scrolling the Notes list to its end, no drawn details line is over
// its box and every "+N" says a number.
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:+(process.env.W||1100),height:900}});
  await page.evaluate(()=>{switchTab("notes");window.showNotesSection&&showNotesSection("browse");});
  await page.waitForTimeout(2000);
  for(let i=0;i<12;i++){await page.mouse.move(600,600);await page.mouse.wheel(0,900);await page.waitForTimeout(250);}
  await page.waitForTimeout(800);
  console.log(JSON.stringify(await page.evaluate(()=>{
    const drawn=[...document.querySelectorAll(".note-meta")].filter((m)=>m.checkVisibility({contentVisibilityAuto:true}));
    const r=(m)=>m.getBoundingClientRect();
    const onScreen=drawn.filter((m)=>r(m).bottom>0&&r(m).top<innerHeight);
    return {drawn:drawn.length,onScreen:onScreen.length,over:onScreen.filter((m)=>m.scrollWidth>m.clientWidth).length,folded:onScreen.filter((m)=>m.querySelector(".note-meta-more:not([hidden])")).length,firstId:onScreen[0]?.closest("li")?.dataset.id};
  })));
  await browser.close();
})();
