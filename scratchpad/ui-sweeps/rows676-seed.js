// Seed for rows676.js (INBOX 676): notes with links, tags, a category and a
// date the note mentions, so a compact row carries every kind of metadata.
//   BASE=http://127.0.0.1:8822 SCRATCH=... node rows676-seed.js
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot();
  const r=await page.evaluate(async()=>{
    const notes=[
      ["# Release checklist\n\nSee https://example.com/release-notes and https://example.org/changelog before Friday. Then tag the build, write the announcement and check the installer on a clean machine.\n\nSecond paragraph so the expanded row has real height to animate through.\n\nThird paragraph with more words in it to be sure.",["work","release","q4"],"Work"],
      ["https://example.com/a-long-link-that-runs-on and a note under it about the meeting next Tuesday.",["links","reading"],"Reading"],
      ["# Dentist\n\nCall the dentist on Thursday about the retainer.",["personal","health"],"Personal"],
      ["Idea: a mindmap mode on the whiteboard where a node can be a real note. More text here so the row truncates its preview on a wide screen and the snippet is long enough to ellipsise.",["ideas","whiteboard","mindmap","design"],"Ideas"],
      ["A short note with nothing else.",[],null],
    ];
    const out=[];
    for(const [content,tags,category] of notes){try{const x=await apiJson('/entries',{method:'POST',body:JSON.stringify({content,tags,category})});out.push(x.id);}catch(e){out.push(String(e).slice(0,80));}}
    // Links between notes, so an expanded row shows its link chips.
    for(const [a,b] of [[out[1],out[0]],[out[1],out[2]],[out[0],out[3]]]){try{await apiJson(`/entries/${a}/links`,{method:'POST',body:JSON.stringify({target_id:b})});}catch(e){out.push('link '+String(e).slice(0,60));}}
    return out;
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
