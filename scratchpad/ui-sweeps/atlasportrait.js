// Atlas at the sizes the owner checks: full (320px), head (80px), the
// companion figure (64x92, the app's own box), the icon (24px), per look,
// on the page's own background. Writes shots/atlas-portrait-<TAG>-<theme>.png.
// POSE=lie (or any data-pose) sets the companion figure's pose; SWAY=1
// captures three frames 400ms apart.
//   BASE=... THEME=dark TAG=after SCRATCH=.. node atlasportrait.js
const {boot}=require('./lib.js');
const TAG=process.env.TAG||'after', THEME=process.env.THEME||'light';
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:614},deviceScaleFactor:2});
  const frames=process.env.SWAY?3:1;
  for(let f=0;f<frames;f++){
    await page.evaluate(({pose,f})=>{
      document.getElementById('atl-portrait')?.remove();
      const box=document.createElement('div'); box.id='atl-portrait';
      box.className='card'; box.style.position='fixed'; box.style.inset='56px 16px 40px 16px'; box.style.zIndex='9999';
      box.style.display='flex'; box.style.flexDirection='column'; box.style.gap='8px'; box.style.padding='8px';
      for(const look of ['feminine','masculine']){
        localStorage.setItem('atlas-look',look);
        const row=document.createElement('div'); row.style.display='flex'; row.style.gap='18px'; row.style.alignItems='flex-end';
        const fig=atlasFigure(); fig.style.position='relative'; fig.style.display='inline-block'; fig.style.width='64px'; fig.style.height='92px';
        if(pose) fig.dataset.pose=pose;
        row.append(atlasDraw(240,'calm','full'), atlasDraw(200,'calm','head'), atlasDraw(64,'calm','head'), fig, atlasDraw(24,'calm','tiny'));
        box.append(row);
      }
      document.body.append(box);
    },{pose:process.env.POSE||'',f});
    await page.waitForTimeout(f?400:900);
    const stem=`${process.env.SCRATCH||'.'}/shots/atlas-portrait-${TAG}-${THEME}${process.env.POSE?'-'+process.env.POSE:''}${frames>1?'-'+f:''}`;
    await page.screenshot({path:`${stem}.png`});
    // The feminine head at 200px, alone, for the hair (HEAD=1).
    if(process.env.HEAD){ const el=await page.$('#atl-portrait > div:first-child > svg:nth-child(2)'); if(el) await el.screenshot({path:`${stem}-head.png`}); }
  }
  await page.evaluate(()=>localStorage.removeItem('atlas-look'));
  await browser.close();
})();
