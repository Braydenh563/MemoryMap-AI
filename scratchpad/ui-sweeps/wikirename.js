// GRAPH_PLAN 518: a renamed note offers to rewrite [[Old]] in the notes that
// name it; removing a [[name]] takes its link away. Saves through the API and
// calls the edit form's own offerWikiRename; the form itself is not driven.
//   BASE=http://127.0.0.1:8807 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wikirename.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const R = `W${Date.now().toString(36)}`;
  const ids = await page.evaluate(async (R) => {
    const post = (content) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
    const target = await post(`# ${R} old\n\nbody`);
    const holder = await post(`# ${R} holder\n\nsee [[${R} old]] and [[${R} old|alias]]`);
    return { target: target.id, holder: holder.id };
  }, R);
  await page.click('[data-tab="notes"]');
  await page.waitForTimeout(800);
  // The edit form's own save path, driven as a person would: open, retitle, save.
  const result = await page.evaluate(async ({ R, ids }) => {
    const saved = await api(`/entries/${ids.target}`, { method: 'PUT', body: JSON.stringify({ content: `# ${R} new\n\nbody` }) });
    offerWikiRename(ids.target, await saved.json());
    await new Promise((r) => setTimeout(r, 300));
    const toastEl = [...document.querySelectorAll('.toast')].pop();
    const text = toastEl?.textContent || '';
    toastEl?.querySelector('button')?.click();
    await new Promise((r) => setTimeout(r, 1500));
    const holder = await apiJson(`/entries/${ids.holder}`);
    const links = (holder.links || []).map((l) => l.id ?? l.entry_id ?? l.target_id);
    return { toast: text, holderText: holder.content, links: holder.links?.length };
  }, { R, ids });
  console.log(JSON.stringify(result));
  const removed = await page.evaluate(async ({ R, ids }) => {
    await api(`/entries/${ids.holder}`, { method: 'PUT', body: JSON.stringify({ content: `# ${R} holder\n\nno names now` }) });
    return (await apiJson(`/entries/${ids.holder}`)).links?.length;
  }, { R, ids });
  console.log('links after the names left the text:', removed);
  await browser.close();
})();
