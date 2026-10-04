// Non-text contrast, WCAG 1.4.11 (3:1). contrast.js reads text; this reads
// everything else a person has to see to use the app (INBOX 464, "there is
// still some colour contrast issues"):
//
//   icon         a `.ph` glyph, its computed colour (with the opacity of every
//                ancestor folded in) against the effective ground
//   svg          an icon-sized <svg> (<= 48px): its stroke or fill
//   focus        the ring a focused control draws (outline, ring shadow, or a
//                border that changes) against the ground around the control
//   field        an input, select or textarea: its boundary (border, ring
//                shadow or fill, whichever is best, framing wrappers counted)
//   check        a checkbox or radio drawn by the app: boundary, and the fill
//                when it is checked
//   toggle       a role="switch" / .switch / .toggle track
//   selected     a selected / pressed / current control against its well and
//                its unselected siblings, where a fill is the only cue it has
//   chip         an interactive chip or badge whose border or fill is the only
//                boundary it has
//   text-extra   text outside contrast.js's scope (the header, the tab bar and
//                the sidebars sit outside `.tab-page`), 4.5:1 / 3:1 large
//
// Same ground rule as contrast.js: translucent layers are composited over the
// first opaque ancestor ("~" in a line), a gradient or image ground is counted
// as skipped, never as a pass. Surfaces: every tab, every Notes and Library
// sub-tab, a board, the guide, the palette, a menu, every Settings section.
// THEME=dark, WIDTH=390 for the phone, CONTRAST=on for data-contrast="on".
// Exit 1 when a surface measured nothing, as contrast.js does. Prints one
// "SUMMARY" line per category at the end (raw and unique-by-signature).
const {boot}=require('./lib.js');
const TABS=['dashboard','notes','chat','graph','library','timeline','reminders','documents'];
const SUBTABS={notes:['browse','capture','writing-room','ask'],library:null};
const SECTIONS=['models','searchindex','appearance','account','tools','skills','memory','learned','tasks','data','logs','extras','about'];
const WIDTH=Number(process.env.WIDTH||1440);
const HEIGHT=Number(process.env.HEIGHT||(WIDTH<600?844:900));
const PHONE=WIDTH<600;
const empty=[];
const totals={};const uniq={};const skipped={gradient:0,native:0,nofocusvisible:0};
(async()=>{const {browser,page}=await boot({viewport:{width:WIDTH,height:HEIGHT},hasTouch:PHONE,isMobile:PHONE});
if(process.env.CONTRAST==='on')await page.evaluate(()=>{document.documentElement.dataset.contrast='on';});
const run=async(label)=>{
  // Keyboard modality, so a programmatic focus() matches :focus-visible the way
  // a Tab would (focus({focusVisible:true}) is not honoured by this Chromium).
  await page.mouse.move(2,2);  // off every control, so no field is read in its hover state
  await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  const r=await page.evaluate(()=>{
  // No transitions while measuring: a border or fill read halfway through its
  // 150ms ease is a colour nobody sees (a focused textarea read 2.3:1 mid-way).
  if(!window.__noTransition){const ss=new CSSStyleSheet();ss.replaceSync('*,*::before,*::after{transition:none!important;animation:none!important}');document.adoptedStyleSheets=[...document.adoptedStyleSheets,ss];window.__noTransition=true;}
  const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
  const parse=(c)=>{if(!c||c==='transparent')return null;const m=c.match(/^rgba?\(([^)]+)\)$/);if(m){const p=m[1].split(/[\s,\/]+/).map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
    const s=c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
    if(s)return {r:Math.round(+s[1]*255),g:Math.round(+s[2]*255),b:Math.round(+s[3]*255),a:s[4]===undefined?1:+s[4]};
    cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=c;if(cx.fillStyle==='#000000'&&!/black|#000/.test(c))return null;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return {r:d[0],g:d[1],b:d[2],a:d[3]/255};};
  const lum=({r,g,b})=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
  const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);};
  const over=(top,base)=>({r:top.r*top.a+base.r*(1-top.a),g:top.g*top.a+base.g*(1-top.a),b:top.b*top.a+base.b*(1-top.a),a:1});
  const rgb=(c)=>`rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
  // The ground behind `el`'s own box (the element's background is included).
  const bgOf=(el)=>{let translucent=false;const layers=[];let base=null;for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e);if(cs.backgroundImage&&cs.backgroundImage!=='none')return {c:null,translucent,gradient:true};const c=parse(cs.backgroundColor);if(c&&c.a>0){if(c.a<1)translucent=true;if(c.a>=0.9){base=c;break;}layers.push(c);}}if(!base){const root=parse(getComputedStyle(document.body).backgroundColor);const html=parse(getComputedStyle(document.documentElement).backgroundColor);base=(root&&root.a>0)?root:(html&&html.a>0)?html:{r:255,g:255,b:255,a:1};translucent=true;}let c=base;for(let i=layers.length-1;i>=0;i--)c=over(layers[i],c);return {c:{r:Math.round(c.r),g:Math.round(c.g),b:Math.round(c.b),a:1},translucent};};
  // Opacity of the element and every ancestor, multiplied.
  const opacityOf=(el)=>{let o=1;for(let e=el;e&&e!==document.documentElement;e=e.parentElement)o*=parseFloat(getComputedStyle(e).opacity);return o;};
  const sig=(el)=>el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+'.'+[...el.classList].slice(0,3).join('.');
  // Not covered by a modal, a menu or another layer: with the Settings dialog
  // open, the page behind it is not what a person is looking at, and a sweep
  // that measured it reported the Ask field once per Settings section.
  const unoccluded=(el,r)=>{const x=Math.min(Math.max(r.left+r.width/2,1),innerWidth-1),y=Math.min(Math.max(r.top+r.height/2,1),innerHeight-1);const h=document.elementFromPoint(x,y);return !!h&&(el.contains(h)||h.contains(el));};
  const vis=(el)=>{if(!el.checkVisibility||!el.checkVisibility({checkOpacity:true}))return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth&&unoccluded(el,r);};
  const findings=[];const checked={};const tick=(k)=>{checked[k]=(checked[k]||0)+1;};
  const seen=new Set();
  const add=(cat,el,r,need,desc,translucent)=>{const key=cat+'|'+sig(el)+'|'+desc.slice(0,24);if(seen.has(key))return;seen.add(key);findings.push({cat,sig:sig(el),line:`${r.toFixed(2)}${translucent?'~':''}/${need} <${sig(el)}> ${desc}`});};
  let gradient=0;
  // The edge a box draws on its own: fill, border, or a hairline ring shadow.
  const edge=(el)=>{const cs=getComputedStyle(el);const par=el.parentElement?bgOf(el.parentElement):null;if(!par||!par.c){return null;}
    const bgc=parse(cs.backgroundColor);let own=par.c;if(cs.backgroundImage&&cs.backgroundImage!=='none')return null;if(bgc&&bgc.a>0)own=over(bgc,par.c);
    let best=ratio(own,par.c);let how='fill';
    const bw=parseFloat(cs.borderTopWidth)||0;const bc=parse(cs.borderTopColor);
    if(cs.borderTopStyle!=='none'&&bw>=1&&bc&&bc.a>0){const rr=ratio(over(bc,own),par.c);if(rr>best){best=rr;how='border';}}
    const ow=parseFloat(cs.outlineWidth)||0;const oc=parse(cs.outlineColor);
    if(cs.outlineStyle!=='none'&&ow>=1&&oc&&oc.a>0&&(cs.outlineStyle!=='auto')){const rr=ratio(over(oc,par.c),par.c);if(rr>best){best=rr;how='outline';}}
    const sh=cs.boxShadow;if(sh&&sh!=='none'){const m=sh.match(/((?:rgba?|color|oklch|oklab|lab|lch|hsla?)\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+([\d.]+)px)?/);if(m&&parseFloat(m[4])===0&&parseFloat(m[5]||0)>=1){const c=parse(m[1]);if(c&&c.a>0){const rr=ratio(over(c,par.c),par.c);if(rr>best){best=rr;how='ring';}}}}
    return {r:best,how,translucent:par.translucent,par:par.c,own};};
  // An element's frame: itself, or a wrapper that hugs it (a field inside a
  // bordered search box is bounded by the box).
  const frame=(el)=>{let b=edge(el);const er=el.getBoundingClientRect();let p=el.parentElement;for(let i=0;i<3&&p&&p!==document.body;i++,p=p.parentElement){const pr=p.getBoundingClientRect();if(pr.left>er.left-28&&pr.right<er.right+28&&pr.top>er.top-28&&pr.bottom<er.bottom+28){const pe=edge(p);if(pe&&(!b||pe.r>b.r))b=pe;}}return b;};
  const interactive=(el)=>el.matches('button,a[href],[role=button],[role=tab],[role=menuitem],[tabindex]:not([tabindex="-1"]),label')||getComputedStyle(el).cursor==='pointer';

  const root=document.body;
  const all=[...root.querySelectorAll('*')].filter(vis);
  // 1) icons ---------------------------------------------------------------
  for(const el of all){
    const isIcon=el.classList.contains('ph')||[...el.classList].some(c=>/^ph-/.test(c));
    if(!isIcon)continue;const cs=getComputedStyle(el);
    if(el.closest('[disabled],[aria-disabled="true"]'))continue;
    const fg=parse(cs.color);if(!fg)continue;tick('icon');
    const {c:bg,translucent,gradient:g}=bgOf(el);if(g||!bg){gradient++;continue;}
    const a=fg.a*opacityOf(el);const eff=over({...fg,a},bg);const r=ratio(eff,bg);
    if(r<3){const host=el.closest('button,a,[role=button],[role=tab],[role=menuitem],li,label')||el.parentElement;
      const state=el.closest('.active,[aria-pressed="true"],[aria-selected="true"],[aria-current]')?' (in an active control)':'';
      const labelled=host&&host.textContent.trim().length>0;
      add(state?'icon-active':'icon',el,r,3,`${labelled?'with label':'alone'}${state} ${cs.color}${a<fg.a?` x${opacityOf(el).toFixed(2)}`:''} on ${rgb(bg)}`,translucent);}
  }
  // 2) svg icons -----------------------------------------------------------
  for(const svg of root.querySelectorAll('svg')){
    if(!vis(svg))continue;const rc=svg.getBoundingClientRect();if(Math.max(rc.width,rc.height)>48)continue;
    if(svg.closest('[disabled],[aria-disabled="true"]'))continue;
    if(svg.closest('#graph-canvas,#tab-graph .graph-canvas,.wb-canvas,.mindmap-canvas,.name-mark'))continue;  // .name-mark: the companion's character art, not an icon
    let worst=null;
    for(const p of svg.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse')){
      const cs=getComputedStyle(p);let c=null,kind='';
      if(cs.stroke&&cs.stroke!=='none'&&parseFloat(cs.strokeWidth)>0){c=parse(cs.stroke);kind='stroke';}
      else if(cs.fill&&cs.fill!=='none'){c=parse(cs.fill);kind='fill';}
      if(!c)continue;const {c:bg,translucent,gradient:g}=bgOf(svg);if(g||!bg){gradient++;continue;}
      const a=c.a*opacityOf(p)*(parseFloat(cs.opacity)||1);const r=ratio(over({...c,a},bg),bg);
      if(!worst||r<worst.r)worst={r,kind,col:rgb(c),bg,translucent};
    }
    if(worst){tick('svg');if(worst.r<3)add('svg',svg,worst.r,3,`in <${sig(svg.parentElement)}> ${worst.kind} ${worst.col} on ${rgb(worst.bg)}`,worst.translucent);}
  }
  // 3) fields --------------------------------------------------------------
  for(const el of root.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file]):not([type=color]),select,textarea')){
    if(!vis(el)||el.disabled||el.closest('.sr-only'))continue;const rc=el.getBoundingClientRect();if(rc.width<24||rc.height<14)continue;
    tick('field');const b=frame(el);if(!b){gradient++;continue;}
    if(b.r<3){const cs=getComputedStyle(el);const bc0=parse(cs.borderTopColor);const bare=!(parseFloat(cs.borderTopWidth)>0&&cs.borderTopStyle!=='none'&&bc0&&bc0.a>0);
      // A writing surface with no border and no fill of its own (a note's title
      // and body, the Ask line) is counted apart: it is not a box that failed,
      // it is a box that was never drawn, and the answer is a design decision.
      add(bare?'field-bare':'field',el,b.r,3,`best edge is the ${b.how}, on ${rgb(b.par)}`,b.translucent);}
  }
  // 4) checkboxes and radios ----------------------------------------------
  for(const el of root.querySelectorAll('input[type=checkbox],input[type=radio]')){
    if(el.disabled||el.closest('.sr-only'))continue;const rc=el.getBoundingClientRect();if(rc.width<8||rc.height<8)continue;const cs=getComputedStyle(el);if(!el.checkVisibility||!el.checkVisibility({checkOpacity:true}))continue;
    if(cs.position==='absolute'&&(parseFloat(cs.opacity)===0||rc.width<2))continue;
    const isSwitch=el.closest('.switch,[role=switch],.toggle');
    if(cs.appearance==='auto'||cs.webkitAppearance==='auto'){tick('check-native');
      // Native control: the UA draws a grey edge (about 4.5:1 on white, 3.7 on
      // the dark scheme) and an accent-color fill when checked.
      if(el.checked){const ac=cs.accentColor;const pc=ac&&ac!=='auto'?parse(ac):null;const par=bgOf(el.parentElement);if(pc&&par.c){const r=ratio(pc,par.c);if(r<3)add('check',el,r,3,`native checked fill (accent-color ${ac}) on ${rgb(par.c)}`,par.translucent);}}
      continue;}
    tick(isSwitch?'toggle':'check');const b=frame(el);if(!b){gradient++;continue;}
    const cat=isSwitch?'toggle':'check';
    if(b.r<3)add(cat,el,b.r,3,`${el.checked?'on':'off'} state, best edge is the ${b.how}, on ${rgb(b.par)}`,b.translucent);
  }
  for(const el of root.querySelectorAll('[role=switch],.switch,.toggle')){
    if(!vis(el)||el.matches('input'))continue;tick('toggle');const b=frame(el);if(!b)continue;
    if(b.r<3)add('toggle',el,b.r,3,`track ${b.how} on ${rgb(b.par)}`,b.translucent);
  }
  // 5) selected state against its well ---------------------------------------
  for(const el of root.querySelectorAll('.active,[aria-selected="true"],[aria-pressed="true"],[aria-current="page"],[aria-current="true"],label:has(input:checked)')){
    if(!vis(el)||!el.matches('button,[role=tab],[role=button],a,label,li'))continue;
    const par=el.parentElement;if(!par)continue;
    const sibs=[...par.children].filter(s=>s!==el&&s.tagName===el.tagName&&vis(s));if(!sibs.length)continue;
    // A selected row in a list or a menu is a fill by design (a tint),
    // measured as text; only compact choice controls are held to 3:1 here.
    if(el.matches('li,.entry-item,.library-card,.menu-item,[role=menuitem]'))continue;
    // A row whose state is a visible checkbox or radio carries it in that
    // control (measured as a check), not in its tint.
    if(el.matches('label')&&[...el.querySelectorAll('input')].some(i=>{const r=i.getBoundingClientRect();return r.width>=8&&r.height>=8&&getComputedStyle(i).position!=='absolute'&&getComputedStyle(i).opacity!=='0';}))continue;
    tick('selected');
    const cs=getComputedStyle(el);const wellEl=par;const well=bgOf(wellEl);if(well.gradient||!well.c){gradient++;continue;}
    const bgc=parse(cs.backgroundColor);if(cs.backgroundImage&&cs.backgroundImage!=='none'){gradient++;continue;}
    const selFill=bgc&&bgc.a>0?over(bgc,well.c):well.c;const rFill=ratio(selFill,well.c);
    if(rFill>=3)continue;
    // Other cues: an edge at 3:1, an underline or indicator bar.
    const e=edge(el);let cue=e&&e.how!=='fill'&&e.r>=3?e.how:'';
    if(!cue)for(const sd of ['Top','Right','Bottom','Left']){const bw=parseFloat(cs['border'+sd+'Width'])||0,bc=parse(cs['border'+sd+'Color']);if(cs['border'+sd+'Style']!=='none'&&bw>=1&&bc&&bc.a>0&&ratio(over(bc,selFill),well.c)>=3){cue='border '+sd;break;}}
    if(!cue&&cs.boxShadow&&cs.boxShadow!=='none'){for(const m of cs.boxShadow.matchAll(/((?:rgba?|color|oklch|oklab|lab|lch|hsla?)\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+([\d.]+)px)?/g)){const c=parse(m[1]);if(c&&c.a>0&&parseFloat(m[4])===0&&(Math.abs(parseFloat(m[2]))>=1||Math.abs(parseFloat(m[3]))>=1||parseFloat(m[5]||0)>=1)&&ratio(over(c,well.c),well.c)>=3){cue='shadow edge';break;}}}
    if(!cue){const td=cs.textDecorationLine;if(td&&td!=='none')cue='underline';}
    if(!cue)for(const ps of ['::before','::after']){const pc=getComputedStyle(el,ps);if(pc.content!=='none'&&pc.display!=='none'){const pb=parse(pc.backgroundColor);const h=parseFloat(pc.height),w=parseFloat(pc.width);if(pb&&pb.a>0&&(h>=2||w>=2)&&ratio(over(pb,selFill),selFill)>=3){cue='indicator '+ps;break;}}}
    if(cue)continue;
    // A heavier weight than every sibling is a second cue that is not a colour.
    const sw=parseInt(cs.fontWeight)>=600&&sibs.every(s=>parseInt(getComputedStyle(s).fontWeight)<600);
    if(sw)continue;
    add('selected',el,rFill,3,`"${(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,18)}" in <${sig(par)}> fill only (${rgb(selFill)} on well ${rgb(well.c)})`,well.translucent);
  }
  // 6) interactive chips and badges ------------------------------------------
  for(const el of root.querySelectorAll('.chip,.badge,.pill,[class*="-chip"],[class*="-badge"]')){
    if(!vis(el)||!interactive(el)||el.disabled)continue;tick('chip');
    const e=edge(el);if(!e)continue;
    // Only the case the sweep exists for: a bordered chip whose border is its
    // only edge, which is under 3:1 against the ground.
    const cs=getComputedStyle(el);const hasBorder=cs.borderTopStyle!=='none'&&parseFloat(cs.borderTopWidth)>=1&&(parse(cs.borderTopColor)||{a:0}).a>0;
    if(e.r<3&&hasBorder)add('chip',el,e.r,3,`"${(el.textContent||'').trim().slice(0,18)}" in <${sig(el.parentElement)}> best edge is the ${e.how}, on ${rgb(e.par)}`,e.translucent);
  }
  // 7) text outside contrast.js's scope --------------------------------------
  const inScope=(el)=>el.closest('.tab-page:not(.hidden), #settings-modal:not(.hidden), .modal-overlay:not(.hidden)');
  for(const el of all){
    if(inScope(el))continue;
    const text=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');if(!text)continue;
    const cs=getComputedStyle(el);const fg=parse(cs.color);if(!fg)continue;tick('text-extra');
    const {c:bg,translucent,gradient:g}=bgOf(el);if(g||!bg){gradient++;continue;}
    const eff=over({...fg,a:fg.a*opacityOf(el)},bg);const r=ratio(eff,bg);const size=parseFloat(cs.fontSize);const bold=parseInt(cs.fontWeight)>=700;const need=(size>=18.66||(bold&&size>=14))?3:4.5;
    if(r<need)add('text-extra',el,r,need,`"${text.slice(0,24)}" ${cs.color} on ${rgb(bg)}`,translucent);
  }
  // 8) focus rings, sampled: one of each kind of focusable -----------------
  const fsig=new Set();let nofv=0;
  for(const el of all){
    if(!el.matches('a[href],button,input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"]),[role=tab],[role=button]')||el.disabled)continue;
    if(el.closest('.sr-only,.skip-link'))continue;const k=sig(el)+(el.type||'');if(fsig.has(k))continue;fsig.add(k);if(fsig.size>40)break;
    const prev=getComputedStyle(el);const pBorder=prev.borderTopColor;
    const anc=[];for(let p=el.parentElement,i=0;p&&p!==document.body&&i<4;p=p.parentElement,i++){const c=getComputedStyle(p);anc.push([p,c.outlineStyle+c.outlineWidth+c.outlineColor,c.boxShadow,c.borderTopColor]);}
    try{el.focus({focusVisible:true,preventScroll:true});}catch(e){continue;}
    if(document.activeElement!==el)continue;if(!el.matches(':focus-visible')){nofv++;el.blur();continue;}
    const cs=getComputedStyle(el);const par=bgOf(el.parentElement||el);if(!par.c){el.blur();continue;}
    let ring=null,how='';
    const ow=parseFloat(cs.outlineWidth)||0;
    if(cs.outlineStyle!=='none'&&ow>0){const c=parse(cs.outlineColor);if(c){ring=over(c,par.c);how='outline';}}
    if(!ring){const sh=cs.boxShadow;const m=sh&&sh!=='none'&&sh.match(/((?:rgba?|color|oklch|oklab|lab|lch|hsla?)\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+([\d.]+)px)?(?!\s+inset)/);if(m&&parseFloat(m[5]||0)>0&&!/inset/.test(sh.slice(0,sh.indexOf(m[0])+m[0].length+7))){const c=parse(m[1]);if(c){ring=over(c,par.c);how='ring shadow';}}}
    if(!ring&&cs.borderTopColor!==pBorder&&parseFloat(cs.borderTopWidth)>=1){const c=parse(cs.borderTopColor);if(c){ring=over(c,par.c);how='border change';}}
    if(!ring){for(const [p,o,b,bc] of anc){const c=getComputedStyle(p);const pp=p.parentElement?bgOf(p.parentElement):null;if(!pp||!pp.c)continue;
      if(c.outlineStyle!=='none'&&parseFloat(c.outlineWidth)>0&&(c.outlineStyle+c.outlineWidth+c.outlineColor)!==o){const cc=parse(c.outlineColor);if(cc){ring=over(cc,pp.c);how='wrapper outline';par.c=pp.c;break;}}
      if(c.borderTopColor!==bc){const cc=parse(c.borderTopColor);if(cc){ring=over(cc,pp.c);how='wrapper border';par.c=pp.c;break;}}
      if(c.boxShadow!==b&&c.boxShadow!=='none'){const m=c.boxShadow.match(/((?:rgba?|color|oklch|oklab|lab|lch|hsla?)\([^)]+\))/);const cc=m&&parse(m[1]);if(cc){ring=over(cc,pp.c);how='wrapper shadow';par.c=pp.c;break;}}}}
    tick('focus');
    if(!ring)add('focus',el,0,3,'draws no ring at all',par.translucent);
    else{const r=ratio(ring,par.c);if(r<3)add('focus',el,r,3,`${how} ${rgb(ring)} on ${rgb(par.c)}`,par.translucent);}
    el.blur();
  }
  return {findings:findings.slice(0,40),checked,gradient,nofv};});
  const n=r.findings.length;
  const meas=Object.entries(r.checked).map(([k,v])=>`${k} ${v}`).join(', ');
  console.log(`== ${label}: ${n?n+' under 3:1':'ok'} (${meas||'nothing'})`);
  r.findings.forEach(f=>{console.log('  ['+f.cat+'] '+f.line);totals[f.cat]=(totals[f.cat]||0)+1;(uniq[f.cat]=uniq[f.cat]||new Set()).add(f.sig);});
  skipped.gradient+=r.gradient;skipped.nofocusvisible+=r.nofv;
  const total=Object.values(r.checked).reduce((a,b)=>a+b,0);
  if(!total){console.log('  nothing was measured here, which is a finding about the sweep, not the surface');empty.push(label);}};
const go=async(t)=>{await page.evaluate((name)=>{try{switchTab(name);}catch(e){}},t);await page.waitForTimeout(700);};
for(const t of (process.env.ONLY==='settings'?[]:TABS)){
  await go(t);
  const open=await page.evaluate((name)=>{const el=document.getElementById('tab-'+name);return el?!el.classList.contains('hidden'):null;},t);
  if(open===false){console.log(`== ${t}: SKIPPED, the tab did not open`);continue;}
  await run(t);
  const subs=SUBTABS[t]===null
    ? await page.evaluate(()=>[...document.querySelectorAll('#library-subtabs button')].map(b=>b.dataset.subtab||b.getAttribute('aria-controls')||b.textContent.trim()))
    : SUBTABS[t];
  if(!subs)continue;
  for(const sub of subs){
    const clicked=await page.evaluate(({tab,sub})=>{
      const strip=document.getElementById(tab+'-subtabs');if(!strip)return false;
      const btn=[...strip.querySelectorAll('button')].find(b=>(b.dataset.section||b.dataset.subtab||b.getAttribute('aria-controls')||b.textContent.trim())===sub);
      if(!btn)return false;btn.click();return true;
    },{tab:t,sub});
    if(!clicked)continue;await page.waitForTimeout(600);await run(`${t}/${sub}`);
  }
}
if(process.env.ONLY!=='settings'){
  await go('library');
  const opened=await page.evaluate(async()=>{
    document.querySelector('#library-subtabs button[data-target="library-view-whiteboard"]')?.click();
    await new Promise(r=>setTimeout(r,900));const card=document.querySelector('.library-board-card');
    if(!card)return 'no board in this notebook';card.click();await new Promise(r=>setTimeout(r,1800));
    return document.getElementById('wb-topbar')?.offsetParent?'open':'it would not open';
  });
  if(opened==='open'){await page.waitForTimeout(600);await run('whiteboard (a board open)');await page.keyboard.press('Escape').catch(()=>{});await page.waitForTimeout(400);}
  else console.log(`== whiteboard: SKIPPED, ${opened}`);
  // Overlays: the guide panel, the command palette, a header menu.
  const g=await page.evaluate(()=>{try{openHelpChat();return true;}catch(e){return false;}});
  if(g){await page.waitForTimeout(500);await run('guide (empty)');
    await page.evaluate(()=>{renderHelpChatMessage('user','How do I add a reminder?');renderHelpChatMessage('assistant','Open the **Reminders** tab.',[{label:'Open Reminders',tab:'reminders'}],['Reminders']);});
    await page.waitForTimeout(200);await run('guide (a conversation)');
    await page.evaluate(()=>helpChatNewChat());await page.keyboard.press('Escape');await page.waitForTimeout(300);}
  else console.log('== guide: SKIPPED, openHelpChat is not reachable');
  await go('dashboard');
  const p=await page.evaluate(()=>{try{openPalette();return true;}catch(e){return false;}});
  if(p){await page.waitForTimeout(500);await run('command palette');await page.keyboard.press('Escape');await page.waitForTimeout(300);}
  else console.log('== palette: SKIPPED, openPalette is not reachable');
  const more=await page.evaluate(()=>{const b=document.querySelector('#header-more-btn,#header-more > button,[aria-controls="header-more"]');if(b&&b.offsetParent){b.click();return true;}return false;});
  if(more){await page.waitForTimeout(400);await run('header menu');await page.keyboard.press('Escape');await page.waitForTimeout(300);}
  // The first kebab menu on the notes list.
  await go('notes');await page.waitForTimeout(500);
  const kebab=await page.evaluate(()=>{const b=[...document.querySelectorAll('#tab-notes button[aria-haspopup="menu"], #tab-notes .kebab')].find(x=>x.offsetParent);if(b){b.click();return true;}return false;});
  if(kebab){await page.waitForTimeout(400);await run('a kebab menu (notes)');await page.keyboard.press('Escape');await page.waitForTimeout(300);}
}
await page.evaluate(()=>{try{openSettingsModal('models');}catch(e){document.getElementById('settings-btn')?.click();}});await page.waitForTimeout(600);
for(const s of SECTIONS){
  const ok=PHONE
    ? await page.evaluate((name)=>{try{openSettingsModal(name);return true;}catch(e){return false;}},s)
    : await page.click(`#settings-modal [data-section="${s}"]`,{timeout:1500}).then(()=>true).catch(()=>false);
  if(!ok)continue;await page.waitForTimeout(400);await run('settings/'+s);
}
console.log(`== done at ${WIDTH}x${HEIGHT}, theme ${process.env.THEME||'light'}${process.env.CONTRAST==='on'?', contrast on':''}`);
for(const c of Object.keys(totals).sort())console.log(`SUMMARY ${c}: ${totals[c]} raw, ${uniq[c].size} unique`);
if(!Object.keys(totals).length)console.log('SUMMARY none under 3:1');
console.log(`skipped (gradient or image ground): ${skipped.gradient}; focus-visible not matched: ${skipped.nofocusvisible}`);
if(empty.length){console.log(`FAIL: ${empty.length} surface${empty.length===1?'':'s'} measured nothing at ${WIDTH}x${HEIGHT}: ${empty.join(', ')}`);}
await browser.close();
process.exitCode=empty.length?1:0;})();
