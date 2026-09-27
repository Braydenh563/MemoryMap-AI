// Seed a fresh data dir for the Atlas wrap-up sweeps: the example notes,
// three categories, a reminder. BASE=http://127.0.0.1:<port> node atlasseed.js
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:614}});
  const out=await page.evaluate(async()=>{
    const r={};
    const json=(body)=>({method:'POST',body:JSON.stringify(body)});
    try{ r.seed=await api('/entries/seed-examples',{method:'POST'}); }catch(e){ r.seed=String(e); }
    for(const name of ['Research','Garden','Travel plans']){
      try{ await apiJson('/categories',json({name})); }catch(e){ r.cat=String(e); }
    }
    try{ r.rem=await apiJson('/reminders',json({text:'Call the plumber',priority:'normal',recurring:'none',due_at:new Date(Date.now()+86400000).toISOString()})); }catch(e){ r.rem=String(e); }
    return r;
  });
  console.log(JSON.stringify(out).slice(0,400));
  await browser.close();
})();
