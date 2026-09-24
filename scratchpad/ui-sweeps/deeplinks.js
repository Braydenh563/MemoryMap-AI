// Every catalogue row, run, and checked for landing on what it names.
//
// The owner, 2026-09-24: "I clicked on the "suggested links" option in the
// tools and features panel and all it did was take me to the graph page, it
// didnt actually open the menu option for suggested links in the graph like it
// should have." `tests/test_catalogue_reveal.py` proves statically that every
// row declares where it goes and that every target names a real control; this
// is the half that needs a browser: it runs each row the way a click does and
// then asks whether the control it names is on screen.
//
// Rows come from the app itself (`featureCatalog()`, the AI tool rows the
// features dialog builds from `/chat/tools`, and `paletteCommands()`, which
// is also Find anything's list of actions), so a row added later is swept
// without anyone editing this file.
//
// Per row: every overlay closed, the Dashboard showing (so a row has to take
// you somewhere to pass), then `row.run()`. Verdicts:
//   pass      the named control is visible (and ringed, where the target rings)
//   fallback  the feature needs something this notebook lacks (a board with a
//             selection, a readable file) and the control that makes it was
//             ringed instead
//   fail      neither
//   tab       a row that names a tab, and the tab is showing (fail otherwise)
//   act       a command with no place to land (zoom, the theme, lock, a
//             download); not run, since running it changes the session
//
//   BASE=http://127.0.0.1:8789 node scratchpad/ui-sweeps/deeplinks.js
//   WIDTH=390 THEME=dark ...   (a phone width, the dark theme)
//   ONLY="Suggested links"     (one row, by name or label substring)
const {boot}=require('./lib.js');

const WIDTH=Number(process.env.WIDTH||1440);
const phone=WIDTH<600;

