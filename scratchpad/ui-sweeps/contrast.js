// Text contrast, both themes (BACKLOG §116.1 item 4). For every visible text
// element on each tab (and each Settings section), the computed colour
// against the first non-transparent background up the tree, as a WCAG
// contrast ratio. Reports anything under 4.5:1 (3:1 for text ≥ 18.66px or
// bold ≥ 14px). THEME=dark for the other theme. Computed colours, not pixel
// samples, so glass and images do not confuse it — a translucent card is
// composited against whatever is behind it and reported as "translucent".
const {boot}=require('./lib.js');
const TABS=['dashboard','notes','chat','graph','library','timeline','reminders'];
const SECTIONS=['models','appearance','account','tools','skills','tasks','data','logs','extras','about'];
(async()=>{const {browser,page}=await boot();
const run=async(label)=>{const r=await page.evaluate(()=>{
  const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
  const parse=(c)=>{if(!c||c==='transparent')return null;const m=c.match(/^rgba?\(([^)]+)\)$/);if(m){const p=m[1].split(/[\s,\/]+/).map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
    // oklab()/color-mix() results: let the canvas resolve them to bytes.
    cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=c;if(cx.fillStyle==='#000000'&&!/black|#000/.test(c))return null;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return {r:d[0],g:d[1],b:d[2],a:d[3]/255};};
  const lum=({r,g,b})=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
  const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);};
  const bgOf=(el)=>{let translucent=false;for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e);if(cs.backgroundImage&&cs.backgroundImage!=='none')return {c:null,translucent,gradient:true};const c=parse(cs.backgroundColor);if(c&&c.a>0){if(c.a<1)translucent=true;if(c.a>=0.9)return {c,translucent};}}const root=parse(getComputedStyle(document.body).backgroundColor);const html=parse(getComputedStyle(document.documentElement).backgroundColor);const c=(root&&root.a>0)?root:(html&&html.a>0)?html:{r:255,g:255,b:255,a:1};return {c,translucent:true};};
  const out=[];const seen=new Set();
  for(const el of document.querySelectorAll('.tab-page:not(.hidden) *, #settings-modal:not(.hidden) *, .modal-overlay:not(.hidden) *')){
    if(!el.checkVisibility||!el.checkVisibility())continue;
    const text=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
    if(!text)continue;const cs=getComputedStyle(el);const fg=parse(cs.color);if(!fg||fg.a<1)continue;
    const {c:bg,translucent,gradient}=bgOf(el);if(gradient||!bg)continue;const r=ratio(fg,bg);const size=parseFloat(cs.fontSize);const bold=parseInt(cs.fontWeight)>=700;const need=(size>=18.66||(bold&&size>=14))?3:4.5;
    if(r<need){const key=(el.id||el.className.toString().slice(0,40))+'|'+text.slice(0,20);if(seen.has(key))continue;seen.add(key);
      out.push(`${r.toFixed(2)}${translucent?'~':''} <${el.tagName.toLowerCase()}${el.id?'#'+el.id:'.'+[...el.classList].slice(0,2).join('.')}> "${text.slice(0,30)}" ${cs.color} on rgb(${bg.r},${bg.g},${bg.b})`);}
  }
  return out.slice(0,12);});
  console.log(`== ${label}: ${r.length?r.length+' low-contrast':'ok'}`);r.forEach(l=>console.log('  '+l));};
for(const t of TABS){await page.click(`[data-tab="${t}"]`).catch(()=>{});await page.waitForTimeout(600);await run(t);}
await page.click('#settings-btn').catch(()=>{});await page.waitForTimeout(400);
for(const s of SECTIONS){const ok=await page.click(`#settings-modal [data-section="${s}"]`,{timeout:1500}).then(()=>true).catch(()=>false);if(!ok)continue;await page.waitForTimeout(300);await run('settings/'+s);}
await browser.close();})();
