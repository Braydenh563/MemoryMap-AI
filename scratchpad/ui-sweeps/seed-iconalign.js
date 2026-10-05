// Notes for iconalign.js (INBOX 592): a category, "#Sketches" and "#Visual
// Ideas" tags, one untagged note (its "Add tags" and "Tag with Atlas" chips)
// and a hub note with five links, so its card shows three link chips and
// "+2 more links".
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const out = await page.evaluate(async () => {
    const post = async (url, body) => {
      const r = await api(url, { method: 'POST', body: JSON.stringify(body) });
      return r.json().catch(() => ({}));
    };
    const hub = await post('/entries', { content: 'Girl with bell: a sketch study of a girl ringing a bell, ink and wash.', tags: ['Sketches', 'Visual Ideas'], category: 'Hobbies' });
    const ids = [];
    for (const t of ['Interesting bean: a sketch of a bean with a face', 'Ink wash practice, ten minutes a day', 'Bell study in charcoal', 'Gesture drawing at the park', 'Colour notes for the bean series'])
      ids.push((await post('/entries', { content: t, tags: ['Sketches'], category: 'Hobbies' })).id);
    await post('/entries', { content: 'Untagged thought about sketching outdoors in winter light.', tags: [], category: 'Hobbies' });
    let made = 0;
    for (const id of ids) {
      const r = await api(`/entries/${hub.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: id, reason: 'Same subject' }) });
      if (r.ok) made++;
    }
    return { hub: hub.id, made };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
