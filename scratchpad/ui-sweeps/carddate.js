// INBOX 760: a note card's details line sits at the card's bottom edge, the
// same distance up from it on every card in a row, and "ago · edited" keeps
// its space. Per width (1440, 390 touch): for every card the gap
// li.bottom - meta.bottom, grouped by grid row (same li.top), the spread
// within a row and across all cards, the gap between the date's text and the
// " · edited" suffix, and the .is-rows view for the same notes.
//   BASE=http://127.0.0.1:8801 THEME=dark node scratchpad/ui-sweeps/carddate.js
// Seed first: node scratchpad/ui-sweeps/carddate-seed.js. Exit 1 on a miss.
const {boot}=require('./lib.js');
let bad=0;
(async()=>{
  for(const w of [1440,390]){
    const phone=w<600;
    const {browser,page}=await boot({viewport:{width:w,height:900},...(phone?{hasTouch:true,isMobile:true}:{})});
    const measure=(rows)=>page.evaluate((rows)=>{
      switchTab("notes");window.showNotesSection&&showNotesSection("browse");notesViewMode=rows?"rows":"cards";renderEntries();
      return new Promise((res)=>setTimeout(()=>{
        const lis=[...document.querySelectorAll("#entry-list > li[data-id]")];
        res({cols:getComputedStyle(document.getElementById("entry-list")).display,cards:lis.map((li)=>{
          const L=li.getBoundingClientRect(),meta=li.querySelector(":scope > .entry-meta"),M=meta.getBoundingClientRect();
          const d=li.querySelector(".entry-date"),D=d&&d.getBoundingClientRect();
          const ed0=li.querySelector(".entry-edited"),ed=ed0&&getComputedStyle(ed0).display!=="none"?ed0:null;
          return {top:Math.round(L.top+scrollY),h:Math.round(L.height),gap:+(L.bottom-M.bottom).toFixed(1),dateB:D?+(L.bottom-D.bottom).toFixed(1):null,
            editedGap:ed?(()=>{const t=document.createRange();t.selectNodeContents(d.firstChild);const dot=document.createRange();dot.setStart(ed.firstChild,1);dot.setEnd(ed.firstChild,2);return +(dot.getBoundingClientRect().left-t.getBoundingClientRect().right).toFixed(1);})():null,editedText:ed?ed.textContent:null};
        })});
      },1500));
    },rows);
    const cards=await measure(false),rows=await measure(true);
    const byRow={};
    for(const c of cards.cards)(byRow[c.top]=byRow[c.top]||[]).push(c);
    const spread=(a)=>a.length?+(Math.max(...a)-Math.min(...a)).toFixed(1):0;
    const all=cards.cards.map((c)=>c.gap);
    const perRow=Object.values(byRow).map((r)=>spread(r.map((c)=>c.gap)));
    console.log(`${w} ${process.env.THEME||"light"} cards=${cards.cards.length} list=${cards.cols} heights=${cards.cards.map((c)=>c.h)} gaps=${all} worstInRow=${Math.max(0,...perRow)} acrossAll=${spread(all)}`);
    const ed=cards.cards.filter((c)=>c.editedText);
    console.log(`  edited suffix on ${ed.length}: ${ed.slice(0,2).map((c)=>JSON.stringify(c.editedText)+" gap between the time and the dot "+c.editedGap+"px").join("; ")||"none (hidden or no edits)"}`);
    console.log(`  rows view: gaps=${rows.cards.map((c)=>c.gap)} heights=${rows.cards.map((c)=>c.h)}`);
    if(Math.max(0,spread(all))>1)bad++;
    if(!phone&&ed.some((c)=>c.editedGap<2))bad++;
    await browser.close();
  }
  process.exit(bad?1:0);
})();
