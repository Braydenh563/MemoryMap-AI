// Atlas lying and curled on the real companion (`#nm-buddy` inside
// `#nm-buddy-band` > `.nm-buddy-rider`), a still frame per pose and look:
// the band unclipped, the rider placed, motion off. Prints the bed's box
// (the host's ::before) against the lying body's; a shot per pose.
//   BASE=... THEME=dark SCRATCH=.. node atlasbed.js
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:+(process.env.H||614)},deviceScaleFactor:3});
  for(const look of ['masculine','feminine']) for(const pose of ['stand','lie-2','lie','curl']){
    const info=await page.evaluate(async({look,pose})=>{
      localStorage.setItem('atlas-look',look);
      document.documentElement.dataset.avatarMotion='off';
      localStorage.setItem('avatar-buddy','persona');
      syncNameMarkBuddy();
      clearTimeout(nmb.timer); nameMarkBuddySchedule=()=>{}; nameMarkBuddyTick=()=>{};
      const buddy=document.getElementById('nm-buddy'); if(!buddy) return {err:'no buddy'};
      if(!buddy.querySelector('.atl-figure')) return {err:'no atlas figure'};
      const band=document.getElementById('nm-buddy-band'); const rider=buddy.parentElement;
      band.classList.remove('nmb-riding'); band.style.overflow='visible';
      buddy.className=pose==='stand'?'':'nmb-sleep'; buddy.dataset.pose=pose;
      buddy.style.left='0px'; buddy.style.top='0px'; buddy.style.translate='none'; buddy.style.visibility='visible'; buddy.style.opacity='1';
      // Wherever the rider put it, bring it to (400, 300).
      await new Promise(r=>setTimeout(r,50));
      const r0=buddy.getBoundingClientRect();
      buddy.style.left=(parseFloat(getComputedStyle(buddy).left)+400-r0.left)+'px';
      buddy.style.top=(parseFloat(getComputedStyle(buddy).top)+300-r0.top)+'px';
      await new Promise(r=>setTimeout(r,1500));
      const r=buddy.getBoundingClientRect(); const bs=getComputedStyle(buddy,'::before');
      const torso=buddy.querySelector('.atl-layer-body .nmb-torso path'); const t=torso.getBoundingClientRect();
      return {x:r.left,y:r.top,w:r.width,h:r.height,bed:`top ${bs.top} h ${bs.height} l ${bs.left} r ${bs.right}`,torso:`${Math.round(t.left-r.left)}..${Math.round(t.right-r.left)} x ${Math.round(t.top-r.top)}..${Math.round(t.bottom-r.top)}`};
    },{look,pose});
    if(info.err){ console.log(look,pose,info.err); continue; }
    console.log(`${look} ${pose}: host ${Math.round(info.x)},${Math.round(info.y)} bed ${info.bed} torso ${info.torso}`);
    await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/bed-${look}-${pose}-${process.env.THEME||'light'}.png`,clip:{x:Math.max(0,info.x-70),y:Math.max(0,info.y-40),width:220,height:Math.min(170,+(process.env.H||614)-Math.max(0,info.y-40))}});
  }
  await browser.close();
})();
