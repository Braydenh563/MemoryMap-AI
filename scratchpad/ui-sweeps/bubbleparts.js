// INBOX 457/458: the parts of an assistant bubble, measured on the three
// surfaces that draw one (the popup agent, Chat, Ask's answer).
//
//   BASE=http://127.0.0.1:8820 FAKE=http://127.0.0.1:8821/v1 W=1440 THEME=light \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/bubbleparts.js
//
// FAKE is a stand-in model that streams `reasoning_content` before every
// round, calls one tool, then writes a long answer slowly (a wrapper over
// scratchpad/fake_openai_server.py with a per-chunk delay), so the thinking
// fold, the steps fold, the sources and a stream long enough to scroll all
// exist. Prints one JSON line per surface:
//   order    the bubble's parts top to bottom (head, think, steps, text,
//            sources, facts, actions), and whether that is the agreed order
//   think    the fold's summary/body type, body cap, gap to the head above
//   steps    the steps fold's left edge against the head and the thinking fold
//   clash    px of overlap between the action row and anything after it
//   sources  rows, duplicated rows, boxed facts, truncated model id
//   scroll   a second turn: px from the bottom after a wheel up mid-stream
//            (during, and after the turn ends), and once back at the bottom
//            whether following resumed (resumed, 0)
// Exits 1 on a wrong order, an overlap, duplicates, or a scroll that snapped.
const { boot } = require("./lib.js");

const FAKE = process.env.FAKE || "http://127.0.0.1:8821/v1";
const W = Number(process.env.W || 1440);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function measure(page, root) {
  return page.evaluate((rootSel) => {
    const scope = document.querySelector(rootSel);
    const bubbles = [...scope.querySelectorAll(".msg.assistant")];
    const bubble = bubbles[bubbles.length - 1];
    if (!bubble) return { missing: true };
    const vis = (el) => el && el.getClientRects().length && !el.closest(".hidden");
    const rect = (el) => el.getBoundingClientRect();
    //: Parts, found by role rather than by one surface's class names.
    const kinds = [
      ["head", ".msg-role"],
      ["think", ".thinking-fold, .step-thinking, .cmd-palette-thinking"],
      ["steps", ".agent-step-group"],
      ["text", ".bubble-answer"],
      ["sources", ".chat-sources, .cmd-source-block"],
      ["facts", ".msg-meta, .cmd-palette-meta"],
      ["actions", ".msg-actions"],
    ];
    //: The sources and facts of the popup agent used to sit after the bubble,
    //: in the results list; they are looked for there too.
    const pool = [bubble];
    let next = bubble.nextElementSibling;
    while (next && !next.classList.contains("msg")) {
      pool.push(next);
      next = next.nextElementSibling;
    }
    const parts = [];
    for (const [kind, sel] of kinds) {
      for (const host of pool) {
        const found = host.matches(sel) ? [host] : [...host.querySelectorAll(sel)];
        for (const el of found) {
          if (!vis(el)) continue;
          if (kind === "think" && el.closest(".agent-step-group-body")) continue;
          parts.push({ kind, el, top: Math.round(rect(el).top), bottom: Math.round(rect(el).bottom), left: Math.round(rect(el).left) });
        }
      }
    }
    parts.sort((a, b) => a.top - b.top || a.bottom - b.bottom);
    const order = parts.map((p) => p.kind);
    const want = ["head", "think", "steps", "text", "sources", "facts", "actions"];
    const seen = [...new Set(order)];
    const ranks = seen.map((k) => want.indexOf(k));
    const ordered = ranks.every((r, i) => i === 0 || r >= ranks[i - 1]) && order.filter((k) => k === "head").length === 1;
    const get = (k) => parts.find((p) => p.kind === k);
    const think = get("think");
    const head = get("head");
    let thinkFacts = null;
    if (think) {
      const summary = think.el.querySelector("summary");
      const body = think.el.querySelector(".thinking, .tool-chip-result, pre");
      const cs = body ? getComputedStyle(body) : null;
      const ss = getComputedStyle(summary);
      const after = parts.find((p) => p.top >= think.bottom && p.kind !== "think");
      thinkFacts = {
        cls: think.el.className,
        summaryFont: `${ss.fontSize} ${ss.fontWeight} ${ss.color}`,
        summaryH: Math.round(rect(summary).height),
        bodyFont: cs ? `${cs.fontFamily.split(",")[0]} ${cs.fontSize}` : null,
        bodyCap: cs ? cs.maxHeight : null,
        bodyOverflow: cs ? cs.overflowY : null,
        gapFromHead: head ? think.top - head.bottom : null,
        gapToNext: after ? after.top - think.bottom : null,
        left: think.left,
      };
    }
    const steps = get("steps");
    let stepFacts = null;
    if (steps) {
      const summary = steps.el.querySelector("summary");
      const ss = getComputedStyle(summary);
      stepFacts = {
        left: steps.left,
        headLeft: head ? head.left : null,
        thinkLeft: think ? think.left : null,
        summaryFont: `${ss.fontSize} ${ss.fontWeight}`,
        summaryH: Math.round(rect(summary).height),
        gapFromPrev: (() => {
          const prev = parts.filter((p) => p.bottom <= steps.top).pop();
          return prev ? steps.top - prev.bottom : null;
        })(),
      };
    }
    //: The action row against everything drawn after it.
    let clash = 0;
    const actions = get("actions");
    if (actions) {
      const a = rect(actions.el);
      for (const p of parts) {
        if (p.el === actions.el || p.el.contains(actions.el) || actions.el.contains(p.el)) continue;
        const r = rect(p.el);
        const w = Math.min(a.right, r.right) - Math.max(a.left, r.left);
        const h = Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top);
        if (w > 0 && h > 0) clash = Math.max(clash, Math.round(Math.min(w, h)));
      }
    }
    //: Sources: the rows, by title, and how many are listed twice.
    const rows = [];
    for (const p of parts.filter((x) => x.kind === "sources")) {
      for (const row of p.el.querySelectorAll(".cmd-source-row, .chat-source-card, .chat-source-row")) {
        //: By note id where the row carries one: two notes may share a title.
        const name = (row.querySelector(".chat-source-title, .chat-source-row-title") || row).textContent.trim().replace(/\s+/g, " ").slice(0, 40);
        rows.push(row.dataset.noteId ? `#${row.dataset.noteId} ${name}` : name);
      }
    }
    const dupes = rows.length - new Set(rows).size;
    const facts = get("facts");
    let factFacts = null;
    if (facts) {
      const items = [...facts.el.querySelectorAll(".cmd-palette-fact, .msg-meta-item")];
      //: A pill is a fact drawn in a box: a border or a ground of its own.
      const boxed = items.filter((x) => {
        const cs = getComputedStyle(x);
        return parseFloat(cs.borderTopWidth) > 0 || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
      }).length;
      const model = facts.el.querySelector(".msg-meta-model, .cmd-palette-fact:nth-child(2)");
      factFacts = {
        text: facts.el.textContent.trim().replace(/\s+/g, " ").slice(0, 120),
        height: Math.round(rect(facts.el).height),
        boxed,
        modelTitle: model ? model.title : null,
        modelEllipsis: model ? getComputedStyle(model).textOverflow : null,
      };
    }
    return {
      order: order.join(">"),
      ordered,
      think: thinkFacts,
      steps: stepFacts,
      clash,
      sources: { rows: rows.length, dupes, sample: rows.slice(0, 3) },
      facts: factFacts,
    };
  }, root);
}

