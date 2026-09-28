// One-row growing boxes keep their hint on one row: scrollHeight against
// clientHeight of every `textarea[rows="1"]` that is on screen, empty, after
// opening the reminder sheet, the chat and the palette's agent line.
//   BASE=... W=390 THEME=dark SCRATCH=.. node onerowhint.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1093);
(async()=>{
  const touch=W<600?{hasTouch:true,isMobile:true}:{};
  const {browser,page}=await boot({viewport:{width:W,height:W<600?844:614},...touch});
  const read=()=>page.evaluate(()=>[...document.querySelectorAll('textarea[rows="1"]')].filter(t=>t.checkVisibility()&&!t.value).map(t=>`#${t.id} ${t.scrollHeight}/${t.clientHeight} w=${Math.round(t.clientWidth)}`));
  await page.evaluate(()=>{ if(typeof switchTab==='function') switchTab('reminders'); });
  await page.waitForTimeout(800);
  await page.evaluate(()=>document.getElementById('reminders-new')?.click()); await page.waitForTimeout(800);
  console.log('reminders:', (await read()).join(' ; '));
  await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/onerowhint-${process.env.THEME||'light'}-${W}.png`});
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{ if(typeof switchTab==='function') switchTab('chat'); }); await page.waitForTimeout(800);
  console.log('chat:', (await read()).join(' ; '));
  await browser.close();
})();
