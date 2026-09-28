// A sleepy Atlas and input (the "startled by Ctrl" reports): with Atlas
// sleepy, hold Ctrl for 40 frames and click the page 10 times away from any
// Atlas; count frames where any mark is surprised (target 0). Then poke an
// Atlas: it eases to calm (.atl-easing on), and stays calm through the
// resting-mood check. BASE=http://127.0.0.1:8861 node atlaswake.js
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:614}});
  const state=()=>page.evaluate(()=>({mood:atlasMoodNow,surprised:document.querySelectorAll('.nm-atlas.nm-surprised').length,marks:document.querySelectorAll('.nm-atlas').length,easing:document.querySelectorAll('.nm-atlas.atl-easing').length}));
  await page.evaluate(()=>setAtlasMood('sleepy'));
  await page.waitForTimeout(300);
  let surprised=0, frames=0;
  await page.keyboard.down('Control');
  for(let i=0;i<40;i++){ await page.keyboard.down('Control'); await page.waitForTimeout(50); const s=await state(); frames++; if(s.surprised||s.mood==='surprised') surprised++; }
  await page.keyboard.up('Control');
  for(let i=0;i<10;i++){ await page.mouse.click(600,300); await page.waitForTimeout(80); const s=await state(); frames++; if(s.surprised||s.mood==='surprised') surprised++; }
  const before=await state();
  console.log(`sleepy under input: ${surprised} of ${frames} frames surprised; mood after=${before.mood}; marks=${before.marks}`);
  await page.evaluate(()=>setAtlasMood('sleepy'));
  await page.waitForTimeout(200);
  // A poke: a click event on a visible mark.
  const poked=await page.evaluate(()=>{const m=[...document.querySelectorAll('.nm-atlas')].find(x=>x.checkVisibility()); if(!m) return false; m.dispatchEvent(new MouseEvent('click',{bubbles:true})); return true;});
  await page.waitForTimeout(100);
  const s1=await state();
  await page.waitForTimeout(2600);
  const s2=await state();
  const rest=await page.evaluate(()=>atlasRestingMood());
  console.log(`poke: poked=${poked} at+100ms mood=${s1.mood} easing=${s1.easing}; at+2.7s mood=${s2.mood} easing=${s2.easing}; resting=${rest}`);
  // A poke of an Atlas already awake: the reaction holds 3 to 5s, then eases
  // back (.atl-easing on) rather than snapping.
  await page.evaluate(()=>setAtlasMood('calm'));
  await page.evaluate(()=>{const m=[...document.querySelectorAll('.nm-atlas')].find(x=>x.checkVisibility()); m.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  const line=[];
  for(let t=0;t<=6000;t+=250){ const s=await state(); line.push(`${t}:${s.mood}${s.easing?'~':''}`); await page.waitForTimeout(250); }
  console.log('awake poke timeline (ms:mood, ~ easing): '+line.join(' '));
  await browser.close();
})();
