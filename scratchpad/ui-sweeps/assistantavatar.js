// INBOX 463 (2): Appearance, Assistant avatar. Measures what every assistant
// head wears, in both settings, and that a change repaints open heads live.
//
//   BASE=http://127.0.0.1:8840 FAKE=http://127.0.0.1:8841/v1 W=1440 THEME=light \
//     [REDUCED=1] PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/assistantavatar.js
//
// Prints one JSON line per (surface, setting): the head's element, its box,
// the share of non-transparent pixels in a canvas head, and the emblem's
// animation. Exits 1 on a head that is the wrong element, empty or the wrong
// size, or a setting change that does not reach an open head.
const { boot } = require("./lib.js");

const FAKE = process.env.FAKE || "http://127.0.0.1:8841/v1";
const W = Number(process.env.W || 1440);
const theme = process.env.THEME || "light";
const reduced = Boolean(process.env.REDUCED);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUTDIR = process.env.SHOTS || "/tmp/mm-av40/shots";
require("fs").mkdirSync(OUTDIR, { recursive: true });

//: The head of the last assistant reply (or the given host's) as data.
function headOf(page, sel) {
  return page.evaluate((s) => {
    const host = document.querySelector(s);
    if (!host) return { missing: true };
    const kid = host.firstElementChild;
    if (!kid) return { empty: true };
    const r = kid.getBoundingClientRect();
    const out = { tag: kid.tagName.toLowerCase(), cls: String(kid.getAttribute("class") || "").split(" ")[0], w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
    if (kid.tagName === "CANVAS") {
      const ctx = kid.getContext("2d");
      const data = ctx.getImageData(0, 0, kid.width, kid.height).data;
      let ink = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 8) ink++;
      out.inkPct = Math.round((ink / (kid.width * kid.height)) * 1000) / 10;
      out.backing = `${kid.width}x${kid.height}`;
      out.spin = kid.classList.contains("emblem-spin");
      out.animation = getComputedStyle(kid).animationName;
    }
    return out;
  }, sel);
}

