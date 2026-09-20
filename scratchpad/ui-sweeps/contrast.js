// Text contrast, both themes (BACKLOG §116.1 item 4). For every visible text
// element on each tab (and each Settings section), the computed colour
// against the first non-transparent background up the tree, as a WCAG
// contrast ratio. Reports anything under 4.5:1 (3:1 for text ≥ 18.66px or
// bold ≥ 14px). THEME=dark for the other theme. Computed colours, not pixel
// samples, so glass and images do not confuse it — a translucent card is
// composited against whatever is behind it and reported as "translucent".
const {boot}=require('./lib.js');
// Every tab page, not only the seven with a button in the tab bar.
//
// Documents, the whiteboard and the mind map are reached from a dock or a
// Library row rather than from `[data-tab]`, so a sweep that clicked the tab
// bar never once measured them: three whole surfaces, one of them the
// documents editor, had never been contrast-checked when this was found
// (`archive/agent-remaining/image-cards.md`, 2026-09-12). `switchTab` is how the app
// itself gets there, so it is how this gets there.
// 'whiteboard' was in this list and was never once measured, at any width.
// There is no `#tab-whiteboard`: a board is a surface inside the Library's
// Boards & maps section, and `revealTab` hides every page in its own TABS
// list and finds nothing to show for a name that is not in it, so the sweep
// measured an empty window and printed "ok". That is the exact failure the
// element count added below exists to catch, and this is its first catch.
// The board is reached the way the app reaches it: the sub-tab, then a board.
const TABS=['dashboard','notes','chat','graph','library','timeline','reminders','documents'];
// The sub-tabs, which are whole screens wearing one tab's id. Notes has four
// and Library has five, and only whichever was last open had ever been
// measured.
const SUBTABS={
  notes:['browse','capture','writing-room','ask'],
  library:null,  // filled in from the strip itself: its ids move with the plan
};
const SECTIONS=['models','appearance','account','tools','skills','memory','learned','tasks','data','logs','extras','about'];
// WIDTH/HEIGHT, because this sweep took no viewport at all and had therefore
// only ever run at `boot`'s default 1440x900 (UI_MODERNISATION_PLAN Phase 11
// item 11 named it as open for exactly that reason). A phone is not the same
// page: below 600 the docks fold, the sidebars park off screen, the tab bar
// is captions under icons and the header is three controls, so a colour
// measured at 1440 says nothing about a control that only exists at 390.
// Below 600 it asks for a touch context too, since half of that band's rules
// are behind `(pointer: coarse)`.
const WIDTH=Number(process.env.WIDTH||1440);
const HEIGHT=Number(process.env.HEIGHT||(WIDTH<600?844:900));
const PHONE=WIDTH<600;
(async()=>{const {browser,page}=await boot({viewport:{width:WIDTH,height:HEIGHT},hasTouch:PHONE,isMobile:PHONE});
const run=async(label)=>{const r=await page.evaluate(()=>{
  const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
  const parse=(c)=>{if(!c||c==='transparent')return null;const m=c.match(/^rgba?\(([^)]+)\)$/);if(m){const p=m[1].split(/[\s,\/]+/).map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
    // oklab()/color-mix() results: let the canvas resolve them to bytes.
    cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=c;if(cx.fillStyle==='#000000'&&!/black|#000/.test(c))return null;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return {r:d[0],g:d[1],b:d[2],a:d[3]/255};};
  const lum=({r,g,b})=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
  const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);};
  const bgOf=(el)=>{let translucent=false;for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e);if(cs.backgroundImage&&cs.backgroundImage!=='none')return {c:null,translucent,gradient:true};const c=parse(cs.backgroundColor);if(c&&c.a>0){if(c.a<1)translucent=true;if(c.a>=0.9)return {c,translucent};}}const root=parse(getComputedStyle(document.body).backgroundColor);const html=parse(getComputedStyle(document.documentElement).backgroundColor);const c=(root&&root.a>0)?root:(html&&html.a>0)?html:{r:255,g:255,b:255,a:1};return {c,translucent:true};};
  // `checked` so an "ok" is backed by a number. A run that reached a surface
  // and found nothing wrong and a run whose surface never rendered both
  // printed "ok" before this, and the second is the one that matters: the
  // phone band's settings sections were reached by clicking a strip that is
  // hidden below 600, so every one of them was "ok" by never being looked at.
  const out=[];const seen=new Set();let checked=0;
  for(const el of document.querySelectorAll('.tab-page:not(.hidden) *, #settings-modal:not(.hidden) *, .modal-overlay:not(.hidden) *')){
    if(!el.checkVisibility||!el.checkVisibility())continue;
    const text=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
    if(!text)continue;const cs=getComputedStyle(el);const fg=parse(cs.color);if(!fg||fg.a<1)continue;checked++;
    const {c:bg,translucent,gradient}=bgOf(el);if(gradient||!bg)continue;const r=ratio(fg,bg);const size=parseFloat(cs.fontSize);const bold=parseInt(cs.fontWeight)>=700;const need=(size>=18.66||(bold&&size>=14))?3:4.5;
    if(r<need){const key=(el.id||el.className.toString().slice(0,40))+'|'+text.slice(0,20);if(seen.has(key))continue;seen.add(key);
      out.push(`${r.toFixed(2)}${translucent?'~':''} <${el.tagName.toLowerCase()}${el.id?'#'+el.id:'.'+[...el.classList].slice(0,2).join('.')}> "${text.slice(0,30)}" ${cs.color} on rgb(${bg.r},${bg.g},${bg.b})`);}
  }
  return {out:out.slice(0,12),checked};});
  console.log(`== ${label}: ${r.out.length?r.out.length+' low-contrast':'ok'} (${r.checked} text elements)`);r.out.forEach(l=>console.log('  '+l));
  if(!r.checked)console.log('  nothing was measured here, which is a finding about the sweep, not the surface');};
