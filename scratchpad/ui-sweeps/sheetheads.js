// Sheet heads (`openSheet`): the title's centre against the close's, and
// the title's own bottom margin, for a few real sheets (the new reminder,
// Manage categories, a category split). Target: 0px apart, margin 0.
//   BASE=... W=390 SCRATCH=.. node sheetheads.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1093);
(async()=>{
  const {browser,page}=await boot({viewport:{width:W,height:W<600?844:614}});
  const measure=()=>page.evaluate(()=>{const cards=[...document.querySelectorAll('.sheet-card')].filter(c=>c.checkVisibility()); const card=cards[cards.length-1]; if(!card) return 'no sheet'; const t=card.querySelector('.sheet-title'), x=card.querySelector('.sheet-close'); const c=(e)=>{const b=e.getBoundingClientRect(); return (b.top+b.bottom)/2;}; return `${t.textContent.trim().slice(0,24).padEnd(24)} centre-off=${(c(t)-c(x)).toFixed(1)}px margin-bottom=${getComputedStyle(t).marginBottom} gap-under-head=${(()=>{const h=card.querySelector('.sheet-head'); let n=h.nextElementSibling; while(n&&!n.checkVisibility()) n=n.nextElementSibling; return n?Math.round(n.getBoundingClientRect().top-h.getBoundingClientRect().bottom)+'px ('+n.className.split(' ')[0]+')':'-';})()}`;});
  const close=()=>page.keyboard.press('Escape').then(()=>page.waitForTimeout(400));
  await page.evaluate(()=>{ if(typeof switchTab==='function') switchTab('reminders'); }); await page.waitForTimeout(700);
  await page.evaluate(()=>document.getElementById('reminders-new')?.click()); await page.waitForTimeout(700);
  console.log(await measure()); await close();
  await page.evaluate(()=>openManageCategories()); await page.waitForTimeout(1000);
  console.log(await measure()); await close();
  await page.evaluate(async()=>{ await loadCategories(); await openManageCategories(); const m=[...categoryMeta.values()][0]; splitCategoryFromPanel(m); }); await page.waitForTimeout(1000);
  console.log(await measure());
  await browser.close();
})();
