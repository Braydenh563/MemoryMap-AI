// The chat tab's Web panel, measured (INBOX: "the web browser sidebar needs a
// major improved modern and professional redesign"). The sandbox has no
// SearXNG and no network, so every /websearch route is stubbed with
// realistic results and a reader page; what is measured is the panel's own
// layout, not a search engine.
//
//   BASE=http://127.0.0.1:8790 THEME=dark node scratchpad/ui-sweeps/webpanel.js
//
// Per width (the panel's minimum, its default and its maximum at 1440) and
// per state (empty with recent searches, results, reader):
//   head    controls in the header rows, their distinct radii and heights
//   over    elements inside the panel that run past its right edge
//   scroll  boxes inside the panel that scroll (one is the pane itself)
//   fit     results wholly visible without scrolling
//   low     text below WCAG AA inside the panel (computed colours)
// Exits non-zero on overflow, low contrast, or a nested scroller in the reader.
const {boot}=require('./lib.js');
const DOMAINS=['arxiv.org','sqlite.org','inkandswitch.com','calm.design','alexgarcia.xyz','plg.uwaterloo.ca'];
const TITLES=[
  'Retrieval-augmented generation for knowledge-intensive NLP tasks',
  'SQLite FTS5 extension: full-text search with bm25 ranking',
  'How local-first software keeps your data yours',
  'Designing calm interfaces: a field guide for desktop apps',
  'Vector search without a server: sqlite-vec in practice',
  'Reciprocal rank fusion outperforms Condorcet and individual rank learning',
];
const RESULTS=Array.from({length:12},(_,i)=>({
  title:TITLES[i%6],
  url:`https://${DOMAINS[i%6]}/page/${i}`,
  domain:DOMAINS[i%6],
  snippet:'Large pre-trained language models store factual knowledge in their parameters, but their ability to access and precisely manipulate that knowledge is still limited, so we combine them with a retriever.',
  via:i%2?['google','bing']:['duckduckgo'],
  engine:'searxng',
}));
const PAGE={url:'https://inkandswitch.com/local-first/',domain:'inkandswitch.com',
  title:'Local-first software: you own your data, in spite of the cloud',
  words:5400,read_minutes:24,
  text:'Cloud apps like Google Docs and Trello are popular because they enable real-time collaboration.',
  blocks:[
    {type:'p',text:'Cloud apps like Google Docs and Trello are popular because they enable real-time collaboration with colleagues, and they make it easy for us to access our work from all of our devices.'},
    {type:'heading',level:2,text:'Motivation: collaboration and ownership'},
    {type:'p',text:'It is amazing how easily we can collaborate online nowadays. We use Google Docs to collaborate on documents, spreadsheets and presentations; in Figma we work together on user interface designs.'},
    {type:'li',text:'No spinners: your work at your fingertips'},
    {type:'li',text:'Your work is not trapped on one device'},
    {type:'li',text:'The network is optional'},
    {type:'blockquote',text:'We believe that data ownership and real-time collaboration are not at odds with each other.'},
    {type:'heading',level:3,text:'Seven ideals for local-first software'},
    ...Array.from({length:14},(_,i)=>({type:'p',text:`Paragraph ${i+1}. In local-first applications the primary copy of the data lives on the local device, and servers hold secondary copies that assist with synchronisation between devices. The local copy keeps the software fast and private, and it keeps working offline.`})),
    {type:'pre',text:'const doc = Automerge.change(doc, d => { d.title = "Hello" })'},
  ]};
const STATUS={backend:'docker',installing:false,state:'running',responding:true};
let failed=0;

async function stub(page){
  await page.route('**/websearch/searxng/status*',r=>r.fulfill({json:STATUS}));
  await page.route('**/websearch/read*',async r=>{await new Promise(z=>setTimeout(z,150));r.fulfill({json:PAGE});});
  await page.route(/\/websearch\?q=/,async r=>{
    await new Promise(z=>setTimeout(z,Number(process.env.SEARCH_DELAY||300)));
    r.fulfill({json:{query:'q',results:RESULTS,provider:'searxng',
      answered_by:{label:'SearXNG (local)',detail:'Nothing left your machine but the query.'},requested_provider:'auto'}}).catch(()=>{});
  });
}