//: A second turn, with the pane already taller than its window: wheel up
//: twice while the model is still thinking, let the turn finish, and read
//: how far from the bottom the pane is (near zero: it was dragged back down).
//: Then wheel back to the bottom, grow the pane by 300px through the app's
//: own `keepAtBottom` and read it again: following has to resume (zero).
async function scrollTest(page, sel, busySel, start) {
  await page.evaluate(start); // start returns nothing, so this does not wait for the turn
  const until = Date.now() + 15000;
  while (Date.now() < until && !(await page.$(busySel))) await sleep(150);
  await sleep(1200);
  const box = await page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  await page.mouse.move(box.x, box.y);
  await page.mouse.wheel(0, -120);
  await sleep(150);
  await page.mouse.wheel(0, -120);
  await sleep(1000);
  const fromBottom = (s) => {
    const el = document.querySelector(s);
    return Math.round(el.scrollHeight - el.scrollTop - el.clientHeight);
  };
  const res = { streaming: Boolean(await page.$(busySel)), during: await page.evaluate(fromBottom, sel) };
  await waitGone(page, busySel);
  await sleep(1000);
  res.after = await page.evaluate(fromBottom, sel);
  //: The reader goes back to the bottom (set directly: a wheel lands on
  //: whatever is under the pointer, an inner scroller or the composer), and
  //: past the release window its own scroll event re-sticks the pane.
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    el.scrollTop = el.scrollHeight;
  }, sel);
  await sleep(800);
  res.resumed = await page.evaluate((s) => {
    const el = document.querySelector(s);
    const pad = document.createElement("div");
    pad.style.height = "300px";
    el.appendChild(pad);
    keepAtBottom(el);
    const d = Math.round(el.scrollHeight - el.scrollTop - el.clientHeight);
    pad.remove();
    return d;
  }, sel);
  return res;
}

async function waitGone(page, sel, ms = 90000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (!(await page.$(sel))) return;
    await sleep(300);
  }
}

