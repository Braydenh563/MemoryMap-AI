// The new-chat skeleton's exits: a render with no fetch coming settles at once,
// a message sent while it shows takes the skeleton with the card, and the
// settled box carries no aria-busy.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ serviceWorkers: 'block' });
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(2000);
  const state = () => page.evaluate(() => {
    const s = document.getElementById('chat-suggest');
    return { hidden: s.classList.contains('hidden'), busy: s.getAttribute('aria-busy'), skeletons: s.querySelectorAll('.skeleton').length, chips: s.querySelectorAll('.chip').length, inCard: !!document.querySelector('.chat-empty #chat-suggest'), waiting: !!document.querySelector('.chat-empty-waiting') };
  });
  // 1. render with no fetch coming (openConversation of an empty thread)
  await page.evaluate(() => { clearChatEmptyState(); document.getElementById('chat-messages').replaceChildren(); document.getElementById('chat-suggest').classList.add('hidden'); renderChatEmptyState(); });
  const at0 = await state();
  await page.waitForTimeout(100);
  const noFetch = await state();
  // 2. skeleton showing, card cleared (a message was sent)
  await page.evaluate(() => { window.__hold = loadChatSuggestions.pending; clearChatEmptyState(); document.getElementById('chat-messages').replaceChildren(); document.getElementById('chat-suggest').classList.add('hidden'); loadChatSuggestions.pending = true; renderChatEmptyState(); });
  const held = await state();
  await page.evaluate(() => { loadChatSuggestions.pending = false; clearChatEmptyState(); });
  const cleared = await state();
  console.log(JSON.stringify({ at0, noFetch, held, cleared }, null, 1));
  await browser.close();
})();
