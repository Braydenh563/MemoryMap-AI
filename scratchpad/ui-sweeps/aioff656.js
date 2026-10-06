// INBOX 656: the AI status dot with no model connected (level off, the slashed sparkle): its box, the glyph's box and colours,
// and a clip per theme and width for scratchpad/ui-sweeps/aioff656.py (contrast).  BASE=... THEME=dark W=390 SC=2 node aioff656.js
const {boot, OUT}=require('./lib.js');
const OUTD=OUT;
(async()=>{
 const w=+(process.env.W||1440);
 const {browser,page}=await boot({viewport:{width:w,height:900},scale:+(process.env.SC||2), ...(w<600?{isMobile:true,hasTouch:true}:{})});
 await page.waitForTimeout(1500);
 const r=await page.evaluate(()=>{
  const b=document.getElementById('ai-status'); const d=b.querySelector('.ai-status-dot');
  const cs=getComputedStyle(b), ds=getComputedStyle(d), ds2=getComputedStyle(d,'::before'), da=getComputedStyle(d,'::after');
  const rect=(e)=>{const q=e.getBoundingClientRect();return [Math.round(q.x),Math.round(q.y),Math.round(q.width),Math.round(q.height)];};
  const notes=document.getElementById('status-notes');
  return {level:b.dataset.level,label:document.getElementById('ai-status-label').textContent, name: b.getAttribute('aria-label'), btn:rect(b), dot:rect(d), color:cs.color,bg:cs.backgroundColor, dotClass:d.className, before:ds2.content, beforeFont: ds2.fontSize, after: da.content, title:document.getElementById('ai-status-title').textContent,
   notes: notes.innerHTML.slice(0,300), notesRect: rect(notes), notesColor:getComputedStyle(notes).color, visible: b.offsetParent!==null, barBg:getComputedStyle(document.getElementById('status-bar')).backgroundColor};
 });
 console.log(JSON.stringify(r,null,1));
 const b=await page.$('#ai-status');
 if (b && r.visible) { const bb=await b.boundingBox(); await page.screenshot({path:`${OUTD}/st-${process.env.THEME||'light'}-${w}.png`,clip:{x:bb.x-4,y:bb.y-4,width:bb.width+8,height:bb.height+8}}); }
 await browser.close();
})();
