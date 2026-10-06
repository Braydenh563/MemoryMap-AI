// One chat head at 20px (assistantAvatar), each look, at the context's scale; saves PNG clips.
// INBOX 650: the small Atlas head (assistantAvatar under 28px), each look, at SC (1 or 2); writes one-<look>-<theme>-<sc>.png
// for scratchpad/ui-sweeps/atlasmini650.py to sample (eye vs skin, hair vs ground).  BASE=... SC=2 THEME=dark node atlasmini650.js
const {boot, OUT}=require('./lib.js');
const OUTD=OUT;
const N=+(process.env.N||20);
(async()=>{
 const SC=+(process.env.SC||1);
 const {browser,page}=await boot({scale:SC});
 for (const look of ['masculine','feminine']) {
  await page.evaluate((look)=>prefs.set('atlas-look', look), look);
  await page.waitForTimeout(1500);
  const info=await page.evaluate((N)=>{
   let s=document.getElementById('avstage'); if(s) s.remove();
   s=document.createElement('div'); s.id='avstage';
   Object.assign(s.style,{position:'fixed',left:'10px',top:'10px',zIndex:99999,width:N+'px',height:N+'px',background:getComputedStyle(document.body).backgroundColor});
   chatHeadSources.clear();
   const el=assistantAvatar(N); s.appendChild(el); document.body.appendChild(s);
   el.style.display='block';
   return {vb: el.getAttribute('viewBox'), w: el.getAttribute('width'), h: el.getAttribute('height'), nodes: el.querySelectorAll('*').length, mood: el.dataset.atlasMood, bg: getComputedStyle(document.body).backgroundColor};
  },N);
  console.log(look, JSON.stringify(info));
  await page.waitForTimeout(400);
  await page.screenshot({path:`${OUTD}/one-${look}-${process.env.THEME||'light'}-${SC}.png`,clip:{x:10,y:10,width:N,height:N}});
 }
 await browser.close();
})();
