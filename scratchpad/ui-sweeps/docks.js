// Dock inventory (UI_MODERNISATION_PLAN.md Phase 8): for every tab, the rows that
// hold controls near the top of the main panel — how many controls, how many
// distinct heights, what kinds — plus a 260px strip screenshot of each, and the
// documents editor at 1440/820/390. The Phase 8 baseline table came from this.
// Run from this directory: BASE=… SCRATCH=… PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node docks.js
const {boot}=require('./lib.js');
(async()=>{const {browser,page,OUT}=await boot();
const inv=async(label,sel)=>{const r=await page.evaluate((sel)=>{const root=document.querySelector(sel);if(!root)return null;const rows=[...root.querySelectorAll('.row, .library-toolbar, .graph-toolbar, .chat-toolbar, .wb-topbar, .doc-dock-head, .doc-toolbar, .doc-statusbar, .notes-toolbar, .log-toolbar, [role="toolbar"]')].filter(e=>e.getBoundingClientRect().height>0&&e.getBoundingClientRect().top<420).slice(0,6).map(e=>{const b=e.getBoundingClientRect();const ctrls=[...e.querySelectorAll('button, select, input, .seg, .select-shell, label')].filter(c=>c.getBoundingClientRect().width>0&&c.closest('.row, .library-toolbar, .graph-toolbar, .chat-toolbar, .wb-topbar, .doc-dock-head, .doc-toolbar, .doc-statusbar, .notes-toolbar, .log-toolbar, [role="toolbar"]')===e);const hs=[...new Set(ctrls.map(c=>Math.round(c.getBoundingClientRect().height)))];return {sel:(e.id?'#'+e.id:'.'+[...e.classList].slice(0,2).join('.')),y:Math.round(b.top),h:Math.round(b.height),controls:ctrls.length,heights:hs.sort((a,b)=>a-b).join('/'),kinds:[...new Set(ctrls.map(c=>c.tagName.toLowerCase()+(c.classList.contains('icon-only')||c.classList.contains('icon-button')?'.icon':c.classList.contains('ghost')?'.ghost':c.classList.contains('primary')||(c.tagName==='BUTTON'&&!c.className.includes('ghost')&&!c.className.includes('icon'))?'.filled':'')))].join(',')};});return rows;},sel);console.log(label, JSON.stringify(r));};
for (const t of ['dashboard','notes','chat','graph','library','timeline','reminders']){await page.click(`[data-tab="${t}"]`);await page.waitForTimeout(700);await page.screenshot({path:OUT+`/dock-${t}.png`,clip:{x:0,y:100,width:1440,height:260}});await inv(t,`#tab-${t}`);}
await page.click('[data-tab="library"]');await page.waitForTimeout(400);await page.click('[data-target="library-view-whiteboard"]');await page.waitForTimeout(700);
const card=await page.$('#library-boards-grid .library-card');if(card){await card.click();await page.waitForTimeout(900);await page.screenshot({path:OUT+'/dock-whiteboard.png',clip:{x:0,y:100,width:1440,height:260}});await inv('whiteboard','#library-view-whiteboard');}
await page.click('#wb-back-to-boards').catch(()=>{});await page.waitForTimeout(400);
await page.click('[data-target="library-view-docs"]');await page.waitForTimeout(600);const d=await page.$('.doc-list-item');if(d){await d.click();await page.waitForTimeout(1200);
await page.evaluate(()=>{document.getElementById('doc-format-toggle')?.click();});await page.waitForTimeout(300);
await page.screenshot({path:OUT+'/dock-documents.png',clip:{x:0,y:100,width:1440,height:700}});await inv('documents','#library-view-docs');
await page.setViewportSize({width:820,height:1180});await page.waitForTimeout(500);await page.screenshot({path:OUT+'/dock-documents-820.png',clip:{x:0,y:0,width:820,height:700}});
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:OUT+'/dock-documents-390.png'});}
await browser.close();})();
