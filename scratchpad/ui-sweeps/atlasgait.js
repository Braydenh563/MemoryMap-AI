// Which loops Atlas runs per look (idle, walk, float, wave): the animation
// names on the companion's char box, the body layer, the lower layer and the
// right arm in a stand-in `#nm-buddy` (the real one rides inside
// `#nm-buddy-rider`), plus how far the char box travels up in a walk cycle.
//   BASE=... node atlasgait.js
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:614}});
  const rows=await page.evaluate(async()=>{
    const out=[];
    for(const look of ['masculine','feminine']) for(const [state,cls,pose] of [['idle','','stand'],['walk','nmb-walking','stand'],['float','','float'],['wave','nmb-act-wave','stand']]){
      localStorage.setItem('atlas-look',look);
      document.getElementById('nm-buddy')?.remove();
      const h=document.createElement('div'); h.id='nm-buddy'; if(cls) h.classList.add(cls); h.dataset.pose=pose; if(cls==='nmb-walking') h.style.setProperty('--nmb-lean','1');
      h.style.position='fixed'; h.style.left='300px'; h.style.top='200px'; h.style.width='64px'; h.style.height='92px';
      const face=document.createElement('div'); face.className='nm-buddy-face'; const char=document.createElement('div'); char.className='nm-buddy-char';
      char.append(atlasFigure()); face.append(char); h.append(face); document.body.append(h);
      await new Promise(r=>setTimeout(r,120));
      const a=(el)=>el?getComputedStyle(el).animationName:'-';
      const ys=[]; for(let i=0;i<14;i++){ ys.push(char.getBoundingClientRect().top); await new Promise(r=>setTimeout(r,100)); }
      out.push(`${look.padEnd(9)} ${state.padEnd(5)} char=${a(char)} body=${a(h.querySelector('.atl-layer-body'))} lower=${a(h.querySelector('.atl-layer-lower'))} arm-r=${a(h.querySelector('.atl-layer-body .nmb-arm-r'))} rise=${(Math.max(...ys)-Math.min(...ys)).toFixed(1)}px`);
      h.remove();
    }
    localStorage.removeItem('atlas-look');
    return out;
  });
  console.log(rows.join('\n'));
  await browser.close();
})();
