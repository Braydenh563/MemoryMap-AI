// Each switch row's visible top hairline (border or inset background line)
// against its group head's underline: left/right overhang in px.
const {boot}=require('./lib.js');
const W = +(process.env.W||1440);
const SECTIONS = 'general,preferences,appearance,account,capture,ask,browse,list,outline,models,tools,skills,personas,templates,memory,learned,tasks,writing-room,websearch,searchindex,extras,data,logs,about'.split(',');
(async()=>{
  const mob = W<600 ? {hasTouch:true,isMobile:true}:{};
  const {browser,page}=await boot({viewport:{width:W,height:W<600?844:900},...mob});
  const dist={};
  for (const s of SECTIONS) {
    await page.evaluate(x=>openSettingsModal(x), s); await page.waitForTimeout(600);
    const rows = await page.evaluate(()=>{
      const out=[];
      const vis=(c)=>c && c!=='rgba(0, 0, 0, 0)' && c!=='transparent';
      for (const row of document.querySelectorAll('#settings-modal .settings-section:not(.hidden) label:is(.check-row,.setting-check)')) {
        if (!row.offsetParent) continue;
        const g=row.closest('.settings-group'); if (!g) continue;
        const head=[...g.children].find(c=>c.matches('h3:not(.flush),h4:not(.flush),.help-head'));
        if (!head) continue;
        const hr=head.getBoundingClientRect();
        const cs=getComputedStyle(row), rr=row.getBoundingClientRect();
        let l=null, r=null;
        if (parseFloat(cs.borderTopWidth)>0 && vis(cs.borderTopColor)) { l=rr.left; r=rr.right; }
        else if (cs.backgroundImage.includes('gradient')) {
          // background-size first value
          const w=cs.backgroundSize.split(' ')[0];
          let px = w.endsWith('px') ? parseFloat(w) : null;
          const m = cs.backgroundSize.match(/calc\(100% - ([\d.]+)px\)/); if (m) px = rr.width - parseFloat(m[1]);
          if (px!=null) { l=rr.left+(rr.width-px)/2; r=l+px; }
        }
        if (l==null) continue;
        out.push((true?row.className+' '+row.parentElement.tagName+'.'+row.parentElement.className+' ':'')+`${Math.round((hr.left-l)*10)/10}/${Math.round((r-hr.right)*10)/10}`);
      }
      return out;
    });
    for (const k of rows) { dist[k]=(dist[k]||0)+1; }
  }
  console.log(W, process.env.THEME||'light', 'overhang left/right px -> rows:', JSON.stringify(dist));
  await browser.close();
})();
