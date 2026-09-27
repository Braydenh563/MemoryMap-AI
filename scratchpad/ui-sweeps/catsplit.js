// The Split sheet's two suggestion paths (INBOX 431 (e)): "Suggest by tags"
// and "Ask <AI>" (the utility model reads the notes). With no model running
// the Ask answers with the tags and says why. Prints the buttons, their busy
// state mid-request and the line that comes back; a shot per theme.
//   BASE=... THEME=dark SCRATCH=.. node catsplit.js
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:1093,height:614}});
  await page.evaluate(async()=>{ await loadCategories(); const meta=[...categoryMeta.values()].sort((a,b)=>b.count-a.count)[0]; splitCategoryFromPanel(meta); });
  await page.waitForTimeout(900);
  const buttons=await page.evaluate(()=>[...document.querySelectorAll('.manage-split .confirm-actions button')].map(b=>`${b.textContent.trim()} [${b.getBoundingClientRect().height}px]`));
  console.log('buttons:', buttons.join(' | '));
  const rows=await page.evaluate(()=>[...document.querySelectorAll('.manage-split-note')].map(l=>{const t=l.querySelector('.manage-split-text')||l.querySelector('span'); const c=getComputedStyle(t); return `${Math.round(l.getBoundingClientRect().height)}px clamp=${c.webkitLineClamp} lines=${Math.round(t.clientHeight/parseFloat(c.lineHeight))} chars=${t.textContent.length}`;}));
  console.log('rows:', rows.join(' | '));
  await page.route('**/split/propose*', async (route)=>{ await new Promise(r=>setTimeout(r,600)); await route.continue(); });
  const ask=await page.$('.manage-split .confirm-actions button:nth-child(2)');
  await ask.click();
  await page.waitForTimeout(150);
  const busy=await page.evaluate(()=>{const b=document.querySelector('.manage-split .confirm-actions button:nth-child(2)'); return `${b.disabled} ${b.getAttribute('aria-busy')}`;});
  await page.waitForTimeout(1500);
  const after=await page.evaluate(()=>[document.querySelector('.manage-split .confirm-actions button:nth-child(2)').disabled, document.querySelector('.manage-split-suggestions').innerText.replace(/\s+/g,' ').trim()]);
  console.log(`mid-request disabled/busy: ${busy}; after: disabled=${after[0]} line="${after[1]}"`);
  await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/catsplit-${process.env.THEME||'light'}.png`});
  await browser.close();
})();
