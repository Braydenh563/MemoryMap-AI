// The app-wide consistency pass: every visible control on every main surface
// and Settings section, keyed by what the eye sees (kind, height, radius,
// fill, edge, font size, weight), with each value checked against the tokens
// resolved live (--radius-sm/md/lg, pill; --target-min, --button-min-h,
// --control-h). Prints the off-token controls, then the rare signatures (a
// look used by 1 or 2 controls in the whole app), which is where hand-built
// controls hide. W=1093|1440|390, THEME=dark.
//   BASE=... W=1440 THEME=dark SCRATCH=.. node consistency.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1093);
(async()=>{
  const touch=W<600?{hasTouch:true,isMobile:true}:{};
  const {browser,page}=await boot({viewport:{width:W,height:W<600?844:(W>=1440?900:614)},...touch});
  const tokens=await page.evaluate(()=>{
    const probe=document.createElement('div'); document.body.append(probe);
    // Resolved through the property that uses them: a radius as a radius,
    // a height as a min-height (a bare `height` on an empty div in a flex
    // body came back as a fraction of the value).
    probe.style.position='absolute';
    const rad=(v)=>{probe.style.borderRadius=v; return parseFloat(getComputedStyle(probe).borderTopLeftRadius);};
    const px=(v)=>{probe.style.minHeight=v; return parseFloat(getComputedStyle(probe).minHeight);};
    const t={sm:rad('var(--radius-sm)'),md:rad('var(--radius-md)'),lg:rad('var(--radius-lg)'),choice:rad('var(--radius-choice)'),tmin:px('var(--target-min)'),bmin:px('var(--button-min-h)'),ch:px('var(--control-h)'),chlg:px('var(--control-h-lg)')};
    probe.remove(); return t;
  });
  console.log('tokens', JSON.stringify(tokens));
  const collect=(label)=>page.evaluate(({label,t})=>{
    const out=[];
    const radii=[0,t.sm,t.md,t.lg,t.choice].map(v=>+v.toFixed(1));
    const heights=[t.tmin,t.bmin,t.ch,t.chlg,44,24].map(v=>Math.round(v));
    for(const el of document.querySelectorAll('button, summary, select, input[type="text"], input[type="search"], input:not([type]), [role="button"], a.button')){
      if(!el.checkVisibility||!el.checkVisibility({opacityProperty:true,visibilityProperty:true})) continue;
      const r=el.getBoundingClientRect(); if(r.width<8||r.height<8||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth) continue;
      if(el.closest('#nm-buddy, #nm-buddy-band, .nm-atlas, #atl-grid, .lightbox, svg')) continue;
      const c=getComputedStyle(el);
      const kind=el.tagName==='SELECT'?'select':el.tagName==='INPUT'?'field':el.tagName==='SUMMARY'?'summary':'button';
      const rad=parseFloat(c.borderTopLeftRadius); const h=Math.round(r.height);
      const pill=rad>=h/2-0.5;
      const radOk=pill||radii.some(v=>Math.abs(v-rad)<0.3)||c.borderTopLeftRadius.includes('%');
      const icon=el.matches('.icon-only,.icon-button')||(!el.textContent.trim()&&el.querySelector('i,svg'));
      const bg=c.backgroundColor, bd=parseFloat(c.borderTopWidth)?c.borderTopColor:'none';
      const sig=`${kind}${icon?':icon':''} h${h} r${pill?'pill':rad.toFixed(1)} bg=${bg} bd=${bd} fs=${c.fontSize} fw=${c.fontWeight}`;
      const name=(el.id?'#'+el.id:'')+'.'+[...el.classList].filter(x=>!/^ph/.test(x)).slice(0,3).join('.')+(el.id?'':` "${(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,18)}"`);
      const inBar=!!el.closest('.dock, #status-bar, .tab-bar, #tab-bar, [role="menu"], .dock-menu-list, .action-menu, .segmented-control, .seg');
      out.push({label,sig,name,radOk,h,kind,inBar});
    }
    return out;
  },{label,t:tokens});
  const all=[];
  const tab=async(name)=>{ await page.evaluate((n)=>{ if(typeof switchTab==='function') switchTab(n); else document.querySelector(`[data-tab="${n}"]`)?.click(); },name); await page.waitForTimeout(900); };
  for(const t of ['dashboard','notes','chat','graph','timeline','library','reminders']){ await tab(t); all.push(...await collect(t)); }
  await tab('notes');
  await page.evaluate(()=>document.querySelector('[data-notes-view="capture"], #notes-view-capture, button[data-view="capture"]')?.click()); await page.waitForTimeout(700); all.push(...await collect('capture'));
  await page.evaluate(()=>document.getElementById('settings-btn')?.click()); await page.waitForTimeout(900);
  const sections=await page.evaluate(()=>[...document.querySelectorAll('#settings-modal [data-section]')].map(b=>b.dataset.section));
  for(const s of sections){ await page.evaluate((s)=>document.querySelector(`#settings-modal [data-section="${s}"]`)?.click(),s); await page.waitForTimeout(250); all.push(...await collect('settings/'+s)); }
  const seen=new Set(); const uniq=all.filter(x=>{const k=x.label.split('/')[0]+x.name+x.sig; if(seen.has(k)) return false; seen.add(k); return true;});
  const off=uniq.filter(x=>!x.radOk);
  console.log(`\n${uniq.length} controls; radius off the tokens: ${off.length}`);
  for(const x of off.slice(0,40)) console.log(`  ${x.label.padEnd(20)} ${x.name.padEnd(46)} ${x.sig}`);
  // Heights off the control steps (28 hit floor, 32 button, 36 field and
  // tab, 44 touch), for single-line controls outside bars.
  const steps=[tokens.tmin,tokens.bmin,tokens.ch,44].map(Math.round);
  const offH=uniq.filter(x=>!x.inBar&&x.h<60&&x.h>=20&&!steps.some(v=>Math.abs(v-x.h)<=1)&&!/icon/.test(x.sig));
  console.log(`\nheights off the steps ${steps.join('/')}: ${offH.length}`);
  const seenH=new Set(); for(const x of offH){ const k=x.name.replace(/ ".*/,''); if(seenH.has(k)) continue; seenH.add(k); console.log(`  ${x.label.padEnd(20)} ${x.name.padEnd(46)} ${x.sig}`); }
  const counts={}; for(const x of uniq){ counts[x.sig]=(counts[x.sig]||0)+1; }
  const rare=uniq.filter(x=>counts[x.sig]<=2&&!x.inBar);
  console.log(`\nsignatures: ${Object.keys(counts).length}; rare (1-2 uses, outside bars and menus): ${rare.length}`);
  for(const x of rare.slice(0,process.env.ALL?999:60)) console.log(`  ${x.label.padEnd(20)} ${x.name.padEnd(46)} ${x.sig}`);
  // Corners per kind, the one-corner-per-family check.
  const fam={}; for(const x of uniq){ if(x.inBar) continue; const r=x.sig.match(/ r(\S+)/)[1]; const k=x.sig.split(' ')[0]; fam[k]=fam[k]||{}; fam[k][r]=(fam[k][r]||0)+1; }
  if(process.env.SHOW){ const re=new RegExp(process.env.SHOW); console.log('\nmatching '+process.env.SHOW+':'); const seenN=new Set(); for(const x of uniq){ if(re.test(x.sig)&&!x.inBar){ const k=x.name.replace(/ ".*/,''); if(seenN.has(k)) continue; seenN.add(k); console.log('  '+x.label.padEnd(20)+' '+x.name.padEnd(46)+' '+x.sig);} } }
  console.log('\ncorners by kind (outside bars):'); for(const [k,v] of Object.entries(fam)) console.log('  '+k.padEnd(14)+' '+Object.entries(v).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`${r}:${n}`).join('  '));
  await browser.close();
})();
