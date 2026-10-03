// Screenshot the notes list at one width (W, default 1440) for INBOX 455 (1).
const {boot,OUT}=require('./lib.js');
(async()=>{
  const w=+(process.env.W||1440),phone=w<600;
  const {browser,page}=await boot({viewport:{width:w,height:1000},...(phone?{hasTouch:true,isMobile:true}:{})});
  await page.evaluate(()=>{switchTab("notes");window.showNotesSection&&showNotesSection("browse");});
  await page.waitForTimeout(1500);
  if(process.env.HOVER) await page.hover("#entry-list > li[data-id] .entry-content");
  const f=`${OUT}/notemeta-${process.env.TAG||"x"}-${w}.png`;
  await (process.env.FULL ? page.locator("#entry-list") : page).screenshot({path:f});
  console.log(f);
  await browser.close();
})();
