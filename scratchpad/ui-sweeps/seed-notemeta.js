// Seed notes whose details lines span the cases INBOX 455 (1) names: no tags,
// one, three, eight and twelve tags, dates the note mentions, long tags.
// Run once per data dir. SQLITE=<db> then also sets a filing score and open
// suggestions on some, which the API does not take.
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  const r=await page.evaluate(async()=>{
    const notes=[
      ["# Weekly review\n\nShipped the sweep tooling; next the skills reform.",["work","planning","q4","review","sweeps","tooling","skills","reform"]],
      ["Call the dentist on Thursday about the retainer, then the pharmacy tomorrow.",["personal","health"]],
      ["# Reading list\n\n- Thinking in Systems\n- The Design of Everyday Things",[]],
      ["Idea: a mindmap mode on the whiteboard where a node can be a real note.",["ideas","memorymap","whiteboard","mindmap","nodes","design","product","later","research","prototype","ux","interaction"]],
      ["Meeting with Sam: agreed the Q4 plan, review next Friday.",["work","meetings","q4"]],
      ["Recipe: tomato soup, roast the tomatoes first.",["cooking"]],
      ["# Sprint retro\n\nWhat went well: measuring before changing.",["work","retro","engineering-practices","measurement-before-change","team"]],
      ["Remember to renew the passport before March.",["personal","admin","travel","documents"]],
      ["A short note with nothing else.",["a"]],
      ["Book the train for the conference next Monday and the hotel tomorrow.",["travel","conference","booking","train","hotel","work","expenses"]],
    ];
    const out=[];
    for(const [content,tags] of notes){try{const x=await apiJson('/entries',{method:'POST',body:JSON.stringify({content,tags})});out.push(x.id);}catch(e){out.push(String(e).slice(0,80));}}
    return out;
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
