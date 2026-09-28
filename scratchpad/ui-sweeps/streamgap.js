// A streaming answer: the gaps above and below the progress line.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(() => switchTab("chat"));
  await page.waitForTimeout(1200);
  const out = await page.evaluate(() => {
    const { stepsHolder } = addAssistantBubble("Atlas");
    const ans = document.createElement("div");
    ans.className = "agent-step step-answer";
    ans.innerHTML = "<p>Your notes cover hobbies, events and thoughts. Specifically, note 5 discusses a birthday</p>";
    stepsHolder.appendChild(ans);
    const pending = document.createElement("div");
    pending.className = "agent-step step-pending";
    const line = progressLine("Writing the answer…", { words: true });
    pending.appendChild(line);
    const w = line.querySelector(".typing-thinking-word"); if (w) w.textContent = "Leafing through your notes one by one";
    line.setPhase?.("writing");
    stepsHolder.appendChild(pending);
    const m = line.querySelector(".progress-musing"); m.hidden = false; m.textContent = "Searching uses meaning and keywords together."; m.classList.add("is-shown");
    const r = (el) => el.getBoundingClientRect();
    const p = ans.querySelector("p");
    const dots = line.querySelector(".typing-dots");
    const cs = (el) => { const c = getComputedStyle(el); return `${c.marginTop}/${c.marginBottom}/${c.paddingTop}/${c.paddingBottom}`; };
    const trace = line.querySelector(".ai-writing-trace"); const tr = trace && r(trace);
    return { trace: tr && `${Math.round(tr.width)}x${Math.round(tr.height)}`, labelTop: Math.round(r(line.querySelector(".progress-line-label")).top - r(dots).top), aboveDots: Math.round(r(dots).top - r(p).bottom), dotsToMusing: Math.round(r(m).top - r(dots).bottom), dotsH: Math.round(r(dots).height), lineH: Math.round(r(line).height), pending: cs(pending), ans: cs(ans), p: cs(p), line: cs(line), rowGap: getComputedStyle(line).rowGap };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