(async()=>{
  const {browser,page}=await boot({
    viewport:{width:WIDTH,height:phone?844:900},
    ...(phone?{hasTouch:true,isMobile:true}:{}),
  });

  // The pointer out of the way. Playwright leaves its mouse where the login
  // press was, mid-window, and a sheet that slides up under it fires
  // mouseenter on whatever menu group lands there, which opened that group
  // and closed the one the row had opened (measured: Threads at 390). A
  // touch screen has no resting pointer, so this is the phone as it is.
  await page.mouse.move(0, 0);

  // The notebook a row needs to have something to land on: notes, a
  // document, a board and a map. Created once; the data dir is the sweep's own.
  await page.evaluate(async()=>{
    const notes=await apiJson('/entries?limit=5').catch(()=>[]);
    if(!(notes.items||notes).length) await apiJson('/entries/seed-examples',{method:'POST'}).catch(()=>null);
    const docs=await apiJson('/documents').catch(()=>[]);
    if(!(docs.items||docs).length) await apiJson('/documents',{method:'POST',body:JSON.stringify({title:'Sweep document',content:'# First heading\n\nSome words to find.\n'})}).catch(()=>null);
    const boards=await apiJson('/whiteboard/boards').catch(()=>[]);
    if(!boards.some((b)=>b.id!=null&&b.type!=='map')) await apiJson('/whiteboard/boards',{method:'POST',body:JSON.stringify({name:'Sweep board'})}).catch(()=>null);
    if(!boards.some((b)=>b.type==='map')) await apiJson('/whiteboard/boards',{method:'POST',body:JSON.stringify({name:'Sweep map',type:'map'})}).catch(()=>null);
  });

  // The rows, as the three lists produce them. The features dialog fetches
  // its AI tool rows on open, so it is opened once to get them.
  await page.evaluate(()=>openFeatures());
  await page.waitForTimeout(1500);
  const rows=await page.evaluate(()=>{
    const out=[];
    for(const group of featureCatalog()) for(const item of group.items) out.push({list:'features',name:item.name,tab:item.tab,reveal:item.reveal,arg:item.arg,act:Boolean(item.act)});
    for(const tool of (featureAiTools||[])) out.push({list:'features',name:tool.name.replace(/_/g,' '),reveal:'ai-tool',arg:tool.name});
    for(const cmd of paletteCommands()) out.push({list:'palette',name:cmd.label.replace(/^ph:[\w-]+\s*/,''),tab:cmd.tab,reveal:cmd.reveal,act:Boolean(cmd.act)||(!cmd.tab&&!cmd.reveal)});
    closeFeatures();
    return out;
  });
  const only=process.env.ONLY||'';

  const results=[];
  for(const row of rows){
    if(only && !row.name.includes(only)) continue;
    if(row.act){ results.push({...row,verdict:'act'}); continue; }
    const verdict=await page.evaluate(async(row)=>{
      const sleep=(ms)=>new Promise((r)=>setTimeout(r,ms));
      // Everything open is closed: a static overlay is hidden, one built at
      // runtime (no id) removed, a <dialog> closed, a sheet dismissed, a
      // <details> menu shut.
      // A sheet is closed with its own button, never removed: the phone's
      // sheets borrow static elements (the reminder form, the chat's How it
      // answers panel), and removing the sheet took them out of the page
      // for every row after it (a first run's "Go to Reminders" threw on a
      // missing form, and chatDockMoreOpen on a missing panel).
      for(const sheet of document.querySelectorAll('[data-sheet]')){
        const close=sheet.querySelector('.sheet-head button');
        if(close) close.click();
      }
      await sleep(60);
      for(const el of document.querySelectorAll('.modal-overlay, dialog[open], .lock-overlay.command-palette-overlay')){
        if(el.id==='lock-overlay' || el.matches('[data-sheet]')) continue;
        if(el.close){ el.close(); continue; }
        if(el.id) el.classList.add('hidden'); else el.remove();
      }
      document.getElementById('settings-modal')?.classList.add('hidden');
      document.getElementById('global-find-bar')?.classList.add('hidden');
      document.getElementById('palette-overlay')?.classList.add('hidden');
      for(const d of document.querySelectorAll('details[open]')) d.open=false;
      try{ closeActionMenus(); }catch{}
      try{ if(typeof graphSheetClose==='function') graphSheetClose(); }catch{}
      await switchTab('dashboard');
      await sleep(120);
      const find=()=>{
        if(row.tab) return null;
        let target=REVEAL_TARGETS[row.reveal];
        if(!target && row.reveal.startsWith('settings:')){
          const s=row.reveal.slice(9); target={el:`settings-${s}`,flash:false};
        }
        if(!target) return {missing:true};
        const sel=(target.sel||'').replace('{arg}',row.arg||'');
        const el=target.el?document.getElementById(target.el):revealQuery(sel,target.text);
        return {el, target};
      };
      let landed;
      try{
        landed=await Promise.race([
          (row.tab?switchTab(row.tab):revealFeature(row.reveal,row.arg||'')),
          sleep(7000).then(()=>'timeout'),
        ]);
      }catch(e){ return {verdict:'fail',why:'threw: '+String(e).slice(0,100)}; }
      await sleep(250);
      if(row.tab){
        let active='';
        try{ active=localStorage.getItem('activeTab')||''; }catch{}
        return {verdict: active===row.tab?'tab':'fail', why: active===row.tab?'':`on ${active}`};
      }
      const f=find();
      if(f.missing) return {verdict:'fail',why:'no such target'};
      const visible=Boolean(f.el&&f.el.getClientRects().length);
      const ringed=Boolean(document.querySelector('.feature-reveal'));
      if(visible && landed!==false){
        if(f.target.flash!==false && !ringed) return {verdict:'fail',why:'visible but not ringed'};
        return {verdict:'pass'};
      }
      if(landed===false && ringed) return {verdict:'fallback',why:`rang #${document.querySelector('.feature-reveal').id||document.querySelector('.feature-reveal').className}`};
      return {verdict:'fail',why: landed==='timeout'?'timed out':(f.el?'not visible':'not in the page')};
    },row);
    results.push({...row,...verdict});
    if(only) console.log(JSON.stringify({...row,...verdict}));
  }

  const count=(v)=>results.filter((r)=>r.verdict===v).length;
  const theme=process.env.THEME||'light';
  console.log(`deeplinks ${WIDTH} ${theme}: rows=${results.length} pass=${count('pass')} tab=${count('tab')} fallback=${count('fallback')} fail=${count('fail')} act=${count('act')}`);
  for(const r of results.filter((r)=>r.verdict==='fail'||r.verdict==='fallback')){
    console.log(`  ${r.verdict.toUpperCase()} [${r.list}] ${r.name} (${r.reveal||r.tab}): ${r.why||''}`);
  }
  if(process.env.VERBOSE) for(const r of results) console.log(`  ${r.verdict} [${r.list}] ${r.name}`);
  await browser.close();
})();
