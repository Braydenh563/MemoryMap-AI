// The first question after a restart, timed (the owner, 2026-10-11: "27.06 s
// before the first step"). Run right after the server starts: the first
// answer event and the Why lines, in seconds. With no model the answer must
// start well under a second; the search model loads behind it.
//   BASE=... node scratchpad/ui-sweeps/firstask.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const out = await page.evaluate(async () => {
    const asked = [];
    for (const question of ["What have I saved about courses & study?", "what is there about a gaming mouse?"]) {
      const t0 = performance.now();
      const response = await fetch("/chat/stream", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Auth-Token": authToken() },
        body: JSON.stringify({ question, notes_only: true, use_tools: false }),
      });
      const tHead = performance.now();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let first = null, buffer = "", why = [], text = "", byte = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (byte === null) byte = performance.now() - t0;
        buffer += decoder.decode(value, { stream: true });
        for (const line of buffer.split("\n").slice(0, -1)) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "answer" && first === null) first = performance.now() - t0;
          if (event.type === "answer") text += event.delta || "";
          if (event.type === "why") why = event.lines.map((l) => `${l.at} ${l.text}`);
        }
        buffer = buffer.split("\n").pop();
      }
      asked.push({ question, status: response.status, headers_s: +((tHead - t0) / 1000).toFixed(2), first_byte_s: byte === null ? null : +(byte / 1000).toFixed(2), first_answer_s: first === null ? null : +(first / 1000).toFixed(2), total_s: +((performance.now() - t0) / 1000).toFixed(2), why, text: text.slice(0, 400) });
    }
    return asked;
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
