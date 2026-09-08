// Icon/text vertical alignment, measured rather than eyeballed.
//
// For every visible button, anchor, summary, label or menu row that holds an
// icon (`<i class="ph …">` or an `<svg>`) *and* a text node, compare the
// icon's vertical centre with the text's. The text's centre comes from a
// Range around the element's own text nodes, not from the parent box, because
// a parent box that is taller than its text (a fixed control height, a
// wrapped label) reports a centre the reader never sees.
//
// Usage:  BASE=http://127.0.0.1:8815 node scratchpad/ui-sweeps/iconalign.js
//         THEME=dark  W=1024  to sweep the other theme or width.
const {boot}=require('./lib.js');
const TABS=['dashboard','notes','chat','graph','timeline','reminders','library'];
const TOL=1;   // px of vertical centre difference we accept

const PROBE=(tol)=>{
  const out=[];
  const sel='button, a, summary, label, .menu-item, .chip, .status-item, .linklike';
  for(const el of document.querySelectorAll(sel)){
    const r=el.getBoundingClientRect();
    if(r.width<1||r.height<1) continue;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.display==='none') continue;
    const icon=el.querySelector(':scope > i.ph, :scope > svg, :scope > i[class*="ph-"]');
    if(!icon) continue;
    const ir=icon.getBoundingClientRect();
    if(ir.height<1) continue;
    // The element's own text, measured by a Range so the box does not lie.
    const range=document.createRange();
    let first=null,last=null;
    for(const n of el.childNodes){
      if(n.nodeType===3&&n.textContent.trim()){ if(!first) first=n; last=n; }
      else if(n.nodeType===1&&n!==icon&&n.textContent.trim()&&!n.querySelector('i.ph, svg')){ if(!first) first=n; last=n; }
    }
    if(!first) continue;
    try{ range.setStartBefore(first); range.setEndAfter(last); }catch(e){ continue; }
    const tr=range.getBoundingClientRect();
    if(tr.height<1||tr.width<1) continue;
    const d=Math.abs((ir.top+ir.height/2)-(tr.top+tr.height/2));
    if(d>tol){
      const ic=getComputedStyle(icon);
      out.push({
        d:Math.round(d*100)/100,
        who:(el.id?'#'+el.id:'')+'.'+(el.className||el.tagName).toString().trim().replace(/\s+/g,'.').slice(0,44),
        txt:(el.textContent||'').trim().slice(0,22),
        disp:cs.display, ai:cs.alignItems,
        ifs:ic.fontSize, ilh:ic.lineHeight, iva:ic.verticalAlign,
      });
    }
  }
  return out;
};

(async()=>{
  const W=parseInt(process.env.W||'1440',10);
  const {browser,page}=await boot({viewport:{width:W,height:900}});
  let total=0; const seen=new Map();
  for(const t of TABS){
    await page.click(`[data-tab="${t}"]`).catch(()=>{});
    await page.waitForTimeout(1500);
    const bad=await page.evaluate(PROBE,TOL);
    total+=bad.length;
    console.log(`[${t}] ${bad.length} icon/text pairs off by more than ${TOL}px`);
    for(const b of bad.sort((a,b)=>b.d-a.d).slice(0,14)){
      console.log(`    ${String(b.d).padStart(6)}px  ${b.who}  display=${b.disp} align=${b.ai} icon(fs=${b.ifs} lh=${b.ilh} va=${b.iva})  :: ${b.txt}`);
      seen.set(b.who,(seen.get(b.who)||0)+1);
    }
  }
  console.log(`\nTOTAL off by >${TOL}px across ${TABS.length} tabs at ${W}px, theme ${process.env.THEME||'light'}: ${total}`);
  await browser.close();
})();
