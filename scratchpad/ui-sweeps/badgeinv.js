// INBOX 461 (1): every status badge across the app, measured against the one
// recipe (`.chip.item-label`, DESIGN.md). Per badge: its text, classes,
// height, padding, corner, type, border, fill, the gap between its icon and
// word, and how far its centre sits from the centre of the text it is beside
// (`dy`, the first line of the nearest heading-like sibling). Prints the
// signatures; OUTLIERS=1 lists only the ones off the recipe or off-centre.
//   BASE=... node scratchpad/ui-sweeps/badgeinv.js   (W=390 for a phone)
const {boot}=require('./lib.js');
const VIEWS=[
  ['dashboard',"switchTab('dashboard')"],
  ['settings/models',"openSettingsModal('models')","document.querySelectorAll('#settings-modal details.model-group').forEach((d)=>d.open=true)"],
  ['settings/extras',"openSettingsModal('extras')"],
  ['settings/websearch',"openSettingsModal('websearch')"],
  ['settings/tasks',"openSettingsModal('tasks')"],
  ['settings/skills',"openSettingsModal('skills')"],
  ['settings/templates',"openSettingsModal('templates')"],
  ['settings/personas',"openSettingsModal('personas')"],
  ['settings/tools',"openSettingsModal('tools')"],
  ['settings/learned',"openSettingsModal('learned')"],
  ['settings/about',"openSettingsModal('about')"],
  ['library/skills',"closeSettingsModal&&closeSettingsModal()","switchTab('library')","document.querySelector('#library-subtabs [data-target=\"library-view-skills\"]')?.click()"],
];
const SEL=['.chip:not(.chip-interactive):not(button):not(a)','[class*="badge"]:not(i)','.item-label','.extras-installed'].join(',');
(async()=>{
  const w=+(process.env.W||1440),phone=w<600;
  const {browser,page}=await boot({viewport:{width:w,height:900},...(phone?{hasTouch:true,isMobile:true}:{})});
  const all=[];
  for(const [name,...steps] of VIEWS){
    for(const step of steps){await page.evaluate((c)=>{try{(0,eval)(c);}catch(e){}},step);await page.waitForTimeout(700);}
    const found=await page.evaluate((sel)=>{
      const vis=(e)=>e.checkVisibility&&e.checkVisibility({visibilityProperty:true,opacityProperty:true});
      const head=(e)=>{
        for(let p=e.parentElement,depth=0;p&&depth<3;p=p.parentElement,depth++){
          const h=[...p.querySelectorAll(":scope > :is(strong,h3,h4,h5,.entry-title,.model-card-name,label,b), :scope > * > :is(strong,h3,h4,h5)")].find((x)=>x!==e&&!x.contains(e)&&vis(x)&&x.textContent.trim());
          if(h) return h;
        }
        return null;
      };
      const textMid=(el)=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(n.textContent.trim()){const r=document.createRange();r.selectNodeContents(n);const b=r.getClientRects()[0];if(b)return b.top+b.height/2;}}return null;};
      return [...document.querySelectorAll(sel)].filter(vis).filter((e)=>{const t=e.textContent.trim();return t&&t.length<=40&&!e.closest(".note-meta, .entry-meta.note-meta, #entry-list, .timeline-feed");}).map((e)=>{
        const s=getComputedStyle(e),r=e.getBoundingClientRect();
        const h=head(e);const hm=h?textMid(h):null,em=textMid(e);
        const icon=e.querySelector(":scope > i.ph, :scope > .spinner");
        const txt=e.querySelector(":scope > .ph-text");
        const gap=icon&&txt?Math.round(txt.getBoundingClientRect().left-icon.getBoundingClientRect().right):null;
        return {text:e.textContent.trim().slice(0,28),cls:e.className,h:Math.round(r.height*10)/10,pad:`${s.paddingTop} ${s.paddingLeft}`,rad:s.borderTopLeftRadius,font:`${s.fontSize}/${s.fontWeight}`,border:parseFloat(s.borderTopWidth)?s.borderTopWidth:"0",bg:s.backgroundColor==="rgba(0, 0, 0, 0)"?"none":"fill",gap,dy:hm!==null&&em!==null&&Math.abs(hm-em)<40?Math.round((em-hm)*10)/10:null,beside:h?h.textContent.trim().slice(0,20):""};
      });
    },SEL);
    for(const f of found) all.push({view:name,...f});
  }
  const sig=(b)=>`${b.font} h${b.h} pad ${b.pad} r${b.rad} b${b.border} bg:${b.bg}`;
  const groups=new Map();
  for(const b of all){const k=sig(b);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(b);}
  console.log(`${all.length} badges, ${groups.size} signatures`);
  for(const [k,list] of [...groups].sort((a,b)=>b[1].length-a[1].length)){
    if(process.env.OUTLIERS&&list.every((b)=>/item-label/.test(b.cls)&&(b.dy===null||Math.abs(b.dy)<=1)))continue;
    console.log(`\n${list.length}x ${k}`);
    const seen=new Set();
    for(const b of list){const key=b.cls+b.view;if(seen.has(key))continue;seen.add(key);console.log(`   [${b.view}] .${b.cls.split(/\s+/).join(".")} "${b.text}" gap ${b.gap} dy ${b.dy} beside "${b.beside}"`);}
  }
  await browser.close();
})();
