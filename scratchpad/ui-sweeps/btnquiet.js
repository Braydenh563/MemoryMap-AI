// The quiet button and select restyle (wrap-up ledger, Atlas section, item 1):
// ten surfaces at 1093x614, a shot of each, and per surface the numbers the
// recipe promises: every standing ghost button's rest fill and its edge's
// contrast against the ground it sits on (3:1), heights (32 floor for
// .small and selects), and whether an icon-only ghost has no fill at rest.
//   BASE=http://127.0.0.1:8861 THEME=dark TAG=after SCRATCH=.. node btnquiet.js
const {boot}=require('./lib.js');
const TAG=process.env.TAG||'after';
const THEME=process.env.THEME||'light';
const measure=()=>{
  const parse=(s)=>{const m=s.match(/rgba?\(([^)]+)\)/); if(!m) return [0,0,0,0]; const p=m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0],p[1],p[2],p.length>3?p[3]:1];};
  const over=(top,bot)=>{const a=top[3]+bot[3]*(1-top[3]); if(!a) return [0,0,0,0]; return [0,1,2].map(i=>(top[i]*top[3]+bot[i]*bot[3]*(1-top[3]))/a).concat([a]);};
  const ground=(el)=>{const chain=[]; for(let n=el;n&&n.nodeType===1;n=n.parentElement) chain.push(parse(getComputedStyle(n).backgroundColor));
    let g=[255,255,255,1]; const html=parse(getComputedStyle(document.documentElement).backgroundColor); if(html[3]) g=over(html,g);
    for(const c of chain.reverse()) g=over(c,g); return g;};
  const lum=(c)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);};
  const cr=(a,b)=>{const x=lum(a),y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
  const res={ghost:0,edgeLow:[],iconFilled:[],shortSmall:[],selects:[],sig:{}};
  document.querySelectorAll('button.ghost, summary.ghost, select').forEach(b=>{
    if(!b.checkVisibility||!b.checkVisibility()) return;
    const r=b.getBoundingClientRect(); if(r.width<6||r.height<6||r.bottom<0||r.top>innerHeight) return;
    if(b.closest('.dock, .entry-actions, #status-bar, .tab-bar, [role="menu"], .dock-menu-list')) return; // quiet tier by design
    const c=getComputedStyle(b); const name=(b.id?'#'+b.id:b.tagName.toLowerCase()+'.'+[...b.classList].slice(0,3).join('.'));
    if(b.tagName==='SELECT'){ res.selects.push(`${name} h=${Math.round(r.height)} chevron=${c.backgroundImage.includes('svg')}`); return; }
    const icon=b.matches('.icon-only, .icon-button'); const pressed=b.matches('.active,[aria-pressed="true"],[aria-expanded="true"]');
    if(pressed) return;
    res.ghost++;
    const g=ground(b.parentElement); const own=over(parse(c.backgroundColor),g); const edge=over(parse(c.borderTopColor),own);
    const k=`${icon?'icon':'text'} bg=${c.backgroundColor} bd=${c.borderTopWidth} ${c.borderTopColor} sh=${c.boxShadow==='none'?'none':'shadow'}`;
    res.sig[k]=(res.sig[k]||0)+1;
    if(icon){ if(parse(c.backgroundColor)[3]>0.01||(parseFloat(c.borderTopWidth)>0&&parse(c.borderTopColor)[3]>0.01)) res.iconFilled.push(name); }
    else if(parseFloat(c.borderTopWidth)>0){ const ratio=cr(edge,g); if(ratio<3) res.edgeLow.push(`${name} ${ratio.toFixed(2)}`); }
    if(b.classList.contains('small')&&!icon&&r.height<31.5) res.shortSmall.push(`${name} ${r.height.toFixed(1)}`);
  });
  return res;
};
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:614}});
  const tab=async(t)=>{await page.click(`[data-tab="${t}"]`).catch(()=>{}); await page.waitForTimeout(900);};
  const surfaces=[
    ['dashboard',async()=>tab('dashboard')],
    ['notes',async()=>tab('notes')],
    ['note-open',async()=>{await tab('notes'); await page.click('.entry-card, .note-card, [data-entry-id]').catch(()=>{}); await page.waitForTimeout(1200);}],
    ['library',async()=>tab('library')],
    ['chat',async()=>tab('chat')],
    ['graph',async()=>tab('graph')],
    ['timeline',async()=>tab('timeline')],
    ['reminders',async()=>{await tab('reminders'); await page.click('#reminders-new').catch(()=>{}); await page.waitForTimeout(700); await page.evaluate(()=>{ const f=document.querySelector('.btn-group'); f&&f.scrollIntoView({block:'center'}); }); await page.waitForTimeout(400);}],
    ['settings',async()=>{await page.keyboard.press('Escape'); await page.click('#settings-btn').catch(()=>{}); await page.waitForTimeout(1200);}],
    ['categories',async()=>{await page.keyboard.press('Escape'); await page.waitForTimeout(300); await tab('notes'); await page.evaluate(()=>{ if(typeof openManageCategories==='function') openManageCategories(); }); await page.waitForTimeout(1200);}],
  ];
  for(const [name,go] of surfaces){
    await go();
    const m=await page.evaluate(measure);
    await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/btn-${TAG}-${THEME}-${name}.png`});
    console.log(`${name}: ghost=${m.ghost} edge<3:1=${m.edgeLow.length}${m.edgeLow.length?' '+m.edgeLow.slice(0,4).join(', '):''} iconFilled=${m.iconFilled.length}${m.iconFilled.length?' '+m.iconFilled.slice(0,4).join(', '):''} small<32=${m.shortSmall.length}${m.shortSmall.length?' '+m.shortSmall.slice(0,4).join(', '):''}`);
    if(name==='reminders'){ const g=await page.evaluate(()=>{const b=[...document.querySelectorAll('.btn-group > button')].filter(x=>x.checkVisibility()); return b.map(x=>{const r=x.getBoundingClientRect(),c=getComputedStyle(x);return `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} r=${c.borderTopLeftRadius}/${c.borderTopRightRadius}`;}).join(' | ');}); console.log('   btn-group: '+g); }
    if(m.selects.length) console.log('   selects: '+m.selects.slice(0,5).join('; '));
    if(process.env.SIG) for(const [k,v] of Object.entries(m.sig)) console.log('   '+v+'  '+k);
  }
  await browser.close();
})();
