// Atlas's waist, where the torso meets the lower-body wisps: the companion
// figure (its real layers) drawn 5x, per look, per pose, cropped to the
// torso and wisps, plus a luminance profile down the middle (x 31) and at
// the flanks, so a seam shows as a step rather than as an impression.
//   BASE=... THEME=dark TAG=after POSES=stand,sit,float,lie SWAY=1 ZOOM=1 SCRATCH=.. node atlaswaist.js
// ZOOM=1 draws 12x centred on the waist (x 31, y 57). The holder takes the
// companion's id (the real one is removed) so the pose rules apply; the pose
// "walk" sets .nmb-walking, the swaying glide.
const {boot}=require('./lib.js');
const TAG=process.env.TAG||'after', THEME=process.env.THEME||'light';
const POSES=(process.env.POSES||'stand').split(',');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:614}});
  for(const look of ['masculine','feminine']){
    for(const pose of POSES){
      await page.evaluate(({look,pose,zoom})=>{
        document.getElementById('atl-waist')?.remove();
        localStorage.setItem('atlas-look',look);
        const box=document.createElement('div'); box.id='atl-waist'; box.className='card';
        box.style.position='fixed'; box.style.left='16px'; box.style.top='56px'; box.style.width='420px'; box.style.height='520px'; box.style.zIndex='9999'; box.style.overflow='hidden';
        document.getElementById('nm-buddy')?.remove();
        const holder=document.createElement('div'); holder.id='nm-buddy';
        holder.style.position='absolute'; const Z=zoom?12:5; holder.style.left=(zoom?210-31*Z:50)+'px'; holder.style.top=(zoom?260-57*Z:-80)+'px'; holder.style.width='64px'; holder.style.height='92px'; holder.style.transform=`scale(${Z})`; holder.style.transformOrigin='0 0';
        const fig=atlasFigure(); fig.style.position='relative'; fig.style.display='block'; fig.style.width='64px'; fig.style.height='92px';
        if(pose==='walk') holder.classList.add('nmb-walking'); else if(pose!=='stand') holder.dataset.pose=pose;
        holder.append(fig); box.append(holder); document.body.append(box);
      },{look,pose,zoom:!!process.env.ZOOM});
      const frames=process.env.SWAY?3:1;
      for(let f=0;f<frames;f++){
        await page.waitForTimeout(f?350:900);
        const el=await page.$('#atl-waist');
        await el.screenshot({path:`${process.env.SCRATCH||'.'}/shots/waist${process.env.ZOOM?'zoom':''}-${TAG}-${THEME}-${look}-${pose}${frames>1?'-'+f:''}.png`});
      }
    }
  }
  await page.evaluate(()=>localStorage.removeItem('atlas-look'));
  await browser.close();
})();