const measure=(page)=>page.evaluate(()=>{
  const panel=document.getElementById('web-panel');const pr=panel.getBoundingClientRect();
  const vis=(el)=>el.checkVisibility&&el.checkVisibility()&&el.getBoundingClientRect().width>0;
  // The header rows: every control above the status line, the results and
  // the reader. The search field counts as one control whatever is inside it.
  const stop=[...document.querySelectorAll('#web-status, #web-search-history, #web-results > *, #web-reader')].find(vis);
  const stopY=stop?stop.getBoundingClientRect().top:Infinity;
  const ctrls=[...panel.querySelectorAll('button, input')].filter(el=>vis(el)&&el.getBoundingClientRect().bottom<=stopY+1&&!el.closest('#web-search-history, #web-results, #web-reader'));
  const radii=new Set(),heights=new Set();
  for(const c of ctrls){const box=c.closest('.web-search-field')||c;radii.add(getComputedStyle(box).borderTopLeftRadius);heights.add(Math.round(box.getBoundingClientRect().height));}
  let over=0;const overs=[];
  for(const el of panel.querySelectorAll('*')){if(!vis(el)||el.closest('.action-menu'))continue;const r=el.getBoundingClientRect();if(r.right>pr.right+0.5){over++;overs.push(el.id||el.className.toString().split(' ')[0]);}}
  const scrollers=[panel,...panel.querySelectorAll('*')].filter(el=>{if(!vis(el))return false;const cs=getComputedStyle(el);return /(auto|scroll)/.test(cs.overflowY)&&el.scrollHeight>el.clientHeight+1;}).map(el=>el.id||el.className.toString().split(' ')[0]);
  const fit=[...panel.querySelectorAll('.web-result')].filter(el=>{const r=el.getBoundingClientRect();return vis(el)&&r.top>=pr.top&&r.bottom<=pr.bottom;}).length;
  const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
  const parse=(c)=>{if(!c||c==='transparent')return null;const m=c.match(/^rgba?\(([^)]+)\)$/);if(m){const p=m[1].split(/[\s,\/]+/).map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
    const s=c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
    if(s)return {r:Math.round(+s[1]*255),g:Math.round(+s[2]*255),b:Math.round(+s[3]*255),a:s[4]===undefined?1:+s[4]};
    cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=c;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return {r:d[0],g:d[1],b:d[2],a:d[3]/255};};
  const lum=({r,g,b})=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
  const comp=(t,b)=>({r:t.r*t.a+b.r*(1-t.a),g:t.g*t.a+b.g*(1-t.a),b:t.b*t.a+b.b*(1-t.a),a:1});
  const bgOf=(el)=>{const layers=[];let base=null;for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e);if(cs.backgroundImage&&cs.backgroundImage!=='none'&&e!==document.documentElement&&e!==document.body)return null;const c=parse(cs.backgroundColor);if(c&&c.a>0){if(c.a>=0.9){base=c;break;}layers.push(c);}}if(!base)base=parse(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1};let c=base;for(let i=layers.length-1;i>=0;i--)c=comp(layers[i],c);return c;};
  const low=[];let checked=0;
  for(const el of panel.querySelectorAll('*')){
    if(!vis(el))continue;
    const text=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
    if(!text)continue;const cs=getComputedStyle(el);const fg=parse(cs.color);if(!fg)continue;checked++;
    const bg=bgOf(el);if(!bg)continue;const L1=lum(fg),L2=lum(bg);const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    const size=parseFloat(cs.fontSize);const need=(size>=18.66||(parseInt(cs.fontWeight)>=700&&size>=14))?3:4.5;
    if(ratio<need)low.push(`${ratio.toFixed(2)} ${el.tagName.toLowerCase()}${el.id?'#'+el.id:'.'+[...el.classList].join('.')} "${text.slice(0,24)}"`);
  }
  return {w:Math.round(pr.width),head:ctrls.length,ids:ctrls.map(c=>c.id||c.className.toString().split(' ')[0]).join(','),
    radii:[...radii].join(' / '),heights:[...heights].join(' / '),over,overs:overs.slice(0,4).join(','),scroll:scrollers.join(','),fit,checked,low};
});

