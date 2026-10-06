// Notes, Questions (WORLD_CLASS_PLAN I3, row 7), and the Dashboard's open
// questions line.
//
//   BASE=http://127.0.0.1:8805 [THEME=dark] [W=390] node scratchpad/ui-sweeps/questions.js
//
// Seeds a note with two questions and a later note that answers one, runs a
// night pass, opens the view and measures: the counts on the segments, the
// rows, the answered-by line, the dock on one row at 1440 and nothing
// sideways at 390, Drop and Reopen, "Ask about these" landing in Ask with
// its scope line, and the Dashboard naming the oldest open question.
const { boot } = require("./lib.js");

(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const out = [];
  const check = (name, ok, detail = "") => out.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ": " + detail : ""}`);
  await page.evaluate(async () => {
    const seeded = await apiJson("/questions?state=open&limit=1", { silent: true });
    if (!seeded.counts.open && !seeded.counts.answered) {
      await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "Plans for the shed. When does the timber arrive this month? Who is fixing the roof on the shed?" }) });
      await new Promise((r) => setTimeout(r, 1100));
      await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "The timber for the shed is due to arrive this month on the twelfth, the yard rang." }) });
      await apiJson("/night/run", { method: "POST", body: JSON.stringify({ budget: 50000, force: true }) });
    }
    await switchTab("notes");
    showNotesSection("questions");
  });
  await page.waitForFunction(() => document.querySelectorAll("#questions-list .question-row").length > 0, null, { timeout: 15000 }).catch(() => {});
  const open = await page.evaluate(() => {
    const dock = document.querySelector('[data-dock-name="questions"]');
    const card = document.getElementById("questions");
    const rows = [...document.querySelectorAll("#questions-list .question-row")];
    const dockRect = dock.getBoundingClientRect();
    const heights = [...dock.querySelectorAll(":scope > * > button, :scope > * > .select-shell")].map((el) => Math.round(el.getBoundingClientRect().top));
    return {
      visible: !card.classList.contains("hidden") && card.getBoundingClientRect().height > 0,
      counts: ["open", "answered", "dropped"].map((s) => ((document.querySelector(`#questions-state option[value="${s}"]`).textContent.match(/\((\d+)\)/) || [])[1] || "")),
      rows: rows.map((r) => r.querySelector(".night-fact-text").textContent),
      asked: rows[0]?.querySelector(".dash-list-preview")?.textContent || "",
      buttons: rows[0] ? [...rows[0].querySelectorAll(".night-fact-actions button")].map((b) => b.getAttribute("aria-label")) : [],
      dockTops: [...new Set(heights)].length,
      dockHeight: Math.round(dockRect.height),
      overflow: card.scrollWidth - card.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check("the view shows", open.visible);
  check("the segments carry counts", open.counts[0] === "1" && open.counts[1] === "1", JSON.stringify(open.counts));
  check("one open row, the roof", open.rows.length === 1 && /roof/.test(open.rows[0]), JSON.stringify(open.rows));
  check("the row says where it was asked", /^Asked .* in “Plans for the shed\.”$/.test(open.asked), JSON.stringify(open.asked));
  check("open rows offer open, mark answered, drop", open.buttons.length === 3, JSON.stringify(open.buttons));
  if (W >= 600) check("the dock is one row", open.dockTops === 1, `${open.dockTops} rows, ${open.dockHeight}px`);
  check("nothing scrolls sideways", open.overflow <= 0 && open.pageOverflow <= 0, `card ${open.overflow}, page ${open.pageOverflow}`);

  const answered = await page.evaluate(async () => {
    { const s = document.getElementById("questions-state"); s.value = "answered"; s.dispatchEvent(new Event("change")); }
    await new Promise((r) => setTimeout(r, 900));
    const row = document.querySelector("#questions-list .question-row");
    const link = row?.querySelector(".question-answer-link");
    //: Colours as [r, g, b, a] in 0..1, from `rgb()`/`rgba()` or `color(srgb ...)`.
    const parse = (text) => {
      const n = (text.match(/[\d.]+/g) || []).map(Number);
      const scale = text.startsWith("color(") ? 1 : 255;
      return [n[0] / scale, n[1] / scale, n[2] / scale, n.length > 3 ? n[3] : 1];
    };
    const lum = ([r, g, b]) => {
      const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    //: The background as drawn: translucent layers composited over the first
    //: opaque one beneath them (a ghost button's tint is 10% over the card).
    const layers = [];
    for (let n = link; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 1) break;
    }
    let bg = layers.length && layers[layers.length - 1][3] >= 1 ? layers.pop() : [1, 1, 1, 1];
    while (layers.length) {
      const [r, g, b, a] = layers.pop();
      bg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a), 1];
    }
    const fg = link ? lum(parse(getComputedStyle(link).color)) : 0;
    const contrast = link ? (Math.max(fg, lum(bg)) + 0.05) / (Math.min(fg, lum(bg)) + 0.05) : 0;
    const linkRect = link?.getBoundingClientRect();
    const rowRect = row?.getBoundingClientRect();
    return {
      text: row?.querySelector(".night-fact-text")?.textContent || "",
      link: link?.textContent || "",
      contrast: Math.round(contrast * 100) / 100,
      inside: linkRect && rowRect ? linkRect.right <= rowRect.right + 0.5 : false,
      buttons: row ? [...row.querySelectorAll(".night-fact-actions button")].map((b) => b.getAttribute("aria-label")) : [],
    };
  });
  check("answered: the timber question", /timber/.test(answered.text), JSON.stringify(answered.text));
  check("answered: the answered-by line quotes the answer, naming its note once", /^Answered [^“]*: “The timber for the shed is due/.test(answered.link), JSON.stringify(answered.link));
  check("answered: the line clears 4.5:1 and fits the row", answered.contrast >= 4.5 && answered.inside, `${answered.contrast}, inside ${answered.inside}`);
  check("answered: Reopen is offered", answered.buttons.includes("Reopen"), JSON.stringify(answered.buttons));

  const dropped = await page.evaluate(async () => {
    { const s = document.getElementById("questions-state"); s.value = "open"; s.dispatchEvent(new Event("change")); }
    await new Promise((r) => setTimeout(r, 900));
    const row = document.querySelector("#questions-list .question-row");
    row.querySelector('[aria-label="Drop: it no longer matters"]').click();
    await new Promise((r) => setTimeout(r, 900));
    const afterDrop = ["open", "dropped"].map((s) => ((document.querySelector(`#questions-state option[value="${s}"]`).textContent.match(/\((\d+)\)/) || [])[1] || ""));
    { const s = document.getElementById("questions-state"); s.value = "dropped"; s.dispatchEvent(new Event("change")); }
    await new Promise((r) => setTimeout(r, 900));
    document.querySelector("#questions-list .question-row [aria-label='Reopen']").click();
    await new Promise((r) => setTimeout(r, 900));
    const afterReopen = ["open", "dropped"].map((s) => ((document.querySelector(`#questions-state option[value="${s}"]`).textContent.match(/\((\d+)\)/) || [])[1] || ""));
    { const s = document.getElementById("questions-state"); s.value = "open"; s.dispatchEvent(new Event("change")); }
    await new Promise((r) => setTimeout(r, 600));
    return { afterDrop, afterReopen };
  });
  check("Drop moves it, Reopen brings it back", dropped.afterDrop.join() === ",1" && dropped.afterReopen.join() === "1,", JSON.stringify(dropped));

  const asked = await page.evaluate(async () => {
    document.getElementById("questions-ask").click();
    await new Promise((r) => setTimeout(r, 500));
    const scope = document.getElementById("ask-scope");
    return {
      onAsk: !document.getElementById("ask").classList.contains("hidden"),
      scope: !scope.classList.contains("hidden") ? scope.textContent.replace(/\s+/g, " ").trim() : null,
      question: document.getElementById("question").value,
      scoped: typeof askScope !== "undefined" ? askScope : null,
    };
  });
  check("Ask about these lands in Ask with the scope line", asked.onAsk && asked.scoped === "questions" && /open questions/.test(asked.scope || ""), JSON.stringify(asked));
  const cleared = await page.evaluate(() => {
    document.getElementById("ask-scope-clear").click();
    return { hidden: document.getElementById("ask-scope").classList.contains("hidden"), scoped: askScope };
  });
  check("Ask all notes clears it", cleared.hidden && cleared.scoped === null, JSON.stringify(cleared));

  const dash = await page.evaluate(async () => {
    const hidden = Object.keys(DASH_WIDGETS).filter((n) => n !== "night");
    await setPreference("dashboard_layout", { order: ["night", ...hidden], hidden, wide: [] });
    prefsCache.dashboard_layout = { order: ["night", ...hidden], hidden, wide: [] };
    await switchTab("dashboard");
    await renderDashboard();
    for (let i = 0; i < 40 && !document.querySelector(".night-questions"); i += 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
    const line = document.querySelector(".night-questions");
    const row = document.querySelector(".night-questions-row");
    return {
      text: line?.textContent || null,
      overflow: row ? row.scrollWidth - row.clientWidth : -1,
      button: row?.querySelector("button")?.textContent.trim() || null,
    };
  });
  check("the Dashboard names the oldest open question", /^1 open question\. The oldest: “Who is fixing the roof/.test(dash.text || ""), JSON.stringify(dash));
  check("and its line fits", dash.overflow <= 0, String(dash.overflow));
  console.log(`${W} ${process.env.THEME || "light"}`);
  console.log(out.join("\n"));
  await browser.close();
  process.exit(out.some((l) => l.startsWith("FAIL")) ? 1 : 0);
})();
