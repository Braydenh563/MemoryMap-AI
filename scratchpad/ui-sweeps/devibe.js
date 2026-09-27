// The devibe sweep (unslop-ui's tells and the web interface guidelines, the
// ones a DOM can answer), per main surface: "..." where the ellipsis belongs,
// straight quotes in the interface's own copy, emoji used as icons in
// controls, gradient text, glows (a coloured shadow with a large blur on a
// control or card at rest), capsule controls outside the named ones, and
// headings or controls whose text overflows its box. W, THEME as usual.
//   BASE=... W=1440 THEME=dark SCRATCH=.. node devibe.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1440);
(async()=>{
  const touch=W<600?{hasTouch:true,isMobile:true}:{};
  const {browser,page}=await boot({viewport:{width:W,height:W<600?844:900},...touch});
  const scan=(label)=>page.evaluate((label)=>{
    const out=[];
    const vis=(e)=>e.checkVisibility&&e.checkVisibility({opacityProperty:true,visibilityProperty:true})&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().top<innerHeight;
    const own=(e)=>!e.closest('.entry-content, .note-body, .msg-body, .answer, .doc-prose, .ProseMirror, [contenteditable="true"], .entry-list li .entry-text, .library-card, .wb-object, .timeline-item-body, textarea, .chat-msg, #nm-buddy, .toast');
    const emoji=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for(const e of document.querySelectorAll('button, summary, label, h1, h2, h3, h4, [role="tab"], .chip, p.muted, .hint, option, input[placeholder], textarea[placeholder]')){
      if(!vis(e)||!own(e)||e.closest('.visually-hidden')) continue;
      const t=(e.matches('input, textarea')?e.getAttribute('placeholder'):(e.innerText||'')).trim();
      if(!t) continue;
      const where=`${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}.${String(e.className).split(' ').slice(0,2).join('.')}`;
      if(/\.\.\./.test(t)) out.push(`${label} ellipsis  ${where} "${t.slice(0,40)}"`);
      if(/(^|\s)"[^"]+"|'[^'\s][^']*'(\s|$)/.test(t)) out.push(`${label} quotes    ${where} "${t.slice(0,40)}"`);
      if(emoji.test(t)&&!e.querySelector('i.ph')) out.push(`${label} emoji     ${where} "${t.slice(0,40)}"`);
      if(!e.matches('input, textarea, option')){ const c=getComputedStyle(e); if(c.whiteSpace==='nowrap'&&e.scrollWidth>e.clientWidth+1&&c.textOverflow!=='ellipsis') out.push(`${label} clipped   ${where} "${t.slice(0,40)}" ${e.scrollWidth}/${e.clientWidth}`); }
    }
    for(const e of document.querySelectorAll('body *')){
      if(!vis(e)) continue; const c=getComputedStyle(e);
      if(c.backgroundClip==='text'||c.webkitBackgroundClip==='text') out.push(`${label} gradtext  ${e.tagName}.${String(e.className).split(' ')[0]}`);
      const sh=c.boxShadow; if(sh&&sh!=='none'){ const m=[...sh.matchAll(/(rgba?\([^)]*\)|oklab\([^)]*\)|color\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/g)]; for(const x of m){ const blur=+x[4]; const col=x[1]; const neutral=/rgba?\((\d+), \1, \1|rgba?\(0, 0, 0|rgba?\(31, 36, 48|rgba?\(28, 28, 26/.test(col); if(blur>=12&&!neutral&&!e.matches(':focus, :focus-visible')){ out.push(`${label} glow      ${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}.${String(e.className).split(' ').slice(0,2).join('.')} ${col} blur ${blur}`); break; } } }
      const ts=c.textShadow; if(ts&&ts!=='none'&&/[\d.]+px\s*$/.test(ts)&&parseFloat(ts.match(/([\d.]+)px\s*$/)[1])>=6) out.push(`${label} textglow  ${e.tagName}.${String(e.className).split(' ')[0]} ${ts.slice(0,50)}`);
    }
    return [...new Set(out)];
  },label);
  const all=[];
  const tab=async(n)=>{ await page.evaluate((n)=>{ if(typeof switchTab==='function') switchTab(n); },n); await page.waitForTimeout(1000); };
  const sub=async(sel)=>{ await page.evaluate((sel)=>document.querySelector(sel)?.click(),sel); await page.waitForTimeout(900); };
  await tab('dashboard'); all.push(...await scan('dashboard'));
  await tab('notes'); all.push(...await scan('notes'));
  await sub('#notes-subtabs [data-target*="capture"], #notes-subtabs button:nth-child(2)'); all.push(...await scan('capture'));
  await sub('#notes-subtabs [data-target*="ask"], #notes-subtabs button:last-child'); all.push(...await scan('ask'));
  await tab('chat'); all.push(...await scan('chat'));
  await tab('graph'); all.push(...await scan('graph'));
  await tab('timeline'); all.push(...await scan('timeline'));
  await tab('library'); all.push(...await scan('library'));
  await sub('#library-subtabs button:nth-child(2)'); all.push(...await scan('library-2'));
  await tab('reminders'); all.push(...await scan('reminders'));
  // A document, a board and a mind map, each made fresh (EXTRA=1: this
  // writes to the data dir).
  if(process.env.EXTRA){
    await tab('library'); await sub('[data-target="library-view-docs"], [data-target="library-view-documents"]');
    await sub('#library-new-doc'); await page.waitForTimeout(1500); all.push(...await scan('document')); await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/devibe-document.png`});
    await tab('library'); await sub('[data-target="library-view-whiteboard"]');
    await sub('#wb-new-board'); await page.waitForTimeout(1500); all.push(...await scan('whiteboard')); await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/devibe-whiteboard.png`});
    await tab('library'); await sub('[data-target="library-view-whiteboard"]');
    await sub('#wb-boards-new-map'); await page.waitForTimeout(1500); all.push(...await scan('mindmap')); await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/devibe-mindmap.png`});
  }
  await page.evaluate(()=>document.getElementById('settings-btn')?.click()); await page.waitForTimeout(900);
  const sections=await page.evaluate(()=>[...document.querySelectorAll('#settings-modal [data-section]')].map(b=>b.dataset.section));
  for(const s of sections){ await page.evaluate((s)=>document.querySelector(`#settings-modal [data-section="${s}"]`)?.click(),s); await page.waitForTimeout(250); all.push(...await scan('settings/'+s)); }
  const uniq=[...new Set(all)];
  const kinds={}; for(const x of uniq){ const k=x.split(/\s+/)[1]; kinds[k]=(kinds[k]||0)+1; }
  console.log(`${uniq.length} findings`, JSON.stringify(kinds));
  console.log(uniq.join('\n'));
  await browser.close();
})();