(async () => {
  const phone = W < 600;
  const { browser, page } = await boot({
    viewport: { width: W, height: phone ? 844 : 900 },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  let bad = 0;
  await page.evaluate(async (base) => {
    await api("/models/provider", { method: "POST", body: JSON.stringify({ provider: "openai", base_url: base }) });
    await api("/models/chat-model", { method: "POST", body: JSON.stringify({ name: "fake-local-tools" }) });
    //: `api()` hands back the response, so the notes loaded at boot are what
    //: say whether this data dir was seeded already.
    if (!allEntries.length) {
      for (const content of ["# Stargazing\nThe Perseids peak in August.", "# Bubble tea\nTaro with pearls.", "# Weekly plan\nGym, groceries, call mum."]) {
        await api("/entries", { method: "POST", body: JSON.stringify({ content }) });
      }
    }
  }, FAKE);

  // --- the popup agent ---------------------------------------------------
  const theme = process.env.THEME || "light";
  const POPUP_BUSY = "#command-palette-results .msg.is-generating";
  //: Not on a phone: there the agent's shortcut opens Chat
  //: (`toggleAgentPalette`), so Chat below is the phone's agent.
  let palette = null;
  if (!phone) {
    await page.evaluate(() => toggleAgentPalette());
    await sleep(500);
    await page.evaluate(() => cmdPaletteAsk("What do my notes say about stargazing?"));
    await sleep(1500);
    await waitGone(page, POPUP_BUSY);
    await sleep(800);
    palette = await measure(page, "#command-palette-results");
    await page.screenshot({ path: `/tmp/mm-bub20/popup-${W}-${theme}.png` });
    await (await page.$("#command-palette-results .msg.assistant")).screenshot({ path: `/tmp/mm-bub20/popup-bubble-${W}-${theme}.png` });
    palette.scroll = await scrollTest(page, "#command-palette-results", POPUP_BUSY, () => { cmdPaletteAsk("And about bubble tea?"); });
    console.log(JSON.stringify({ surface: "popup", W, theme, ...palette }));
    await page.evaluate(() => toggleAgentPalette());
    await sleep(400);
  }

  // --- Chat ---------------------------------------------------------------
  const CHAT_BUSY = "#chat-stop:not(.hidden)";
  await page.evaluate(() => switchTab("chat"));
  await sleep(800);
  await page.evaluate(() => sendChatMessage("What do my notes say about stargazing?", { useTools: true }));
  await sleep(1500);
  await waitGone(page, CHAT_BUSY);
  await sleep(1200);
  const chat = await measure(page, "#chat-messages");
  await page.screenshot({ path: `/tmp/mm-bub20/chat-${W}-${theme}.png` });
  await (await page.$("#chat-messages .msg.assistant:last-of-type")).screenshot({ path: `/tmp/mm-bub20/chat-bubble-${W}-${theme}.png` });
  chat.scroll = await scrollTest(page, "#chat-messages", CHAT_BUSY, () => { sendChatMessage("And about bubble tea?", { useTools: true }); });
  console.log(JSON.stringify({ surface: "chat", W, theme, ...chat }));

  // --- Ask's thinking fold -------------------------------------------------
  await page.evaluate(() => switchTab("notes"));
  await sleep(800);
  await page.click('#notes-subtabs [data-section="ask"]');
  await sleep(500);
  await page.evaluate(() => askQuestion("What do my notes say about stargazing?"));
  await sleep(1500);
  await waitGone(page, "#ai-answer.is-streaming", 60000);
  await sleep(800);
  const ask = await page.evaluate(() => {
    const host = document.getElementById("thinking-box");
    const fold = host && (host.matches("details") ? host : host.querySelector(".thinking-fold"));
    if (!fold || !fold.getClientRects().length) {
      return { missing: true, host: host && host.className, fold: Boolean(fold), answer: (document.getElementById("ai-answer")?.textContent || "").slice(0, 40), shown: Boolean(document.getElementById("ai-answer")?.getClientRects().length) };
    }
    const summary = fold.querySelector("summary");
    const body = fold.querySelector(".thinking, pre");
    const cs = getComputedStyle(body);
    const ss = getComputedStyle(summary);
    return {
      cls: fold.className,
      summary: summary.textContent.trim(),
      summaryFont: `${ss.fontSize} ${ss.fontWeight} ${ss.color}`,
      bodyFont: `${cs.fontFamily.split(",")[0]} ${cs.fontSize}`,
      bodyCap: cs.maxHeight,
    };
  });
  console.log(JSON.stringify({ surface: "ask", W, theme: process.env.THEME || "light", think: ask }));

  for (const r of [palette, chat].filter(Boolean)) {
    if (!r.ordered || r.clash > 0 || r.sources.dupes > 0) bad += 1;
    if (r.scroll.after < 60 || r.scroll.resumed > 2) bad += 1;
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
