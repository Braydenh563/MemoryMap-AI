const {boot} = require(process.env.SCRATCH + '/lib.js');
(async () => {
  const {browser, page} = await boot();
  const results = {};
  const say = (k, v) => { results[k] = v; };

  // 1. icon-only buttons square (popup close buttons)
  await page.waitForTimeout(600);
  say('1-square-close-buttons', await page.evaluate(()=>{
    const ids=['agent-monitor-close','web-panel-close','timeline-popup-close','graph-popup-close','graph-new-close','doc-find-close','doc-ai-close','wb-library-close','extract-close'];
    let ok=0, bad=[];
    for(const id of ids){ const el=document.getElementById(id); if(!el){bad.push(id+':missing');continue;}
      const undo=[]; let n=el; while(n&&n!==document.body){ if(n.classList&&n.classList.contains('hidden')){n.classList.remove('hidden');undo.push(n);} n=n.parentElement; }
      const r=el.getBoundingClientRect(); if(Math.abs(r.width/r.height-1)<0.06) ok++; else bad.push(`${id}:${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
      undo.forEach(u=>u.classList.add('hidden')); }
    return {ok, bad};
  }));

  // 2. notes kebab centred
  await page.evaluate(()=>{switchTab('notes'); try{showNotesSection('browse');}catch(e){}});
  await page.waitForTimeout(1600);
  say('2-kebab-centred', await page.evaluate(()=>{
    const b=[...document.querySelectorAll('.entry-list button')].find(x=>x.querySelector('i.ph-dots-three'));
    if(!b) return 'no kebab found';
    const br=b.getBoundingClientRect(), ir=b.querySelector('i').getBoundingClientRect();
    return {dx:+((ir.x+ir.width/2)-(br.x+br.width/2)).toFixed(2), dy:+((ir.y+ir.height/2)-(br.y+br.height/2)).toFixed(2)};
  }));

  // 3. graph popup favourite has a label
  say('3-graph-favourite-label', await page.evaluate(()=>{
    if (typeof renderGraphPopupActions !== 'function') return 'fn missing';
    const box = document.getElementById('graph-popup-actions'); if(!box) return 'box missing';
    renderGraphPopupActions({id:1, pinned:false, content:'x', attachments:[]});
    return [...box.querySelectorAll('button')].map(b=>(b.textContent||'').trim()).slice(0,3);
  }));

  // 4. chat: send radius, jump pill exists, model panel places
  await page.evaluate(()=>switchTab('chat'));
  await page.waitForTimeout(1600);
  say('4-chat', await page.evaluate(()=>{
    const send=document.getElementById('chat-send'), input=document.getElementById('chat-input');
    const badge=document.getElementById('chat-active-model'); badge.hidden=false; badge.textContent='m';
    const panel=document.getElementById('chat-model-panel'); panel.classList.remove('hidden'); panel.textContent='about';
    placeChatModelPanel(); const pr=panel.getBoundingClientRect(); panel.classList.add('hidden');
    return {sendRadius:getComputedStyle(send).borderRadius, inputRadius:getComputedStyle(input).borderRadius,
      jumpPill: !!document.getElementById('chat-jump-latest'),
      modelPanelOnScreen: pr.y>=0 && pr.bottom<=innerHeight && pr.x>=0};
  }));

  // 5. library image ticks clickable
  await page.evaluate(()=>{switchTab('library');});
  await page.waitForTimeout(1200);
  await page.evaluate(()=>{document.querySelector('#library-subtabs button[data-media-kind="images"]')?.click();});
  await page.waitForTimeout(1800);
  say('5-gallery-ticks', await page.evaluate(()=>{
    const t=[...document.querySelectorAll('.library-tile-tick')];
    if(!t.length) return 'no tiles';
    const reach=t.filter(x=>{const r=x.getBoundingClientRect(); return document.elementFromPoint(r.x+r.width/2, r.y+r.height/2)===x;}).length;
    return {total:t.length, clickable:reach};
  }));

  // 6. documents: history + width menu entries exist and are wired
  await page.evaluate(()=>switchTab('documents'));
  await page.waitForTimeout(2000);
  say('6-documents', await page.evaluate(()=>({
    historyButton: !!document.getElementById('doc-history'),
    widthMenu: !!document.getElementById('doc-width-menu'),
    widthMenuLabel: (document.getElementById('doc-width-menu-label')||{}).textContent,
    toolbarUniformHeights: [...new Set([...document.querySelectorAll('#doc-toolbar button, #doc-toolbar summary')]
      .map(e=>Math.round(e.getBoundingClientRect().height)).filter(h=>h>0))],
  })));

  // 7. notifications unread toggle
  say('7-notifications', await page.evaluate(()=>{
    recordNotification({kind:'info', title:'Verify', key:'verify-1'});
    document.getElementById('notif-btn').click();
    return {markAllRead: !!document.getElementById('notif-mark-all-read')};
  }));
  await page.waitForTimeout(700);
  say('7b-row-toggle', await page.evaluate(()=>({
    rows: document.querySelectorAll('#notif-list .notif-row').length,
    toggles: document.querySelectorAll('#notif-list .notif-read-toggle').length})));

  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})();
