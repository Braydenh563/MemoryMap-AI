// The notice recipe draws, and an answer the notes barely back says so.
//
// CHAT_PLAN Phase 1's fourth gate line and DESIGN.md's `.notice` recipe, both
// added 2026-09-21. Two things no Python test can see: that the line is placed
// *above* the answer rather than below it with the chips (the chips are a key
// to marks already read; this is a thing to know before reading), and that the
// warn tone is an edge rather than a fill, because a filled warning band over
// an answer reads as a failed answer and it is not one.
const { boot } = require("./lib.js");

let failures = 0;
function ok(label, pass, detail) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  — ${detail}`);
  if (!pass) failures += 1;
}

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const r = await page.evaluate(() => {
    const host = document.createElement("div");
    host.className = "card";
    document.body.appendChild(host);
    const answer = document.createElement("div");
    answer.className = "bubble-answer";
    answer.textContent = "An answer with several sentences in it.";
    host.appendChild(answer);
    renderAnswerSupport(answer, { supported: 1, sentences: 4, ratio: 0.25, low: true });
    const notice = host.querySelector(".answer-support");
    const cs = notice ? getComputedStyle(notice) : null;
    const out = {
      placed: !!notice && notice.nextElementSibling === answer,
      text: notice ? notice.textContent.trim() : null,
      icon: notice ? (notice.querySelector("i.ph")?.className || null) : null,
      border: cs ? cs.borderTopColor : null,
      bg: cs ? cs.backgroundColor : null,
      alpha: cs ? Number((cs.backgroundColor.match(/[\d.]+\)$/) || ["1)"])[0].slice(0, -1)) : 1,
      height: notice ? Math.round(notice.getBoundingClientRect().height * 10) / 10 : 0,
    };
    renderAnswerSupport(answer, { supported: 4, sentences: 4, ratio: 1, low: false });
    out.goneWhenFine = !host.querySelector(".answer-support");
    host.remove();
    return out;
  });

  ok("the notice sits above the answer, not under it", r.placed, `next sibling is the answer: ${r.placed}`);
  ok("it draws a Phosphor icon", /\bph-warning\b/.test(r.icon || ""), `icon ${r.icon}`);
  ok(
    "its words agree with themselves",
    /Only 1 of 4 sentences here comes from your notes/.test(r.text || ""),
    JSON.stringify(r.text)
  );
  ok(
    "the warn tone is an edge, not a filled band",
    r.alpha <= 0.25,
    `background ${r.bg} (alpha ${r.alpha}), border ${r.border}`
  );
  ok("it is one box, not a paragraph", r.height > 0 && r.height < 60, `${r.height}px tall`);
  ok("and a well supported answer gets none", r.goneWhenFine, `removed: ${r.goneWhenFine}`);

  await browser.close();
  console.log(failures ? `FAILURES: ${failures}` : "ALL PASS");
  process.exit(failures ? 1 : 0);
})();
