// INBOX 468: the suggested model cards' foot. Per card at W (default 1440):
// the badges row and the actions row, how many lines each takes, and the
// card height. SHOT=1 saves a screenshot of the first group.
const {boot,OUT}=require('./lib.js');
(async()=>{
  const w=+(process.env.W||1440),phone=w<600;
  const {browser,page}=await boot({viewport:{width:w,height:900},...(phone?{hasTouch:true,isMobile:true}:{})});
  await page.evaluate(()=>openSettingsModal('models'));
  await page.waitForTimeout(1500);
  await page.evaluate(()=>document.querySelectorAll('#settings-modal details').forEach((d)=>{if(d.querySelector('.model-card'))d.open=true;}));
  await page.waitForTimeout(500);
  const r=await page.evaluate(()=>{
    const lines=(els)=>{const tops=[...new Set(els.filter((e)=>e.getBoundingClientRect().height).map((e)=>Math.round(e.getBoundingClientRect().top+e.getBoundingClientRect().height/2)))].sort((a,b)=>a-b);return tops.reduce((a,t)=>a.length&&t-a[a.length-1]<6?a:[...a,t],[]).length;};
    return [...document.querySelectorAll('.model-card')].filter((c)=>c.getBoundingClientRect().height).map((c)=>{
      const badges=[...c.querySelectorAll('.model-card-badges > *')];
      const acts=[...c.querySelectorAll('.model-card-actions > :not(.model-card-badges)')];
      const foot=[...badges,...acts];
      const C=c.getBoundingClientRect();
      const over=foot.filter((e)=>e.getBoundingClientRect().right>C.right+0.5).length;
      return {name:c.dataset.model,h:Math.round(C.height),footLines:lines(foot),badgeLines:lines(badges),actLines:lines(acts),badges:badges.map((b)=>`${b.textContent.trim()}|${b.className}|h${Math.round(b.getBoundingClientRect().height*10)/10}`).join(", "),over};
    });
  });
  console.log(`${w}: cards ${r.length}, foot lines {${[...new Set(r.map((x)=>x.footLines))]}}, badge lines {${[...new Set(r.map((x)=>x.badgeLines))]}}, action lines {${[...new Set(r.map((x)=>x.actLines))]}}, heights {${[...new Set(r.map((x)=>x.h))].sort((a,b)=>a-b)}}, past edge ${r.reduce((a,x)=>a+x.over,0)}`);
  if(process.env.DETAIL) for(const x of r) console.log(JSON.stringify(x));
  if(process.env.SHOT){const f=`${OUT}/modelcards-${process.env.TAG||'x'}-${w}.png`;await page.locator('.model-card').first().locator('xpath=..').screenshot({path:f});console.log(f);}
  await browser.close();
})();
