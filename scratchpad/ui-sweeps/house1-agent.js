// Ledger 1553: the agent panel with no model, disabled controls by count.
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1440,height:900}});
  await page.waitForTimeout(3000);
  await page.evaluate(()=>toggleAgentPalette());
  await page.waitForTimeout(1500);
  const r=await page.evaluate(()=>{
    const root=document.getElementById('command-palette-overlay')||document.body;
    const vis=[...root.querySelectorAll('button,input,select,textarea')].filter(e=>e.offsetParent!==null||getComputedStyle(e).position==='fixed');
    const dis=vis.filter(e=>e.disabled||e.getAttribute('aria-disabled')==='true');
    return {shown:vis.length,disabled:dis.length,open:getComputedStyle(root).display,
      disabledNoTitle:dis.filter(e=>!(e.title||e.getAttribute('aria-label'))).length,
      sample:dis.slice(0,4).map(e=>(e.textContent||e.id).trim().slice(0,30)+'|'+(e.title||'').slice(0,40))};
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
