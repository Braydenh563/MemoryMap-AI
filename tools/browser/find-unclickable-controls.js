const {boot} = require(process.env.SCRATCH + '/lib.js');
(async () => {
  const {browser, page} = await boot();
  const probe = async (label) => {
    await page.waitForTimeout(1400);
    return await page.evaluate((label) => {
      const out = [];
      const sel = 'button, a[href], input, select, summary, [role="button"], [tabindex]:not([tabindex="-1"])';
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
        if (Number(cs.opacity) === 0) continue;
        if (el.disabled) continue;
        const cx = Math.min(innerWidth - 1, Math.max(1, r.x + r.width/2));
        const cy = Math.min(innerHeight - 1, Math.max(1, r.y + r.height/2));
        const top = document.elementFromPoint(cx, cy);
        if (!top) continue;
        // Reachable if the topmost element is the control, inside it, or its label.
        if (el.contains(top) || top.contains(el)) continue;
        if (top.closest && top.closest('label') && top.closest('label').contains(el)) continue;
        out.push({label, tag: el.tagName, id: el.id || '',
          cls: String(el.className).slice(0, 44),
          txt: (el.textContent||'').trim().slice(0, 24),
          blockedBy: top.tagName + '.' + String(top.className).slice(0, 40)});
      }
      return out;
    }, label);
  };
  const found = [];
  for (const t of ['dashboard','notes','chat','graph','timeline','library','documents','reminders']) {
    await page.evaluate((t)=>switchTab(t), t);
    found.push(...await probe('tab:'+t));
  }
  for (const s of ['capture','browse','draft','search']) {
    await page.evaluate((s)=>{switchTab('notes'); try{showNotesSection(s);}catch(e){}}, s);
    found.push(...await probe('notes:'+s));
  }
  for (const k of ['all','documents','images','files','boards','maps','skills','contents']) {
    await page.evaluate((k)=>{switchTab('library');
      document.querySelector(`#library-subtabs button[data-media-kind="${k}"]`)?.click();
      const b=[...document.querySelectorAll('#library-subtabs button')].find(x=>(x.textContent||'').trim().toLowerCase().startsWith(k.slice(0,4))); if(b) b.click(); }, k);
    found.push(...await probe('library:'+k));
  }
  await page.evaluate(()=>{ try{ openSettingsModal(); }catch(e){} });
  found.push(...await probe('settings'));
  const seen = new Set(); const uniq = [];
  for (const f of found) { const k = f.tag+f.id+f.cls+f.txt+f.blockedBy; if(seen.has(k)) continue; seen.add(k); uniq.push(f); }
  console.log(JSON.stringify(uniq, null, 1));
  console.log('TOTAL', uniq.length);
  await browser.close();
})();
