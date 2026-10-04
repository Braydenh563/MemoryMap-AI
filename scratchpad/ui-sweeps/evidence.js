// Evidence cards (WORLD_CLASS_PLAN I6, row 6): the citation peek's signal
// bars and verdict, and the "N of M from your notes" toggle that opens each
// sentence beside its passage. Measured, not looked at: the bars' fill is the
// signal's share of the track, the view is two columns at 1440 and one at
// 390, nothing scrolls sideways, and the small text clears 4.5:1.
//
//   BASE=http://127.0.0.1:8805 [THEME=dark] [WIDTH=390] node scratchpad/ui-sweeps/evidence.js
const { boot } = require("./lib.js");

let failures = 0;
function ok(label, pass, detail) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  — ${detail}`);
  if (!pass) failures += 1;
}

const width = Number(process.env.WIDTH || 1440);
const height = width < 600 ? 844 : 900;

(async () => {
  const { page, browser } = await boot({ viewport: { width, height } });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const note = (id, content) => ({ id, content, category: "Garden", created_at: new Date().toISOString() });
    const garden =
      "Garden plan\n\nThe runner beans need netting before the pigeons find them, and soon.\n\n" +
      "The scarecrow joke about outstanding in his field still makes the kids laugh every time.";
    const boiler = "The boiler service is booked for the fourteenth with the engineer from town.";
    const raw = [note(901, garden), note(902, boiler)];
    const s1 = "The runner beans need netting before the pigeons find them.";
    const s2 = "The boiler service is booked for the fourteenth.";
    const s3 = "Quantum chromodynamics explains why protons hold together.";
    const start = garden.indexOf("The runner");
    const rows = [
      { sentence: s1, note_id: 901, start, end: start + 60, chunk_ordinal: 0, verdict: "supported",
        signals: { bm25: 0.8, cosine: 0.62, graph: 1 } },
      { sentence: s2, note_id: 902, start: 0, end: 50, chunk_ordinal: 0, verdict: "partly",
        signals: { bm25: 0.4, cosine: null, graph: 0.5 } },
    ];
    const support = { supported: 2, sentences: 3, ratio: 0.667, low: false, unsupported: [s3] };
    const host = document.createElement("div");
    host.className = "card evidence-sweep";
    host.style.position = "fixed";
    host.style.inset = "16px";
    host.style.overflow = "auto";
    host.style.zIndex = "50";
    document.body.appendChild(host);
    const answer = document.createElement("div");
    answer.className = "answer";
    const para = document.createElement("p");
    para.textContent = `${s1} ${s2} ${s3}`;
    answer.append(para);
    const grounding = document.createElement("div");
    grounding.className = "answer-grounding hidden";
    host.append(answer, grounding);
    renderAnswerGrounding(grounding, rows, raw, answer, "", null, support);
    const toggle = grounding.querySelector(".answer-evidence-toggle");
    const out = { toggleText: toggle ? toggle.textContent.trim() : null, marks: answer.querySelectorAll(".answer-citation").length };
    toggle?.click();
    const view = host.querySelector(".answer-evidence");
    out.expanded = toggle?.getAttribute("aria-expanded");
    out.viewVisible = !!view && !view.classList.contains("hidden") && view.getBoundingClientRect().height > 0;
    const items = [...(view?.querySelectorAll(".answer-evidence-row") || [])];
    out.order = items.map((li) => li.querySelector(".answer-evidence-sentence").textContent.slice(0, 12));
    out.unsupported = items.filter((li) => li.classList.contains("answer-evidence-unsupported")).map((li) => li.textContent);
    const first = items[0];
    const said = first?.querySelector(".answer-evidence-sentence").getBoundingClientRect();
    const card = first?.querySelector(".answer-evidence-card").getBoundingClientRect();
    out.side = said && card ? { saidRight: Math.round(said.right), cardLeft: Math.round(card.left), saidTop: Math.round(said.top), cardTop: Math.round(card.top), saidBottom: Math.round(said.bottom) } : null;
    out.overflow = view ? view.scrollWidth - view.clientWidth : -1;
    out.hostOverflow = host.scrollWidth - host.clientWidth;
    const bars = [...(first?.querySelectorAll(".evidence-signal") || [])].map((row) => {
      const track = row.querySelector(".evidence-signal-track").getBoundingClientRect();
      const fill = row.querySelector(".evidence-signal-fill").getBoundingClientRect();
      return { name: row.querySelector(".evidence-signal-name").textContent, share: Math.round((fill.width / track.width) * 100), track: Math.round(track.width), h: track.height };
    });
    out.bars = bars;
    out.secondBars = items[1] ? items[1].querySelectorAll(".evidence-signal").length : -1;
    // Contrast of the small text against the card.
    const lum = (rgb) => {
      const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bgOf = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== "transparent") return c;
      }
      return "rgb(255,255,255)";
    };
    const ratio = (el) => {
      const a = lum(getComputedStyle(el).color);
      const b = lum(bgOf(el));
      return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
    };
    const name = first?.querySelector(".evidence-signal-name");
    const verdict = first?.querySelector(".evidence-verdict");
    const none = view?.querySelector(".answer-evidence-none");
    out.contrast = { name: name ? ratio(name) : 0, verdict: verdict ? ratio(verdict) : 0, none: none ? ratio(none) : 0 };
    // The peek on the first mark.
    const link = answer.querySelector(".answer-citation-link");
    link?.dispatchEvent(new FocusEvent("focus"));
    const peek = document.querySelector(".citation-peek");
    out.peekBars = peek ? peek.querySelectorAll(".evidence-signal").length : -1;
    out.peekVerdict = peek?.querySelector(".evidence-verdict")?.textContent || null;
    if (peek) {
      const p = peek.getBoundingClientRect();
      out.peekInside = p.left >= 0 && p.right <= innerWidth && p.top >= 0 && p.bottom <= innerHeight;
      out.peekBox = [Math.round(p.left), Math.round(p.top), Math.round(p.width), Math.round(p.height)];
    }
    closeCitationPeek();
    toggle?.click();
    out.closed = view?.classList.contains("hidden") && toggle?.getAttribute("aria-expanded") === "false";
    host.remove();
    return out;
  });

  const tag = `${width}px ${process.env.THEME || "light"}`;
  ok(`${tag}: the toggle says the trust count`, r.toggleText === "2 of 3 from your notes", JSON.stringify(r.toggleText));
  ok(`${tag}: it opens the view`, r.viewVisible && r.expanded === "true", `visible ${r.viewVisible}, aria-expanded ${r.expanded}`);
  ok(`${tag}: every sentence, in answer order`, r.order.length === 3 && r.order[2].startsWith("Quantum"), JSON.stringify(r.order));
  ok(`${tag}: the unsupported one says so`, r.unsupported.length === 1 && /No note says this/.test(r.unsupported[0]), JSON.stringify(r.unsupported));
  if (width >= 600) {
    ok(`${tag}: sentence and source side by side`, r.side && r.side.cardLeft >= r.side.saidRight && Math.abs(r.side.cardTop - r.side.saidTop) <= 4, JSON.stringify(r.side));
  } else {
    ok(`${tag}: sentence above its source`, r.side && r.side.cardTop >= r.side.saidBottom, JSON.stringify(r.side));
  }
  ok(`${tag}: nothing scrolls sideways`, r.overflow <= 0 && r.hostOverflow <= 0, `view ${r.overflow}px, host ${r.hostOverflow}px`);
  const shares = Object.fromEntries(r.bars.map((b) => [b.name, b.share]));
  ok(`${tag}: each bar fills its signal's share`, Math.abs(shares.Words - 80) <= 2 && Math.abs(shares.Meaning - 62) <= 2 && Math.abs(shares.Links - 100) <= 2, JSON.stringify(r.bars));
  ok(`${tag}: an unmeasured signal is left out`, r.secondBars === 2, `${r.secondBars} bars on the row with no meaning score`);
  ok(`${tag}: small text clears 4.5:1`, r.contrast.name >= 4.5 && r.contrast.verdict >= 4.5 && r.contrast.none >= 4.5, JSON.stringify(r.contrast));
  ok(`${tag}: the peek carries the bars and verdict`, r.peekBars === 3 && r.peekVerdict === "Supported by this passage", `${r.peekBars} bars, ${JSON.stringify(r.peekVerdict)}`);
  ok(`${tag}: the peek is inside the window`, r.peekInside === true, JSON.stringify(r.peekBox));
  ok(`${tag}: the toggle closes it again`, r.closed === true, String(r.closed));
  await browser.close();
  console.log(failures ? `${failures} FAILED` : "all passed");
  process.exit(failures ? 1 : 0);
})();
