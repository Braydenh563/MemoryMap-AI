// Every dialog's head, shown one at a time: is the title on one centre line
// with the head's buttons (within 1px), are the buttons one size, is the
// head the recipe (`.dialog-head` or the sheet's `.sheet-head`), and is the
// gap under the head at least one spacing step. W=1093|1440|390.
//   BASE=... W=1440 SCRATCH=.. node dialogheads.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1093);
(async()=>{
  const {browser,page}=await boot({viewport:{width:W,height:W<600?844:(W>=1440?900:614)}});
  const ids=await page.evaluate(()=>[...document.querySelectorAll('.modal-overlay[id], dialog[id]')].map(e=>e.id));
  const rows=[];
  for(const id of ids){
    const r=await page.evaluate(async(id)=>{
      const ov=document.getElementById(id);
      const wasHidden=ov.classList.contains('hidden');
      if(ov.tagName==='DIALOG'){ try{ ov.show(); }catch(e){ return null; } } else ov.classList.remove('hidden');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const card=ov.querySelector('.modal-card, .card, form')||ov;
      const title=card.querySelector('.dialog-head-title, .sheet-title, h2, h3');
      if(!title||!title.checkVisibility()){ if(ov.tagName==='DIALOG') ov.close(); else if(wasHidden) ov.classList.add('hidden'); return null; }
      const head=title.closest('.dialog-head, .sheet-head, .row, header, div')||title.parentElement;
      const btns=[...head.querySelectorAll('button')].filter(b=>b.checkVisibility());
      const c=(el)=>{const b=el.getBoundingClientRect(); return (b.top+b.bottom)/2;};
      const tc=c(title);
      const off=btns.map(b=>Math.abs(c(b)-tc)).reduce((a,v)=>Math.max(a,v),0);
      const sizes=[...new Set(btns.map(b=>Math.round(b.getBoundingClientRect().height)))];
      const next=head.nextElementSibling; const gap=next&&next.checkVisibility()?Math.round(next.getBoundingClientRect().top-head.getBoundingClientRect().bottom):null;
      const recipe=head.matches('.dialog-head, .sheet-head');
      if(ov.tagName==='DIALOG') ov.close(); else if(wasHidden) ov.classList.add('hidden');
      return `${id.padEnd(28)} recipe=${recipe?'yes':'NO '} centre-off=${off.toFixed(1)}px buttons=${btns.length} sizes=${sizes.join('/')} gap-under=${gap}`;
    },id);
    if(r) rows.push(r);
  }
  console.log(rows.join('\n'));
  await browser.close();
})();