(async()=>{
  // WIDTH for another window: below 1100 the panel takes the whole of <main>,
  // so the three widths collapse to the one the band gives it.
  const W=Number(process.env.WIDTH||1440);const PHONE=W<600;
  const {browser,page}=await boot({viewport:{width:W,height:PHONE?844:900},hasTouch:PHONE,isMobile:PHONE});
  await stub(page);
  await page.evaluate(()=>{
    prefsCache.web_search_enabled=true;
    localStorage.setItem('webSearchHistory',JSON.stringify(['local-first software','sqlite fts5 bm25','reciprocal rank fusion']));
    switchTab('chat');
  });
  await page.waitForTimeout(600);
  // The maximum is asked of the app rather than recomputed here: it depends on
  // the room <main> leaves the conversation (`webPanelMaxWidth`), and before
  // that existed it was min(900, 0.6 * innerWidth).
  const widths=await page.evaluate(()=>{toggleWebPanel(true);const p=document.getElementById('web-panel');
    const max=typeof webPanelMaxWidth==='function'?webPanelMaxWidth(p):Math.min(WEB_PANEL_MAX,window.innerWidth*0.6);
    return [WEB_PANEL_MIN,null,max];});
  const theme=process.env.THEME||'light';const tag=process.env.TAG||'x';
  for(const w of widths){
    await page.evaluate((w)=>{
      toggleWebPanel(false);
      const p=document.getElementById('web-panel');if(w)applyWebPanelWidth(p,w);else resetWebPanelWidth(p);
      document.getElementById('web-query').value='';document.getElementById('web-results').replaceChildren();
      document.getElementById('web-status').textContent='';document.getElementById('web-reader').classList.add('hidden');toggleWebPanel(true);
    },w);
    await page.waitForTimeout(500);
    const label=w?String(Math.round(w)):'default';
    const e=await measure(page);
    console.log(`[${label}] empty   w=${e.w} head=${e.head} (${e.ids}) radii=${e.radii} heights=${e.heights} over=${e.over} scroll=${e.scroll||'-'} low=${e.low.length}/${e.checked}`);
    await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/web-${tag}-${theme}-${label}-empty.png`});
    await page.fill('#web-query','local-first software');await page.press('#web-query','Enter');await page.waitForTimeout(900);
    const r=await measure(page);
    console.log(`[${label}] results w=${r.w} head=${r.head} radii=${r.radii} heights=${r.heights} over=${r.over}${r.overs?' ('+r.overs+')':''} scroll=${r.scroll||'-'} fit=${r.fit} low=${r.low.length}/${r.checked}`);
    await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/web-${tag}-${theme}-${label}-results.png`});
    await page.evaluate(()=>document.querySelector('.web-result-title').click());await page.waitForTimeout(700);
    const d=await measure(page);
    console.log(`[${label}] reader  w=${d.w} head=${d.head} radii=${d.radii} heights=${d.heights} over=${d.over}${d.overs?' ('+d.overs+')':''} scroll=${d.scroll||'-'} low=${d.low.length}/${d.checked}`);
    for(const l of [...e.low,...r.low,...d.low].slice(0,8))console.log('   low: '+l);
    await page.screenshot({path:`${process.env.SCRATCH||'.'}/shots/web-${tag}-${theme}-${label}-reader.png`});
    if(e.over||r.over||d.over||e.low.length||r.low.length||d.low.length)failed++;
    if(process.env.STRICT&&d.scroll.split(',').filter(Boolean).length>1)failed++;
  }
  await browser.close();
  if(failed){console.log(`FAIL: ${failed} width(s) with overflow, low contrast or a nested scroller`);process.exit(1);}
  console.log('ok');
})();