const go=async(t)=>{await page.evaluate((name)=>{try{switchTab(name);}catch(e){}},t);await page.waitForTimeout(700);};
for(const t of TABS){
  await go(t);
  // A tab that would not open is worth saying so about, rather than being
  // silently reported as clean.
  const open=await page.evaluate((name)=>{const el=document.getElementById('tab-'+name);return el?!el.classList.contains('hidden'):null;},t);
  if(open===false){console.log(`== ${t}: SKIPPED, the tab did not open`);continue;}
  await run(t);
  const subs=SUBTABS[t]===null
    ? await page.evaluate(()=>[...document.querySelectorAll('#library-subtabs button')].map(b=>b.dataset.subtab||b.getAttribute('aria-controls')||b.textContent.trim()))
    : SUBTABS[t];
  if(!subs)continue;
  for(const sub of subs){
    const clicked=await page.evaluate(({tab,sub})=>{
      const strip=document.getElementById(tab+'-subtabs');
      if(!strip)return false;
      const btn=[...strip.querySelectorAll('button')].find(b=>(b.dataset.section||b.dataset.subtab||b.getAttribute('aria-controls')||b.textContent.trim())===sub);
      if(!btn)return false;btn.click();return true;
    },{tab:t,sub});
    if(!clicked)continue;
    await page.waitForTimeout(600);
    await run(`${t}/${sub}`);
  }
}
// A board, opened from the Boards & maps section the way a person opens one.
// Nothing is created here: a sweep that made a board on every run would fill
// the data directory it shares with every other sweep. If there is no board
// to open it says so rather than passing quietly.
{
  await go('library');
  const opened=await page.evaluate(async()=>{
    document.querySelector('#library-subtabs button[data-target="library-view-whiteboard"]')?.click();
    await new Promise(r=>setTimeout(r,900));
    const card=document.querySelector('.library-board-card');
    if(!card)return 'no board in this notebook';
    card.click();
    await new Promise(r=>setTimeout(r,1800));
    return document.getElementById('wb-topbar')?.offsetParent?'open':'it would not open';
  });
  if(opened==='open'){await page.waitForTimeout(600);await run('whiteboard (a board open)');await page.keyboard.press('Escape').catch(()=>{});await page.waitForTimeout(400);}
  else console.log(`== whiteboard: SKIPPED, ${opened}`);
}

// `openSettingsModal`, not a click on `#settings-btn`: below 600 that button
// is hidden and Settings is a row in the header's `#header-more` menu (Phase
// 11 item 1), so a sweep that clicked it measured no Settings section at all
// at phone width and said nothing about having skipped them.
await page.evaluate(()=>{try{openSettingsModal('models');}catch(e){document.getElementById('settings-btn')?.click();}});await page.waitForTimeout(600);
// The section strip is hidden below 600 (the phone puts every section in one
// scroll with a jump select beside the search), so the sections are reached
// the way the app reaches them rather than by clicking a strip that is not
// there: another whole band this sweep would otherwise report as clean by
// never having looked at it.
for(const s of SECTIONS){
  const ok=PHONE
    ? await page.evaluate((name)=>{try{openSettingsModal(name);return true;}catch(e){return false;}},s)
    : await page.click(`#settings-modal [data-section="${s}"]`,{timeout:1500}).then(()=>true).catch(()=>false);
  if(!ok)continue;await page.waitForTimeout(400);await run('settings/'+s);
}
console.log(`== done at ${WIDTH}x${HEIGHT}, theme ${process.env.THEME||'light'}`);
await browser.close();})();
