// Name marks in the chat (INBOX 409, "auto generate other icons in other
// places like potentially the user chat bubbles"). Draws a user bubble with
// `addBubble` and reads its box, padding, label row and avatar, so a run
// before the change and one after can be compared number for number
// (nothing may shift); then checks the avatar holds a generated mark seeded
// from the profile name, the chat's persona picker shows the chosen
// persona's mark (the emblem image for Atlas) and follows a change, and the
// persona rows in Settings carry one each. At 1440 and 390.
//
//   BASE=http://127.0.0.1:8786 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node chatmarks.js
// BEFORE=1 prints the bubble's numbers only (for the run on the old code).
const { boot } = require("./lib.js");

async function run(width) {
  const findings = [];
  const { page, browser } = await boot({ viewport: { width, height: 900 } });
  await page.evaluate(() => switchTab("chat"));
  await page.waitForTimeout(1200);
  const bubble = await page.evaluate(() => {
    const el = addBubble("user", "Where did I put the notes on the Rhine trip?");
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const label = el.querySelector(".msg-role").getBoundingClientRect();
    const body = el.querySelector(".msg-body").getBoundingClientRect();
    //: The old glyph avatar sat in the (hidden) label row; the mark sits on
    //: the bubble's corner. Either is read, so the BEFORE run works too.
    const avatar = el.querySelector(".msg-user-mark") || el.querySelector(".msg-avatar-user");
    const a = avatar.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el.querySelector(".msg-body"));
    const lines = [...range.getClientRects()];
    const hit = (b) => !(b.right <= a.left || b.left >= a.right || b.bottom <= a.top || b.top >= a.bottom);
    const box = document.getElementById("chat-messages").getBoundingClientRect();
    return {
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
      pad: cs.padding,
      labelH: Math.round(label.height * 10) / 10,
      bodyX: Math.round((body.left - r.left) * 10) / 10,
      bodyY: Math.round((body.top - r.top) * 10) / 10,
      avatar: [Math.round(a.width * 10) / 10, Math.round(a.height * 10) / 10],
      mark: Boolean(avatar.querySelector("svg.name-mark")),
      overText: lines.some(hit),
      clipped: a.right > box.right || a.top < box.top,
      seed: typeof userMarkSeed === "function" ? userMarkSeed() : null,
      name: el.querySelector(".msg-role").textContent.trim(),
      //: The bubble's box with the mark taken out again: equal to the box
      //: with it, whatever the base layout does to the list's width.
      without: (() => {
        const mark = el.querySelector(".msg-user-mark");
        if (!mark) return null;
        mark.remove();
        const b = el.getBoundingClientRect();
        const t = el.querySelector(".msg-body").getBoundingClientRect();
        el.appendChild(mark);
        return [b.width, b.height, t.left - b.left, t.top - b.top].map((n) => Math.round(n * 10) / 10);
      })(),
    };
  });
  console.log(`${width} bubble: ${JSON.stringify(bubble)}`);
  if (process.env.BEFORE) {
    await browser.close();
    return findings;
  }
  if (!bubble.mark) findings.push(`${width}: the user's avatar has no generated mark`);
  if (bubble.overText) findings.push(`${width}: the mark covers the message's text`);
  if (bubble.clipped) findings.push(`${width}: the mark is cut off by the list's edge`);
  if (bubble.without && JSON.stringify(bubble.without) !== JSON.stringify([bubble.w, bubble.h, bubble.bodyX, bubble.bodyY])) {
    findings.push(`${width}: the mark moves the bubble (${bubble.without} without it)`);
  }
  const expect = JSON.parse(process.env.EXPECT || "null");
  if (expect) {
    for (const key of ["w", "h", "pad", "labelH", "bodyX", "bodyY"]) {
      if (JSON.stringify(expect[width][key]) !== JSON.stringify(bubble[key])) {
        findings.push(`${width}: bubble ${key} moved from ${expect[width][key]} to ${bubble[key]}`);
      }
    }
  }

  // The chat's persona picker: open its panel, read the mark, change persona.
  const picker = await page.evaluate(async () => {
    const select = document.getElementById("persona-select");
    const mark = document.getElementById("persona-select-mark");
    const read = () => ({
      value: select.value,
      svg: Boolean(mark?.querySelector("svg.name-mark")),
      img: Boolean(mark?.querySelector("img")),
      html: mark?.innerHTML.replace(/nm-[a-z0-9]+/g, "") || "",
    });
    const first = read();
    const other = [...select.options].map((o) => o.value).find((v) => v !== select.value && v !== aiNameNow());
    select.value = other;
    select.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 400));
    const second = read();
    select.value = first.value;
    select.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 400));
    return { first, second, atlas: aiNameNow() };
  });
  console.log(`${width} picker: ${picker.first.value} svg=${picker.first.svg} img=${picker.first.img} -> ${picker.second.value} svg=${picker.second.svg}`);
  if (!picker.first.svg && !picker.first.img) findings.push(`${width}: the persona picker shows no mark`);
  if (picker.first.value === picker.atlas && !picker.first.img) findings.push(`${width}: Atlas lost its emblem in the picker`);
  if (!picker.second.svg) findings.push(`${width}: ${picker.second.value} has no generated mark in the picker`);
  if (picker.first.html === picker.second.html) findings.push(`${width}: the picker's mark did not follow the change`);

  await page.evaluate(() => openSettingsModal("personas"));
  await page.waitForTimeout(900);
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll(".persona-row")].map((row) => ({
      name: row.querySelector(".item-title")?.textContent.trim(),
      mark: row.querySelector(".persona-mark svg.name-mark") ? "svg" : row.querySelector(".persona-mark img") ? "img" : "none",
    }))
  );
  console.log(`${width} persona rows: ${JSON.stringify(rows)}`);
  for (const row of rows) if (row.mark === "none") findings.push(`${width}: persona ${row.name} has no mark`);
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflowX) findings.push(`${width}: the page scrolls sideways`);
  await browser.close();
  return findings;
}

(async () => {
  const findings = [...(await run(1440)), ...(await run(390))];
  for (const f of findings) console.log("    " + f);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : "PASS: 0 findings");
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log("ERR " + e.message); process.exit(1); });
