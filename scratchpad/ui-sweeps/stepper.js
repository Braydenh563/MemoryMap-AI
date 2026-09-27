// The reminder stepper (DESIGN.md "Stepper"): geometry of both pills and
// their buttons, one row at 1093, wrapping as a unit at 390, the keyboard
// nudge, and the light-mode "Add" against its field. Shots per theme/width.
//   BASE=... THEME=dark W=390 TAG=after SCRATCH=.. node stepper.js
const {boot}=require('./lib.js');
const W=+(process.env.W||1093), H=W<600?844:614, TAG=process.env.TAG||'after', THEME=process.env.THEME||'light';
(async()=>{
  const touch=W<600?{hasTouch:true,isMobile:true}:{};
  const {browser,page}=await boot({viewport:{width:W,height:H},...touch});
  if(W<600){ await page.evaluate(()=>{ if(typeof switchTab==='function') switchTab('reminders'); }); }
  else await page.click('[data-tab="reminders"]');
  await page.waitForTimeout(900);
  await page.evaluate(()=>document.getElementById('reminders-new')?.click()); await page.waitForTimeout(900);
  await page.evaluate(()=>document.querySelector('.stepper-pair')?.scrollIntoView({block:'center'})); await page.waitForTimeout(300);
  const g=await page.evaluate(()=>{
    const R=e=>e.getBoundingClientRect();
    const out=[];
    for(const s of document.querySelectorAll('.stepper')){const r=R(s);const b=[...s.querySelectorAll('button')].map(x=>{const q=R(x);return `${Math.round(q.width)}x${Math.round(q.height)}@${Math.round(q.top)}`;});out.push(`pill ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} btns ${b.join(' ')} unit="${s.querySelector('.stepper-unit').textContent}"`);}
    const qs=document.querySelector('#reminder-presets-menu > summary'); const q=R(qs);
    out.push(`quickset ${Math.round(q.height)}@${Math.round(q.top)}`);
    const add=document.getElementById('reminder-magic-add'), inp=document.getElementById('reminder-magic');
    const ca=getComputedStyle(add), ci=getComputedStyle(inp);
    out.push(`add bg=${ca.backgroundColor} fw=${ca.fontWeight} icon=${getComputedStyle(add.querySelector('i')).color} | field bg=${ci.backgroundColor}`);
    return out;
  });
  console.log(`${W} ${THEME}\n  `+g.join('\n  '));
  const before=await page.evaluate(()=>document.getElementById('reminder-due').value);
  await page.focus('#reminder-due-nudge-up'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Shift+ArrowRight');
  const after=await page.evaluate(()=>[document.getElementById('reminder-due').value, document.getElementById('reminder-due-readout').className]);
  console.log(`  keys: ${before} -> ${after[0]} (expect +1d15m) readout class="${after[1]}"`);
  await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/stepper-${TAG}-${THEME}-${W}.png`});
  await browser.close();
})();
