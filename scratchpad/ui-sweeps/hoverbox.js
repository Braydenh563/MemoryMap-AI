// hoverbox.js (was the box counter of the retired glyph-only grammar): forces :hover on every drawn button of the main surfaces (the
// header, seven tabs, Settings > Appearance) at 1440 and 390 and counts the
// treatments (INBOX 784/788): a *box* (the background changes), a *glyph*
// (only the colour changes, the old icon grammar), an *edge*, an *underline*
// (a tab's pseudo-element), *none* (the chosen one). The recipe (DESIGN.md,
// "One hover for every button") is box, with the underline for a sub-tab strip
// and the edge for a field or card. `PHASE=before|after node hoverbox.js`
// writes shots/hoverbox-<phase>.json and prints the counts per width.
const {boot}=require('./lib.js');
const fs=require('fs');
(async()=>{
 const out={};
 for (const [w,h] of [[1440,900],[390,844]]){
  const {browser,page}=await boot({viewport:{width:w,height:h}});
  page.setDefaultTimeout(8000); const rows=[]; console.log('booted',w);
  const surfaces=['dashboard','notes','chat','graph','library','timeline','reminders','settings'];
  for (const tab of surfaces){
    if(tab==='settings') await page.evaluate(()=>openSettingsModal('appearance')); else { await page.evaluate((t)=>{document.getElementById('settings-close')?.click(); switchTab(t)},tab); }
    await page.waitForTimeout(1300);
    console.log(' surface',tab);
    const n=await page.evaluate(()=>{window.__hov=[...document.querySelectorAll('button, summary, [role=tab], .chip-interactive')].filter(b=>{const r=b.getBoundingClientRect(); const s=getComputedStyle(b); return r.width>6&&r.height>6&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&s.visibility!=='hidden'&&!b.disabled&&b.offsetParent!==null;}); return window.__hov.length;});
    const limit=Math.min(n,70); console.log('  buttons',n);
    for(let i=0;i<limit;i++){
      await page.mouse.move(1,1); await page.waitForTimeout(30);
      const info=await page.evaluate((i)=>{const b=window.__hov[i]; if(!b||!b.isConnected) return null; const snap=()=>{const s=getComputedStyle(b);const a=getComputedStyle(b,'::after');return {bg:s.backgroundColor,bi:s.backgroundImage,fg:s.color,bd:s.borderTopColor,sh:s.boxShadow,tf:s.transform+s.scale,op:s.opacity,af:a.content+a.backgroundColor+a.transform,ol:s.textDecorationLine}}; b.scrollIntoView({block:'nearest'}); window.__rest=snap(); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,cls:b.className.toString().slice(0,60),id:b.id,tag:b.tagName,label:(b.getAttribute('aria-label')||b.textContent||'').trim().slice(0,24),icon:b.matches('.icon-only,.icon-button,[class*=icon]')}}, i);
      if(!info) continue;
      await page.mouse.move(info.x,info.y); await page.waitForTimeout(260);
      const d=await page.evaluate((i)=>{const b=window.__hov[i]; const s=getComputedStyle(b);const a=getComputedStyle(b,'::after');const now={bg:s.backgroundColor,bi:s.backgroundImage,fg:s.color,bd:s.borderTopColor,sh:s.boxShadow,tf:s.transform+s.scale,op:s.opacity,af:a.content+a.backgroundColor+a.transform,ol:s.textDecorationLine}; const r=window.__rest; const hit=document.elementFromPoint(...[b.getBoundingClientRect().left+b.getBoundingClientRect().width/2,b.getBoundingClientRect().top+b.getBoundingClientRect().height/2].map(Math.round)); const diff=[]; for(const k of Object.keys(now)) if(now[k]!==r[k]) diff.push(k); return {diff, bgNow:now.bg, bgRest:r.bg, hits:b.contains(hit)||hit===b}}, i);
      rows.push({w,tab,...info,...d});
    }
  }
  out[w]=rows; await browser.close();
 }
 fs.writeFileSync(process.env.SCRATCH+'/hoverbox-'+(process.env.PHASE||'after')+'.json',JSON.stringify(out));
 const fam=(r)=>{ const k=new Set(r.diff); if(k.has('bg')||k.has('bi')) return 'box'; if(k.has('af')) return 'underline'; if(k.size===1&&k.has('fg')||(k.size===2&&k.has('fg')&&k.has('bd'))) return 'glyph'; if(k.has('bd')||k.has('sh')) return 'edge'; if(!k.size) return 'none'; return 'other'; };
 for(const w of Object.keys(out)){ const c={}; for(const r of out[w]){ if(!r.hits) continue; const f=fam(r); c[f]=(c[f]||0)+1;} console.log(w, 'buttons', out[w].length, JSON.stringify(c)); }
})();
