// Every mood's three arm variants at the companion's size, per look, in one
// sheet: the check that variant 1 and 2 read as different gestures and that
// the arms read at all when small. SIZE=92 (the companion's height) by
// default; ZOOM is the device scale. Writes shots/atlas-moodgrid-<look>-<theme>.png.
//   BASE=... THEME=dark LOOK_ATLAS=feminine MOODS=happy,sleepy SCRATCH=.. node atlasmoodgrid.js
const {boot}=require('./lib.js');
const THEME=process.env.THEME||'light';
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:614},deviceScaleFactor:+(process.env.ZOOM||2)});
  for(const look of (process.env.LOOK_ATLAS||'masculine,feminine').split(',')){
    await page.evaluate(async({look,moods,size})=>{
      document.getElementById('atl-grid')?.remove();
      localStorage.setItem('atlas-look',look);
      clearTimeout(atlasMoodTimer); setAtlasMood=()=>{};
      const box=document.createElement('div'); box.id='atl-grid'; box.className='card';
      box.style.position='fixed'; box.style.inset='52px 8px 36px 8px'; box.style.zIndex='9999'; box.style.display='grid'; box.style.gridTemplateColumns='repeat(12, 1fr)'; box.style.gap='2px'; box.style.overflow='hidden';
      const list=moods?moods.split(','):Object.keys(ATLAS_MOODS);
      for(const mood of list) for(const v of [0,1,2]){
        const cell=document.createElement('div'); cell.style.textAlign='center'; cell.style.fontSize='9px';
        const s=atlasDraw(size,'calm','full'); atlasApply(s,mood); s.dataset.atlasMood=mood; s.dataset.atlasVariant=String(v);
        cell.append(s, document.createElement('br'), `${mood} ${v}`); box.append(cell);
      }
      document.body.append(box); localStorage.removeItem('atlas-look');
    },{look,moods:process.env.MOODS||'',size:+(process.env.SIZE||92)});
    await page.waitForTimeout(1500);
    await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/atlas-moodgrid-${look}-${THEME}.png`});
  }
  await browser.close();
})();
