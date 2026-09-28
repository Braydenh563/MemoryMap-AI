// One still of each main surface, for looking at (not measuring): the
// dashboard, notes, capture, Ask, chat, graph, timeline, library, reminders.
//   BASE=... W=1440 THEME=dark SCRATCH=.. node surfaceshots.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1440);
(async()=>{
  const touch=W<600?{hasTouch:true,isMobile:true}:{};
  const {browser,page}=await boot({viewport:{width:W,height:W<600?844:900},...touch});
  const shot=(n)=>page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/surface-${n}-${process.env.THEME||'light'}-${W}.png`});
  for(const t of (process.env.TABS||'dashboard,notes,chat,graph,timeline,library,reminders').split(',')){
    await page.evaluate((n)=>switchTab(n),t); await page.waitForTimeout(1300); await shot(t);
  }
  await browser.close();
})();
