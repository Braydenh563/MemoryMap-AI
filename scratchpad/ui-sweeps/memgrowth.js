// Row 1661: a long browser session, every surface for MINUTES (default 10),
// sampling the JS heap (CDP Runtime.getHeapUsage after a forced GC), the DOM
// node count and the server's resident memory (SERVER_PID) once per lap.
// BASE=http://127.0.0.1:PORT SERVER_PID=<uvicorn pid> node memgrowth.js
const {boot}=require('./lib.js');
const {execSync}=require('child_process');
const MIN=+(process.env.MINUTES||10), PID=process.env.SERVER_PID;
const rss=()=>{try{return Math.round(+execSync(`ps -o rss= -p ${PID}`).toString().trim()/1024);}catch{return -1;}};
(async()=>{
  const {browser,page}=await boot({viewport:{width:1440,height:900},args:['--js-flags=--expose-gc']});
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.slice(0,90)));
  page.on('crash',()=>{console.log('renderer crashed (OOM-killed by the sandbox cgroup?) after', JSON.stringify(samples.at(-1))); process.exit(3);});
  let samples=[];
  const heap=async()=>{await cdp.send('HeapProfiler.collectGarbage'); const h=await cdp.send('Runtime.getHeapUsage'); return Math.round(h.usedSize/1048576*10)/10;};
  const nodes=()=>page.evaluate(()=>document.getElementsByTagName('*').length);
  const tabs=['dashboard','notes','chat','graph','library','timeline','reminders'];
  const t0=Date.now(); let lap=0;
  samples.push({lap, s:0, heap:await heap(), nodes:await nodes(), rss:rss()});
  while(Date.now()-t0 < MIN*60000){
    lap++;
    for(const t of tabs){ await page.evaluate(x=>switchTab(x),t).catch(()=>{}); await page.waitForTimeout(1500); }
    // open and close a note, a board, Settings and the palette
    await page.evaluate(()=>{const c=document.querySelector('#notes-list .entry-title, .note-card .entry-title'); c&&c.click();}).catch(()=>{});
    await page.waitForTimeout(800); await page.keyboard.press('Escape');
    await page.evaluate(()=>openSettingsModal('privacy')).catch(()=>{}); await page.waitForTimeout(1200); await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k'); await page.waitForTimeout(500); await page.keyboard.press('Escape');
    if(lap%2===0){ await page.evaluate(()=>switchTab('library')); await page.evaluate(async()=>{const r=await apiJson('/whiteboard/boards'); const b=(r.boards||r||[])[0]; if(b&&typeof openWhiteboardBoard==='function') openWhiteboardBoard(b.id);}).catch(()=>{}); await page.waitForTimeout(2500); }
    samples.push({lap, s:Math.round((Date.now()-t0)/1000), heap:await heap(), nodes:await nodes(), rss:rss()});
    console.log(JSON.stringify(samples[samples.length-1]));
  }
  console.log('errors', errs.length, JSON.stringify(errs.slice(0,3)));
  await browser.close();
})();
