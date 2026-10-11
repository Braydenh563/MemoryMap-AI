// Brief 34 continues, step 1: are Atlas's fifteen moods fifteen faces at the
// sizes people see them? Draws every mood at SIZES (104 full, 28 head, 20
// tiny) per look, freezes every loop at t=0, and writes one PNG per cell to
// shots/facediff/<theme>-<look>-<size>-<mood>.png at device scale 1 (the real
// pixels). atlasfacediff.py then counts the distinct faces by pixel diff.
//   BASE=... THEME=dark SIZES=28,20 node atlasfacediff.js
const {boot}=require('./lib.js');
const fs=require('fs');
const THEME=process.env.THEME||'light';
const OUT=(process.env.SCRATCH||'.')+'/shots/facediff';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const {browser,page}=await boot({viewport:{width:1200,height:900},deviceScaleFactor:+(process.env.ZOOM||1)});
  for(const look of (process.env.LOOK_ATLAS||'masculine,feminine').split(',')){
    for(const size of (process.env.SIZES||'104,28,20').split(',').map(Number)){
      await page.evaluate(({look,size,dark,zoom,before})=>{
        document.getElementById('atl-diff')?.remove();
        localStorage.setItem('atlas-look',look);
        clearTimeout(atlasMoodTimer); setAtlasMood=()=>{};
        const box=document.createElement('div'); box.id='atl-diff';
        // One flat colour under every cell: a card's gradient differs by position and reads as a face change.
        box.style.background=dark?'#1c1d22':'#ffffff';
        box.style.position='fixed'; box.style.inset=zoom?'60px auto auto 8px':'60px 8px 8px 8px'; box.style.width=zoom?'560px':''; box.style.zIndex='9999';
        box.style.display='flex'; box.style.flexWrap='wrap'; box.style.gap='6px'; box.style.alignContent='flex-start';
        for(const mood of Object.keys(ATLAS_MOODS)){
          const cell=document.createElement('span'); cell.dataset.mood=mood; cell.style.display='inline-block'; cell.style.lineHeight='0';
          cell.append(atlasDraw(size,mood)); box.append(cell);
        }
        document.body.append(box); localStorage.removeItem('atlas-look');
        // BEFORE=1 rebuilds the faces as they were before the cue (Brief 34
        // continues, step 1): no lazy sheet, no cue, no brows on the tiny bust.
        if(before){document.querySelector('link[href*="atlas-lazy"]')?.remove(); box.querySelectorAll('.atl-cue, .atl-tiny .atl-brow').forEach(n=>n.remove());}
      },{look,size,dark:THEME==='dark',zoom:!!process.env.ZOOM,before:!!process.env.BEFORE});
      await page.waitForTimeout(1800);
      await page.evaluate(()=>document.getAnimations().forEach(a=>{try{if(a instanceof CSSTransition)a.finish();else{a.currentTime=0;a.pause();}}catch(e){}}));
      await page.waitForTimeout(100);
      // ZOOM=4 writes one sheet per size to look at instead of the cells.
      if(process.env.ZOOM){await (await page.$('#atl-diff')).screenshot({path:`${OUT}/../facesheet-${THEME}-${look}-${size}.png`,clip:undefined});continue;}
      for(const cell of await page.$$('#atl-diff > span')){
        const mood=await cell.getAttribute('data-mood');
        await (await cell.$('svg')).screenshot({path:`${OUT}/${THEME}-${look}-${size}-${mood}.png`});
      }
    }
  }
  await browser.close();
})();
