// The notes flow by keyboard alone (WCAG 2.1.1 and 2.4.3, INBOX 433): skip
// link, Capture, Ctrl+Enter, the list's keys, F2 into the editor, Escape back
// to the row, the category chip, the chooser by arrows, and where the focus
// lands after each. Prints ok or FAIL per step with what held the focus.
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/notekeys.js
const {boot}=require('./lib.js');
(async()=>{const {browser,page}=await boot({viewport:{width:1440,height:900}});
const log=[]; const step=async(name,fn)=>{try{const r=await fn(); log.push(`${r===false?'FAIL':'ok  '} ${name}${typeof r==='string'?': '+r:''}`);}catch(e){log.push(`FAIL ${name}: ${e.message.slice(0,120)}`);}};
const focused=()=>page.evaluate(()=>{const e=document.activeElement;return e?`${e.tagName.toLowerCase()}#${e.id}.${[...e.classList].slice(0,2).join('.')} "${(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,40)}"`:'none';});
await page.evaluate(()=>switchTab('notes')); await page.waitForTimeout(800);
await step('skip link then Tab reaches the notes tab', async()=>{await page.evaluate(()=>{const b=document.createElement('button');document.body.prepend(b);b.focus();b.remove();}); await page.keyboard.press('Tab'); const f=await focused(); await page.keyboard.press('Enter'); await page.waitForTimeout(300); return f+' -> '+await focused();});
await step('Capture: focus the box by keyboard', async()=>{await page.click('#tab-notes [data-section="capture"]'); await page.waitForTimeout(800); await page.evaluate(()=>document.getElementById('entry-content').focus()); await page.waitForTimeout(500); return await focused();});
await step('type and Ctrl+Enter saves', async()=>{const before=await page.evaluate(()=>allEntries.length); await page.keyboard.type('Keyboard only note about tomatoes'); await page.keyboard.press('Control+Enter'); await page.waitForTimeout(2000); const after=await page.evaluate(()=>allEntries.length); return after>before?`${before}->${after}, focus ${await focused()}`:false;});
await step('Browse: list keyboard nav', async()=>{await page.click('#tab-notes [data-section="browse"]'); await page.waitForTimeout(800); await page.evaluate(()=>document.querySelector('#entry-list > li')?.focus()); await page.keyboard.press('ArrowDown'); await page.keyboard.press('End'); await page.keyboard.press('Home'); return await focused();});
await step('F2 opens the editor', async()=>{await page.keyboard.press('F2'); await page.waitForTimeout(800); return await focused();});
await step('Escape closes it, focus back on the row', async()=>{await page.keyboard.press('Escape'); await page.waitForTimeout(600); return await focused();});
await step('Tab to category chip, Enter opens chooser', async()=>{for(let i=0;i<12;i++){await page.keyboard.press('Tab'); const f=await focused(); if(/Category .*: change/.test(f)) break;} const f=await focused(); if(!/Category/.test(f)) return false; await page.keyboard.press('Enter'); await page.waitForTimeout(700); return f+' -> '+await focused();});
await step('Arrow and Enter choose a category', async()=>{const open=await page.evaluate(()=>!!document.querySelector('.sheet-overlay[data-sheet="note-category"]')); if(!open) return 'sheet already closed (Enter leaked)'; await page.keyboard.press('ArrowDown'); log.push('     on: '+await focused()); await page.keyboard.press('Enter'); await page.waitForTimeout(1200); return await page.evaluate(()=>document.querySelector('#toast-box')?.textContent.trim().slice(0,80)||'no toast');});
await step('focus after the move', async()=>await focused());
console.log(log.join('\n')); await browser.close();})();