(async () => {
  const phone = W < 600;
  const { browser, page } = await boot({
    viewport: { width: W, height: phone ? 844 : 900 },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
    ...(reduced ? { reducedMotion: "reduce" } : {}),
  });
  let bad = 0;
  const report = (surface, setting, data, want) => {
    const okTag = want === "emblem" ? data.tag === "canvas" : data.tag === "svg";
    const sized = data.w > 8 && data.h > 8;
    const inked = want !== "emblem" || data.inkPct > 1;
    const ok = okTag && sized && inked;
    if (!ok) bad++;
    console.log(JSON.stringify({ surface, W, theme, reduced, setting, ok, ...data }));
  };
  await page.evaluate(async (base) => {
    await api("/models/provider", { method: "POST", body: JSON.stringify({ provider: "openai", base_url: base }) });
    await api("/models/chat-model", { method: "POST", body: JSON.stringify({ name: "fake-local-tools" }) });
    if (!allEntries.length) {
      for (const content of ["# Stargazing\nThe Perseids peak in August.", "# Bubble tea\nTaro with pearls."]) {
        await api("/entries", { method: "POST", body: JSON.stringify({ content }) });
      }
    }
    localStorage.removeItem("assistant-avatar");
  }, FAKE);
  //: Set both ways: the app syncs appearance to the server, so a reduced run
  //: would otherwise leave the next run still.
  await page.evaluate((r) => { localStorage.setItem("motion", r ? "reduced" : "auto"); renderBrandLogo(); }, reduced);

  const CHAT_HEAD = "#chat-messages .msg.assistant:last-of-type .msg-avatar";
  const POP_HEAD = "#command-palette-results .msg.assistant:last-of-type .msg-avatar";
  const busy = async (sel) => {
    const until = Date.now() + 40000;
    while (Date.now() < until && !(await page.$(sel))) await sleep(150);
    while (Date.now() < until && (await page.$(sel))) await sleep(200);
    await sleep(500);
  };

  //: NEW_ONLY=1 skips the INBOX 463 surfaces (about two minutes of chat, popup
  //: and guide turns) and runs only the INBOX 471 ones below.
  if (!process.env.NEW_ONLY) {
  // --- Chat, default (atlas) -------------------------------------------------
  await page.evaluate(() => switchTab("chat"));
  await sleep(800);
  await page.evaluate(() => sendChatMessage("What do my notes say about stargazing?", { useTools: true }));
  await busy("#chat-stop:not(.hidden)");
  report("chat", "default", await headOf(page, CHAT_HEAD), "atlas");

  // --- the setting, through the real control ---------------------------------
  await page.evaluate(() => openSettingsModal("appearance"));
  await sleep(1000);
  //: The fold the row lives in, opened with a click on its summary.
  await page.click('details[data-fold-key="appearance-faces"] > summary');
  await sleep(500);
  const row = await page.evaluate(() => {
    const select = document.getElementById("assistant-avatar");
    const r = select.getBoundingClientRect();
    return { value: select.value, options: [...select.options].map((o) => o.textContent), shown: Boolean(select.getClientRects().length), w: Math.round(r.width) };
  });
  console.log(JSON.stringify({ surface: "setting", W, theme, ...row }));
  if (row.value !== "atlas") bad++;
  await page.locator("#assistant-avatar").scrollIntoViewIfNeeded();
  await page.selectOption("#assistant-avatar", "emblem");
  await sleep(1200);
  const stored = await page.evaluate(() => localStorage.getItem("assistant-avatar"));
  if (stored !== "emblem") { bad++; console.log("NOT STORED", stored); }
  await page.locator("#assistant-avatar-row").screenshot({ path: `${OUTDIR}/setting-${W}-${theme}.png` });
  await page.evaluate(() => closeSettingsModal());
  await sleep(500);

  // --- the open Chat head repainted in place ----------------------------------
  await page.evaluate(() => switchTab("chat"));
  await sleep(1000);
  report("chat (live)", "emblem", await headOf(page, CHAT_HEAD), "emblem");
  await (await page.$("#chat-messages .msg.assistant:last-of-type")).screenshot({ path: `${OUTDIR}/chat-emblem-${W}-${theme}.png` });

  // --- a new reply under emblem --------------------------------------------------
  await page.evaluate(() => sendChatMessage("And about bubble tea?", { useTools: true }));
  await busy("#chat-stop:not(.hidden)");
  report("chat (new reply)", "emblem", await headOf(page, CHAT_HEAD), "emblem");
  const sketches = await page.evaluate(() => ({ canvases: document.querySelectorAll("#chat-messages canvas").length, p5: typeof emblemInstances !== "undefined" ? emblemInstances.size : -1, scratch: document.querySelectorAll(".assistant-emblem-scratch").length }));
  console.log(JSON.stringify({ surface: "chat sketches", ...sketches }));
  if (sketches.scratch) bad++;

  // --- popup agent ---------------------------------------------------------------
  if (!phone) {
    await page.evaluate(() => toggleAgentPalette());
    await sleep(500);
    await page.evaluate(() => cmdPaletteAsk("What do my notes say about stargazing?"));
    await busy("#command-palette-results .msg.is-generating");
    report("popup reply", "emblem", await headOf(page, POP_HEAD), "emblem");
    report("popup head", "emblem", await headOf(page, ".help-head .atlas-mark-agent"), "emblem");
    await page.screenshot({ path: `${OUTDIR}/popup-emblem-${W}-${theme}.png` });
    await page.evaluate(() => toggleAgentPalette());
    await sleep(400);
  }

  // --- the Atlas guide ----------------------------------------------------------------
  await page.evaluate(() => openHelpChat());
  await sleep(1200);
  report("guide head", "emblem", await headOf(page, ".sheet-card-corner .sheet-title > .atlas-mark"), "emblem");
  await page.screenshot({ path: `${OUTDIR}/guide-emblem-${W}-${theme}.png` });
  // The setting changed while the guide is open: its head follows.
  await page.evaluate(() => { localStorage.setItem("assistant-avatar", "atlas"); repaintAssistantAvatars(); });
  await sleep(500);
  report("guide head (live back)", "atlas", await headOf(page, ".sheet-card-corner .sheet-title > .atlas-mark"), "atlas");
  await page.screenshot({ path: `${OUTDIR}/guide-atlas-${W}-${theme}.png` });
  await page.keyboard.press("Escape");
  await sleep(500);

  // --- back to Atlas: the chat heads repaint ---------------------------------------
  await page.evaluate(() => switchTab("chat"));
  await sleep(800);
  report("chat (back)", "atlas", await headOf(page, CHAT_HEAD), "atlas");
  await (await page.$("#chat-messages .msg.assistant:last-of-type")).screenshot({ path: `${OUTDIR}/chat-atlas-${W}-${theme}.png` });

  }

  // --- INBOX 471: Ask's answer, the writing room's draft, the guide's rows ----
  //: Each surface twice (Atlas, then the emblem switched live while the head is
  //: on screen), plus the box heights, which the head must not grow past its
  //: row's recipe. `heads` is false before the change (no head to find): the
  //: heights still print, which is the "before" half of the measurement.
  const setting = async (value) => {
    await page.evaluate((v) => { localStorage.setItem("assistant-avatar", v); repaintAssistantAvatars(); }, value);
    await sleep(600);
  };
  const both = async (surface, sel, shot) => {
    await setting("atlas");
    report(surface, "atlas", await headOf(page, sel), "atlas");
    await setting("emblem");
    report(`${surface} (live)`, "emblem", await headOf(page, sel), "emblem");
    if (shot) await shot(`${OUTDIR}/${surface.replace(/\W+/g, "-")}-emblem-${W}-${theme}.png`);
    await setting("atlas");
  };
  const box = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { h: Math.round(r.height * 10) / 10, top: Math.round(r.top * 10) / 10 };
  }, sel);
  const print = (surface, data) => console.log(JSON.stringify({ surface, W, theme, ...data }));

  // Ask
  await page.evaluate(() => { switchTab("notes"); showNotesSection("ask"); });
  await sleep(800);
  await page.evaluate(() => askQuestion("What do my notes say about stargazing?"));
  await sleep(500);
  await page.waitForFunction(() => document.querySelector("#ai-answer")?.textContent.trim().length > 10 && !document.querySelector("#ai-answer .progress-line"), null, { timeout: 40000 }).catch(() => {});
  await sleep(600);
  print("ask heights", { half: await box("#chat-results .chat-half"), head: await box("#chat-results .answer-head"), answer: await box("#ai-answer"), title: await box(".answer-title") });
  await both("ask head", ".answer-title > .msg-avatar", (path) => page.locator("#chat-results .chat-half").first().screenshot({ path }));

  // The writing room
  await page.evaluate(() => { showNotesSection("writing-room"); });
  await sleep(800);
  print("draft heights before", { headL: await box("#draft-thoughts-head, .draft-column:first-child .draft-column-head"), headR: await box(".draft-column:last-child .draft-column-head"), area: await box("#draft-text"), columns: await box(".draft-columns") });
  await page.evaluate(() => { $("draft-thoughts").value = "Notes on stargazing: the Perseids peak in August."; composeDraft(); });
  await sleep(500);
  await page.waitForFunction(() => $("draft-text").value.trim().length > 10, null, { timeout: 40000 }).catch(() => {});
  await sleep(600);
  print("draft heights", { headL: await box(".draft-column:first-child .draft-column-head"), headR: await box(".draft-column:last-child .draft-column-head"), area: await box("#draft-text"), columns: await box(".draft-columns") });
  await both("draft head", ".draft-column-head .msg-avatar", (path) => page.locator(".draft-columns").first().screenshot({ path }));

  // The guide: a real turn, then the setting switched under the open row, then
  // a new turn under the emblem (a head built after the change).
  await page.evaluate(() => openHelpChat());
  await sleep(1200);
  const GUIDE_HEAD = ".help-chat-msg.is-assistant:last-of-type > .msg-role .msg-avatar";
  //: Recorded by an observer in the page (a poll from here misses a state
  //: that lasts a few frames): the waiting row, then the streaming one, must
  //: both open with the head. The first turn is held 2.5s so waiting shows.
  await page.evaluate(() => {
    window.__guideStates = new Set();
    const seen = () => {
      for (const r of document.querySelectorAll(".help-chat-msg.is-pending, .help-chat-msg.is-streaming")) {
        const head = Boolean(r.firstElementChild?.matches(".msg-role") && r.firstElementChild.querySelector(".msg-avatar > *"));
        window.__guideStates.add(`${r.classList.contains("is-pending") ? "pending" : "streaming"}:${head}`);
      }
    };
    new MutationObserver(seen).observe(document.getElementById("help-chat-messages"), { subtree: true, childList: true, attributes: true });
  });
  await page.route("**/help/ask/stream", async (route) => { await sleep(2500); await route.continue(); });
  await page.evaluate(() => submitHelpChatQuestion("How do I change the theme?"));
  await page.waitForFunction(() => !document.querySelector(".help-chat-msg.is-pending, .help-chat-msg.is-streaming") && document.querySelector(".help-chat-msg.is-assistant"), null, { timeout: 40000 }).catch(() => {});
  await page.unroute("**/help/ask/stream");
  const states = new Set(await page.evaluate(() => [...window.__guideStates]));
  print("guide in-flight heads", { states: [...states] });
  if ([...states].some((x) => x.endsWith(":false"))) bad++;
  await page.waitForFunction(() => !document.querySelector(".help-chat-msg.is-pending, .help-chat-msg.is-streaming"), null, { timeout: 40000 }).catch(() => {});
  await sleep(600);
  print("guide heights", await page.evaluate(() => ({ rows: [...document.querySelectorAll(".help-chat-msg")].map((r) => ({ cls: r.className.replace("help-chat-msg ", ""), h: Math.round(r.getBoundingClientRect().height * 10) / 10 })) })));
  await both("guide row", GUIDE_HEAD, (path) => page.locator("#help-chat-messages").first().screenshot({ path }));
  await setting("emblem");
  await page.evaluate(() => submitHelpChatQuestion("And where are the settings?"));
  await page.waitForFunction(() => !document.querySelector(".help-chat-msg.is-pending, .help-chat-msg.is-streaming"), null, { timeout: 40000 }).catch(() => {});
  await sleep(600);
  report("guide row (new reply)", "emblem", await headOf(page, GUIDE_HEAD), "emblem");
  //: Every head the setting repaints is a holder with a remembered size.
  print("guide holders", await page.evaluate(() => ({ holders: document.querySelectorAll("[data-assistant-avatar]").length })));
  await page.screenshot({ path: `${OUTDIR}/guide-rows-${W}-${theme}.png` });
  await setting("atlas");

  await browser.close();
  console.log(bad ? `FAILED ${bad}` : "all heads right");
  process.exit(bad ? 1 : 0);
})();
