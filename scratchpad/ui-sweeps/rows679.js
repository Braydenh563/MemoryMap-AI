// INBOX 679: a note's hover buttons stay shown while its own ⋯ menu is open.
// In card and rows view: hover the note, press its ⋯, read the strip's
// opacity (pointer still on the note, then on the menu's first item, then
// away from both), close the menu with Escape with the pointer away, read
// it again (must be 0).
//   BASE=http://127.0.0.1:8822 THEME=dark node rows679.js
const {boot}=require('./lib.js');
const ID=Number(process.env.ID||1);
(async()=>{
  const {browser,page}=await boot({viewport:{width:1440,height:900}});
  await page.evaluate(()=>switchTab('notes')); await page.waitForTimeout(1200);
  const sel=`#entry-list > li[data-id="${ID}"]`;
  const op=()=>page.evaluate((sel)=>{ const a=document.querySelector(sel+' .entry-actions'); const m=document.querySelector('.action-menu:not(.hidden)'); return `strip opacity=${getComputedStyle(a).opacity} menu=${m?'open':'closed'}`; },sel);
  for(const mode of ['cards','rows']){
    await page.evaluate((m)=>setNotesViewMode(m),mode); await page.waitForTimeout(600);
    const b=await (await page.$(sel)).boundingBox();
    await page.mouse.move(b.x+b.width*0.4,b.y+15); await page.waitForTimeout(400);
    const out=[`${mode}: hovered ${await op()}`];
    const more=await page.$(sel+' .entry-actions .menu-wrap > button');
    const mb=await more.boundingBox(); await page.mouse.move(mb.x+mb.width/2,mb.y+mb.height/2); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(400);
    out.push(`pressed: ${await op()}`);
    const item=await page.$('.action-menu:not(.hidden) .menu-item, .action-menu:not(.hidden) button');
    if(item){ const ib=await item.boundingBox(); await page.mouse.move(ib.x+ib.width/2,ib.y+ib.height/2); await page.waitForTimeout(400); out.push(`on menu: ${await op()}`); }
    await page.mouse.move(5,890); await page.waitForTimeout(400); out.push(`pointer away, menu open: ${await op()}`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await page.evaluate(()=>document.activeElement&&document.activeElement.blur()); await page.waitForTimeout(400);
    out.push(`closed, pointer away: ${await op()}`);
    console.log(out.join('\n  '));
  }
  await browser.close();
})();
