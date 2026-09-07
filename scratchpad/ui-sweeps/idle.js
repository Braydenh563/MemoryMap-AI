// PLAN P1's gate: requests in 60s idle on the Dashboard, by path. Also 60s
// with the tab hidden (visibilityState faked), so the back-off is measured
// rather than read.
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  await page.click('[data-tab="dashboard"]');await page.waitForTimeout(1500);
  const count=async(label,ms)=>{const before=await page.evaluate(()=>performance.getEntriesByType('resource').length);await page.waitForTimeout(ms);const r=await page.evaluate((before)=>{const rs=performance.getEntriesByType('resource').slice(before);const by={};for(const e of rs){const p=new URL(e.name).pathname;by[p]=(by[p]||0)+1;}return by;},before);const total=Object.values(r).reduce((a,b)=>a+b,0);console.log(`${label}: ${total} requests in ${ms/1000}s ${JSON.stringify(r)}`);};
  await count('foreground', 60000);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await count('hidden', 60000);
  await browser.close();
})();
