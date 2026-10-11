// pill-toggle (switch) sweeps, consolidated: one async function per case.
// Run one case by name, or every case in order with no argument:
//   node scratchpad/ui-sweeps/switchdepth2.js switchalign

// For every Settings section: each visible switch row's switch left edge
// against its group's content edge (the group's padding box), and the same
// for the group head. Reports the distribution of offsets.
//   BASE=... W=1440 node switchdepth2.js switchalign
async function switchalign() {
  const { boot } = require('./lib.js');
  const W = +(process.env.W || 1440);
  const SECTIONS = 'general,preferences,appearance,account,privacy,capture,ask,browse,list,outline,models,tools,skills,personas,templates,memory,learned,tasks,writing-room,websearch,searchindex,extras,data,logs,about'.split(',');
    const touch = W < 600 ? { hasTouch: true, isMobile: true } : {};
    const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...touch });
    const dist = {};
    const samples = {};
    for (const s of SECTIONS) {
      await page.evaluate((x) => openSettingsModal(x), s);
      await page.waitForTimeout(700);
      const rows = await page.evaluate(() => {
        const out = [];
        for (const inp of document.querySelectorAll('#settings-modal .settings-section:not(.hidden) input[type="checkbox"]')) {
          if (!inp.offsetParent) continue;
          const row = inp.closest('label');
          const g = inp.closest('.settings-group, details.settings-fold');
          if (!row || !g) continue;
          const gr = g.getBoundingClientRect();
          const gs = getComputedStyle(g);
          const edge = gr.left + parseFloat(gs.borderLeftWidth) + parseFloat(gs.paddingLeft);
          const ir = inp.getBoundingClientRect();
          if (ir.width < 20) continue;
          out.push({ off: Math.round(ir.left - edge), cls: row.className.split(' ').slice(0, 2).join('.'), pad: getComputedStyle(row).paddingLeft });
        }
        return out;
      });
      for (const r of rows) {
        const k = `${r.off}px ${r.cls} pad=${r.pad}`;
        dist[k] = (dist[k] || 0) + 1;
        (samples[k] = samples[k] || new Set()).add(s);
      }
    }
    for (const [k, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(4), k, '  in', [...samples[k]].slice(0, 8).join(','));
    await browser.close();
}

// Each switch row's visible top hairline (border or inset background line)
// against its group head's underline: left/right overhang in px.
async function switchdivider() {
  const {boot}=require('./lib.js');
  const W = +(process.env.W||1440);
  const SECTIONS = 'general,preferences,appearance,account,capture,ask,browse,list,outline,models,tools,skills,personas,templates,memory,learned,tasks,writing-room,websearch,searchindex,extras,data,logs,about'.split(',');
    const mob = W<600 ? {hasTouch:true,isMobile:true}:{};
    const {browser,page}=await boot({viewport:{width:W,height:W<600?844:900},...mob});
    const dist={};
    for (const s of SECTIONS) {
      await page.evaluate(x=>openSettingsModal(x), s); await page.waitForTimeout(600);
      const rows = await page.evaluate(()=>{
        const out=[];
        const vis=(c)=>c && c!=='rgba(0, 0, 0, 0)' && c!=='transparent';
        for (const row of document.querySelectorAll('#settings-modal .settings-section:not(.hidden) label:is(.check-row,.setting-check)')) {
          if (!row.offsetParent) continue;
          const g=row.closest('.settings-group'); if (!g) continue;
          const head=[...g.children].find(c=>c.matches('h3:not(.flush),h4:not(.flush),.help-head'));
          if (!head) continue;
          const hr=head.getBoundingClientRect();
          const cs=getComputedStyle(row), rr=row.getBoundingClientRect();
          let l=null, r=null;
          if (parseFloat(cs.borderTopWidth)>0 && vis(cs.borderTopColor)) { l=rr.left; r=rr.right; }
          else if (cs.backgroundImage.includes('gradient')) {
            // background-size first value
            const w=cs.backgroundSize.split(' ')[0];
            let px = w.endsWith('px') ? parseFloat(w) : null;
            const m = cs.backgroundSize.match(/calc\(100% - ([\d.]+)px\)/); if (m) px = rr.width - parseFloat(m[1]);
            if (px!=null) { l=rr.left+(rr.width-px)/2; r=l+px; }
          }
          if (l==null) continue;
          out.push((true?row.className+' '+row.parentElement.tagName+'.'+row.parentElement.className+' ':'')+`${Math.round((hr.left-l)*10)/10}/${Math.round((r-hr.right)*10)/10}`);
        }
        return out;
      });
      for (const k of rows) { dist[k]=(dist[k]||0)+1; }
    }
    console.log(W, process.env.THEME||'light', 'overhang left/right px -> rows:', JSON.stringify(dist));
    await browser.close();
}

const CASES = {
  switchalign,
  switchdivider,
};
const names = process.argv.slice(2);
const unknown = names.filter((n) => !Object.prototype.hasOwnProperty.call(CASES, n));
if (unknown.length) {
  console.error(`unknown case: ${unknown.join(", ")}`);
  console.error(`cases: ${Object.keys(CASES).join(", ")}`);
  process.exit(2);
}
(async () => {
  for (const name of names.length ? names : Object.keys(CASES)) await CASES[name]();
})();
