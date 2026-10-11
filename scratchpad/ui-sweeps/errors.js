// Bug scan: page errors and console errors per tab and Settings section,
// horizontal overflow and clipped cards at four widths. Prints only what is
// wrong; a clean run prints one line per width.
//
// `checkVisibility` is called with all three opt-in flags (Phase 9). The bare
// call only rules out `display: none` and `content-visibility`, so anything
// hidden with `visibility` or `opacity: 0` still counted as on screen: the
// sidebar sheets added in Phase 9 park off-canvas when closed, and the sweep
// reported "New chat" as an off-screen control every time. An element with
// `visibility: hidden` is not visible, so the stricter test is the correct
// one rather than an excuse made for the sheet.
//
// "Clipped" means `overflow-y: hidden` or `clip` with content past the box:
// content cut off with no way to reach it. A scroller (`auto`) is reachable,
// and counting it reported the phone's categories drawer, which scrolls, as
// clipped (2026-10-03).
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PW='testpassword123'; const BASE=process.env.BASE||'http://127.0.0.1:8781';
// Every tab page, not the seven with a button in the tab bar. Documents and
// the whiteboard are reached from a dock or a Library row, so clicking
// `[data-tab]` never opened them and a console error on the documents editor
// could not fail this sweep. Same gap `contrast.js` had, found 2026-09-12.
const TABS=['dashboard','notes','library','chat','graph','timeline','reminders','documents','whiteboard'];
const SECTIONS=['account','privacy','learned','appearance','preferences','models','tools','skills','personas','templates','websearch','memory','tasks','data','logs','shortcuts','extras','help','about'];
const SUBTABS={notes:['browse','capture','writing-room','ask'],library:['docs','boards','images','files','skills','links','contents']};
// FAULTS=1: the fault-injection pass instead (errors-faults.js, WORLD_CLASS_PLAN H9):
// one route at a time answers 500, and no tab may go blank or throw.
if (process.env.FAULTS) { require("./errors-faults.js"); return; }
// "Target crashed" at the first `page.evaluate` of a tab (INBOX, 2026-10-05) is
// the renderer dying, not a page error: one shared browser carried every width's
// graph, whiteboard and Settings pages in turn, and a container whose /dev/shm is
// small (Docker's default is 64 MB) or a box under load kills a Chromium that
// holds that much. Each width now gets its own browser, launched with
// `--disable-dev-shm-usage` (shared memory goes to /tmp instead), and a crash is
// reported as a finding naming the tab, then the next width runs, instead of an
// unhandled rejection that hides every width after it. It did not reproduce on a
// fresh data dir with /dev/shm at 16 GB, so this is the cause named by its
// signature and not one measured here.
const LAUNCH_ARGS=['--disable-dev-shm-usage'];
(async()=>{
  for(const width of (process.env.WIDTHS||'1440,1024,820,390').split(',').map(Number)){
    const browser=await chromium.launch({args:LAUNCH_ARGS});
    try{ await runWidth(browser,width); }
    catch(e){ console.log(`== ${width}px: the run stopped: ${String(e.message||e).split('\n')[0].slice(0,160)}`); process.exitCode=1; }
    await browser.close().catch(()=>{});
  }
})();
async function runWidth(browser,width){
  {
    const ctx=await browser.newContext({viewport:{width,height:width<600?844:900},deviceScaleFactor:1,hasTouch:width<820,isMobile:width<600});
    // **And who wrote the NaN.** A `<rect> attribute x: Expected length,
    // "NaN"` is a browser parse error: it names the attribute and nothing
    // else, so a run that catches one says a value went bad somewhere in
    // 60,000 lines of frontend. This wraps `setAttribute` before any of the
    // app's scripts run and keeps the stack of the first few offenders, so
    // the next run that sees one names the function instead. Bounded at
    // eight, and it only records values that actually contain "NaN", so a
    // clean run costs one string test per attribute write.
    // Written after a run against a seeded four thousand note notebook
    // reported 116 of these at 1440px and 112 at 1024 and no later run
    // reproduced them (INBOX 259).
    //: THEME=dark sweeps the other theme: named before the script below, which reads it.
    await ctx.addInitScript((t)=>{window.__sweepTheme=t;}, process.env.THEME||'light');
    await ctx.addInitScript(()=>{try{localStorage.setItem('theme',window.__sweepTheme||'light');}catch(e){}
      window.__nanWrites=[];
      const setAttr=Element.prototype.setAttribute;
      Element.prototype.setAttribute=function(name,value){
        if(String(value).includes('NaN')&&window.__nanWrites.length<8){
          window.__nanWrites.push({
            el:this.tagName+'.'+((this.getAttribute&&this.getAttribute('class'))||''),
            name:name, value:String(value),
            stack:(new Error().stack||'').split('\n').slice(1,10)
              .map(s=>s.trim().replace(/https?:\/\/[^/]+/,'')).join(' <- '),
          });
        }
        return setAttr.call(this,name,value);
      };
    });
    const page=await ctx.newPage(); const errs=[]; let where='boot';
    page.on('crash',()=>errs.push(`[${where}] the renderer crashed (out of memory or /dev/shm)`));
    page.on('pageerror',e=>errs.push(`[${where}] ${e.message}`));
    page.on('response',r=>{if(r.status()>=500)errs.push(`[${where}] HTTP ${r.status()} ${r.request().method()} ${r.url().replace(BASE,'')}`);});
    page.on('console',m=>{if(m.type()==='error'&&!/401|Failed to load resource/.test(m.text()))errs.push(`[${where}] console: ${m.text().slice(0,140)}`);});
    await page.goto(BASE+'/',{waitUntil:'domcontentloaded'}); await page.waitForSelector('#lock-password',{state:'visible',timeout:20000});
    //: Wait for the unlock itself, not a fixed 2.5 s: on a loaded machine it took 5.8 s at 390, and the retry below then typed into a field mid-unlock and timed out (Brief 87).
    await page.fill('#lock-password',PW); await page.click('#lock-submit'); await page.waitForFunction(()=>!document.getElementById('lock-password')?.offsetParent,null,{timeout:20000}).catch(()=>{});
    if(await page.$('#lock-password')&&await page.isVisible('#lock-password')){await page.fill('#lock-password',PW);await page.click('#lock-submit');await page.waitForTimeout(2500);}
    await page.evaluate(()=>{const o=document.getElementById('onboarding-overlay');if(o)o.classList.add('hidden');}); await page.waitForTimeout(500);
    const findings=[];
    const check=async(label)=>{const r=await page.evaluate(()=>{const vis=e=>e.checkVisibility&&e.checkVisibility({visibilityProperty:true,opacityProperty:true,contentVisibilityAuto:true});const over=document.documentElement.scrollWidth>window.innerWidth+1;const clipped=[...document.querySelectorAll('.card, .tab-page:not(.hidden) button, .tab-page:not(.hidden) h2, .tab-page:not(.hidden) h3')].filter(e=>vis(e)&&/^(hidden|clip)$/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+2&&!e.matches('textarea, .tab-page, [class*="scroll"], .entry-list, ul, ol')).slice(0,4).map(e=>`${e.tagName.toLowerCase()}#${e.id}.${[...e.classList].slice(0,2).join('.')} ${e.scrollHeight}>${e.clientHeight}`);const inStrip=e=>{for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const o=getComputedStyle(p).overflowX;if((o==='auto'||o==='scroll')&&p.scrollWidth>p.clientWidth+1)return true;}return false;};const off=[...document.querySelectorAll('.tab-page:not(.hidden) button, .tab-page:not(.hidden) input')].filter(e=>vis(e)&&!inStrip(e)).filter(e=>{const r=e.getBoundingClientRect();return r.right>window.innerWidth+1||r.left<-1;}).slice(0,4).map(e=>`${e.tagName.toLowerCase()}#${e.id}.${[...e.classList].slice(0,2).join('.')}`);return {over,clipped,off};});
      if(r.over)findings.push(`[${label}] page scrolls horizontally`); if(r.clipped.length)findings.push(`[${label}] clipped: ${r.clipped.join(', ')}`); if(r.off.length)findings.push(`[${label}] off-screen: ${r.off.join(', ')}`);};
    try{
    for(const t of TABS){where=t; await page.evaluate((name)=>{try{switchTab(name);}catch(e){}},t); await page.waitForTimeout(700);
      const shown=await page.evaluate((name)=>{const el=document.getElementById('tab-'+name);return el?!el.classList.contains('hidden'):null;},t);
      if(shown===false){findings.push(`[${t}] the tab did not open, so nothing here was checked`); continue;}
      await check(t);
      for(const s of (SUBTABS[t]||[])){where=t+'/'+s; const ok=await page.click(`#tab-${t} [data-section="${s}"], #tab-${t} [data-view="${s}"]`,{timeout:1500}).then(()=>true).catch(()=>false); if(!ok)continue; await page.waitForTimeout(500); await check(where);}}
    where='settings'; await page.click('#settings-btn').catch(()=>{}); await page.waitForTimeout(500);
    for(const s of SECTIONS){where='settings/'+s; const ok=await page.click(`#settings-modal [data-section="${s}"]`,{timeout:1500}).then(()=>true).catch(()=>false); if(!ok)continue; await page.waitForTimeout(300);
      const r=await page.evaluate(()=>{const m=document.querySelector('#settings-modal .settings-section:not(.hidden), #settings-modal .settings-body');return m?(m.scrollWidth>m.clientWidth+2?`section scrolls sideways ${m.scrollWidth}>${m.clientWidth}`:''):'';}); if(r)findings.push(`[${where}] ${r}`);}
    }catch(e){ findings.push(`[${where}] the run stopped here: ${String(e.message||e).split('\n')[0].slice(0,160)}`); process.exitCode=1; }
    const nanWrites=await page.evaluate(()=>window.__nanWrites||[]).catch(()=>[]);
    console.log(`== ${width}px: ${errs.length} errors, ${findings.length} layout findings`);
    for(const hit of nanWrites){
      console.log(`  NaN written: ${hit.el} ${hit.name}="${hit.value}"`);
      console.log(`    ${hit.stack}`);
    } errs.forEach(e=>console.log('  '+e)); findings.forEach(f=>console.log('  '+f));
    await ctx.close();
  }
}
