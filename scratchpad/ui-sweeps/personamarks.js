// Each assistant reply wears the face of the persona that wrote it (the
// owner: "if different personas are used in different chats for the chat
// messages the avatars need to persist for what persona was used").
//
// Drives the real app against `scratchpad/fake_openai_server.py`: sends one
// question as Coach, switches the picker to Analyst and sends another, then
// one as the app's own voice. Checks, live and again after the conversation
// is reopened: each bubble's name and `data-persona` are its writer's, a
// persona's avatar is the same SVG `nameMark(name, 20)` draws, the app's own
// voice keeps the live emblem (a canvas, no face), the saved turns carry the
// persona (null for the app's own voice), and switching the picker repaints
// nothing already on the page. Light and dark, 1440 and 390.
//
//   python3 scratchpad/fake_openai_server.py --port 8801 &
//   BASE=http://127.0.0.1:8800 FAKE=http://127.0.0.1:8801/v1 \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/personamarks.js
const { boot } = require("./lib.js");

const FAKE = process.env.FAKE || "http://127.0.0.1:8801/v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pointAtFake(page) {
  await page.evaluate(async (base) => {
    await api("/models/provider", {
      method: "POST",
      body: JSON.stringify({ provider: "openai", base_url: base }),
    });
    await api("/models/chat-model", {
      method: "POST",
      body: JSON.stringify({ name: "fake-local-tools" }),
    });
  }, FAKE);
}

async function waitIdle(page) {
  const until = Date.now() + 60000;
  await sleep(400);
  while (Date.now() < until) {
    const busy = await page.evaluate(() => {
      const stop = document.getElementById("chat-stop");
      return Boolean(stop && !stop.classList.contains("hidden"));
    });
    if (!busy) return;
    await sleep(300);
  }
  throw new Error("the reply never finished");
}

async function ask(page, persona, question) {
  await page.evaluate((name) => {
    const select = document.getElementById("persona-select");
    select.value = name;
    select.dispatchEvent(new Event("change"));
  }, persona);
  await sleep(300);
  await page.evaluate((q) => sendChatMessage(q, { useTools: false }), question);
  await waitIdle(page);
  // The final save lands after the stream closes.
  await sleep(800);
}

//: Every assistant bubble's writer, as the page shows it.
function readBubbles(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("#chat-messages .msg.assistant")].map((bubble) => {
      const avatar = bubble.querySelector(".msg-role-assistant .msg-avatar");
      const svg = avatar && avatar.querySelector("svg.name-mark");
      const name = bubble.querySelector(".msg-role-assistant > span:not(.msg-avatar)");
      const persona = bubble.dataset.persona || null;
      //: The clip id is a page-wide serial (avatars.js), so two draws of one
      //: name differ there and nowhere else.
      const norm = (html) => html.replace(/(id="|url\(#)nm-[0-9a-z]+/g, "$1nm-#");
      const expected = persona && persona !== aiNameNow() ? norm(nameMark(persona, 20).outerHTML) : null;
      const box = avatar ? avatar.getBoundingClientRect() : null;
      return {
        persona,
        name: name ? name.textContent.trim() : null,
        face: Boolean(svg),
        faceMatches: Boolean(svg) && expected !== null && norm(svg.outerHTML) === expected,
        emblem: Boolean(avatar && avatar.querySelector("canvas")),
        size: box ? [Math.round(box.width), Math.round(box.height)] : null,
      };
    })
  );
}

function check(label, bubbles, want, findings) {
  if (bubbles.length !== want.length) {
    findings.push(`${label}: ${bubbles.length} assistant bubbles, expected ${want.length}`);
    return;
  }
  bubbles.forEach((b, i) => {
    const who = want[i];
    if (b.persona !== who) findings.push(`${label} #${i}: data-persona ${b.persona}, expected ${who}`);
    if (b.name !== who) findings.push(`${label} #${i}: named ${b.name}, expected ${who}`);
    if (who === "Atlas") {
      if (!b.emblem || b.face) findings.push(`${label} #${i}: the app's own voice lost its emblem`);
    } else if (!b.faceMatches) {
      findings.push(`${label} #${i}: the avatar is not ${who}'s face (face=${b.face})`);
    }
    if (!b.size || b.size[0] !== 20 || b.size[1] !== 20) {
      findings.push(`${label} #${i}: avatar is ${b.size}, expected 20x20`);
    }
  });
}

async function run(width) {
  const findings = [];
  const { page, browser } = await boot({ viewport: { width, height: 900 } });
  await pointAtFake(page);
  await page.evaluate(() => switchTab("chat"));
  await sleep(800);
  await page.evaluate(() => newChat && newChat());
  await sleep(500);
  await ask(page, "Coach", "How did my week go?");
  await ask(page, "Analyst", "What are the numbers?");
  const atlas = await page.evaluate(() => aiNameNow());
  await ask(page, atlas, "Anything else?");
  const want = ["Coach", "Analyst", atlas];

  const live = await readBubbles(page);
  console.log(`${width} live: ${JSON.stringify(live)}`);
  check(`${width} live`, live, want, findings);

  // Switching the picker repaints nothing already on the page.
  await page.evaluate(() => {
    const select = document.getElementById("persona-select");
    select.value = "Coach";
    select.dispatchEvent(new Event("change"));
  });
  await sleep(300);
  check(`${width} after switching`, await readBubbles(page), want, findings);

  // What was saved, and the reopened thread.
  const saved = await page.evaluate(async () => {
    const full = await apiJson(`/conversations/${chatConv.id}`);
    return full.messages.filter((m) => m.role === "assistant").map((m) => m.persona ?? null);
  });
  console.log(`${width} saved personas: ${JSON.stringify(saved)}`);
  if (JSON.stringify(saved) !== JSON.stringify(["Coach", "Analyst", null])) {
    findings.push(`${width}: saved personas ${JSON.stringify(saved)}`);
  }
  await page.evaluate(async () => {
    const id = chatConv.id;
    newChat();
    await openConversation(id);
  });
  await sleep(1200);
  const reopened = await readBubbles(page);
  console.log(`${width} reopened: ${JSON.stringify(reopened)}`);
  check(`${width} reopened`, reopened, want, findings);

  if (process.env.SHOT) {
    await page.screenshot({ path: `${process.env.SHOT}-${width}-${process.env.THEME || "light"}.png` });
  }
  await browser.close();
  return findings;
}

(async () => {
  const findings = [...(await run(1440)), ...(await run(390))];
  console.log(findings.length ? `FINDINGS (${findings.length}):\n${findings.join("\n")}` : "findings: none");
  process.exit(findings.length ? 1 : 0);
})();
