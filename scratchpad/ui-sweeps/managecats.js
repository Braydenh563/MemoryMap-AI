// Manage categories panel geometry (the owner: "a lot of alignment height,
// and other ui issues"): the head's title, '?' and close on one centre line;
// the filter and New category at one height, tops and bottoms equal, one
// radius; a leading search icon and a clear; one focus ring on the filter;
// the description's gap under the head; one scroller.
//   BASE=... THEME=dark W=390 TAG=after SCRATCH=.. node managecats.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1093), H=W<600?844:614, TAG=process.env.TAG||'after', THEME=process.env.THEME||'light';
(async()=>{
  const touch=W<600?{hasTouch:true,isMobile:true}:{};
  const {browser,page}=await boot({viewport:{width:W,height:H},...touch});
  await page.evaluate(()=>openManageCategories()); await page.waitForTimeout(1200);
  await page.focus('.manage-cat-filter').catch(()=>{}); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(200);
  const m=await page.evaluate(()=>{
    const card=document.querySelector('.manage-cat-card'); if(!card) return {err:'no card'};
    const R=e=>e?e.getBoundingClientRect():null; const c=(r)=>r?Math.round((r.top+r.bottom)/2*10)/10:null;
    const title=card.querySelector('.sheet-title'), help=card.querySelector('[data-help-for="manage-cat-help"]'), close=card.querySelector('.sheet-close');
    const head=card.querySelector('.sheet-head'), sub=card.querySelector('.manage-cat-sub');
    const filter=card.querySelector('.manage-cat-filter'), create=card.querySelector('.manage-cat-tools > button');
    const f=getComputedStyle(filter), b=getComputedStyle(create);
    const fr=R(filter), br=R(create);
    const scrollers=[...card.querySelectorAll('*')].concat([card]).filter(e=>{const s=getComputedStyle(e);return /(auto|scroll)/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+1;}).map(e=>e.className.split(' ')[0]);
    const tr=R(title), hr=R(help);
    return {
      centres:`title ${c(tr)} help ${c(hr)} close ${c(R(close))}`,
      helpGap: hr&&tr?Math.round(hr.left-tr.right):null,
      tools:`filter ${Math.round(fr.top)}..${Math.round(fr.bottom)} h=${fr.height} r=${f.borderTopLeftRadius} | new ${Math.round(br.top)}..${Math.round(br.bottom)} h=${br.height} r=${b.borderTopLeftRadius}`,
      focus:`outline=${f.outlineStyle} ${f.outlineWidth} shadow=${f.boxShadow}`,
      searchIcon: !!card.querySelector('.manage-cat-tools .ph-magnifying-glass'), clear: !!card.querySelector('.manage-cat-clear'),
      subGap: sub&&head?Math.round(R(sub).top-R(head).bottom):null,
      scrollers,
    };
  });
  console.log(`${W} ${THEME}`, JSON.stringify(m,null,1));
  await page.fill('.manage-cat-filter','gar'); await page.waitForTimeout(200);
  const typed=await page.evaluate(()=>[document.querySelector('.manage-cat-clear').checkVisibility(), document.querySelectorAll('.manage-cat-row').length]);
  await page.click('.manage-cat-clear'); await page.waitForTimeout(200);
  const cleared=await page.evaluate(()=>[document.querySelector('.manage-cat-filter').value, document.querySelector('.manage-cat-clear').checkVisibility(), document.querySelectorAll('.manage-cat-row').length, document.activeElement.className]);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space'); await page.waitForTimeout(200);
  const kb=await page.evaluate(()=>[document.activeElement.dataset.category, document.activeElement.getAttribute('aria-selected'), document.querySelector('.manage-cat-footer').checkVisibility()]);
  console.log(`keys: focus=${kb[0]} selected=${kb[1]} bulk bar=${kb[2]}`);
  console.log(`clear: typed visible=${typed[0]} rows=${typed[1]}; after value="${cleared[0]}" visible=${cleared[1]} rows=${cleared[2]} focus=${cleared[3]}`);
  await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/cats-${TAG}-${THEME}-${W}.png`});
  await browser.close();
})();
