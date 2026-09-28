// The Library's Create picker: the dialog-head recipe (title on the X's
// centre line, the title larger than the sentence under it), a shot per
// theme. BASE=... THEME=dark W=390 SCRATCH=.. node createpicker.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1440);
(async()=>{
  const {browser,page}=await boot({viewport:{width:W,height:W<600?844:900}});
  await page.evaluate(()=>switchTab('library')); await page.waitForTimeout(1200);
  await page.click('#library-new-doc'); await page.waitForTimeout(800);
  console.log(await page.evaluate(()=>{const c=document.querySelector('.library-create-picker'); const t=c.querySelector('.dialog-head-title'), x=c.querySelector('.dialog-head-btn'), p=c.querySelector('.library-create-sub'); const m=(e)=>{const b=e.getBoundingClientRect(); return (b.top+b.bottom)/2;}; return `title ${getComputedStyle(t).fontSize} sub ${getComputedStyle(p).fontSize} centre-off ${(m(t)-m(x)).toFixed(1)}px x ${Math.round(x.getBoundingClientRect().height)}px gap-under-head ${Math.round(p.getBoundingClientRect().top-c.querySelector('.dialog-head').getBoundingClientRect().bottom)}px`;}));
  await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/createpicker-${process.env.THEME||'light'}-${W}.png`});
  await browser.close();
})();
