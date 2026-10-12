// Seeds six notes of very different lengths for carddate.js (INBOX 760).
const BASE = process.env.BASE || 'http://127.0.0.1:8801';
const PW = 'testpassword123';
(async () => {
  const j = async (p, m = 'GET', b, t) => {
    const r = await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { 'X-Auth-Token': t } : {}) }, body: b ? JSON.stringify(b) : undefined });
    return r.json();
  };
  const st = await j('/auth/status');
  const auth = st.setup_required ? await j('/auth/setup', 'POST', { password: PW }) : await j('/auth/unlock', 'POST', { password: PW });
  const para = (n) => Array.from({ length: n }, (_, i) => `Line ${i + 1} of a longer note about the garden, the budget and what to do next.`).join('\n\n');
  const notes = ['Short one', 'A two line note\n\nSecond line here.', '# Medium\n\n' + para(3), '# Long\n\n' + para(9), '# Longest\n\n' + para(16), 'Tiny'];
  const made = [];
  for (const content of notes) made.push(await j('/entries', 'POST', { content, tags: [] }, auth.token));
  // Links put a row after the details line, the shape that left the time mid-card.
  for (const [a, b] of [[1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [3, 2], [4, 0]]) {
    await j(`/entries/${made[a].id}/links`, 'POST', { target_id: made[b].id, reason: 'seeded' }, auth.token);
  }
  // Two edited notes, so the date reads "ago · edited" (needs edited_at to differ).
  await new Promise((r) => setTimeout(r, 1500));
  for (const m of made.slice(0, 2)) await j(`/entries/${m.id}`, 'PUT', { content: m.content + '\n\nEdited.' }, auth.token);
  console.log("seeded", notes.length, "now", (await j("/entries", "GET", null, auth.token)).length);
})();
