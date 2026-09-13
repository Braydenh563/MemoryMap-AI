// The document editor's AI assistant dialog (INBOX 158: "redesign and improve
// the ui and modernise the ui of the ai assistent ai edit popup, and redesign
// the edit write remove toggle, it is ugly"), and the AI edit history dialog it
// opens (INBOX 111, carried from 107a: "the ai edit history popover still not
// centering"), measured against the app's other dialogs rather than looked at.
const { boot } = require("./lib.js");

(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 160)));
  const fails = [];

  await page.evaluate(async () => {
    const r = await fetch("/documents", {
      method: "POST",
      headers: { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "AI probe", content: "A first paragraph that says something.\n\nA second paragraph that says something else.\n" }),
    });
    const doc = await r.json();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 400));
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 2200));
    openDocAiPanel();
    await new Promise((res) => setTimeout(res, 600));
  });

  const dialog = await page.evaluate(() => {
    const card = document.querySelector("#doc-ai-panel .doc-ai-card");
    const cr = card.getBoundingClientRect();
    const box = (sel, root = card) => {
      const el = root.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        w: Math.round(r.width), h: Math.round(r.height),
        top: Math.round(r.top), left: Math.round(r.left),
        //: Drawn or not, which is not the same question as `display` on the
        //: element itself: the label inside a hidden block is `display: block`
        //: and lays out nowhere, so `getClientRects()` is what answers.
        visible: el.getClientRects().length > 0,
        radius: cs.borderRadius, font: parseFloat(cs.fontSize),
      };
    };
    const segLabels = [...card.querySelectorAll("#doc-ai-verb label")].map((l) => {
      const r = l.getBoundingClientRect();
      const cs = getComputedStyle(l);
      return { text: l.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), radius: cs.borderRadius };
    });
    //: Every control in the column, so "one control height" is a fact rather
    //: than an impression: the failure DESIGN.md names is four pixels.
    const heights = {};
    for (const sel of ["#doc-ai-history", "#doc-ai-close", "#doc-ai-verb", "#doc-ai-instruction", "#doc-ai-run", "#doc-ai-accept", "#doc-ai-cancel"]) {
      const b = box(sel);
      //: Only what is on screen: a control inside the hidden result block
      //: measures 0 and would read as a height of its own.
      if (b && b.visible) heights[sel] = b.h;
    }
    return {
      card: { w: Math.round(cr.width), h: Math.round(cr.height), top: Math.round(cr.top), bottom: Math.round(cr.bottom) },
      viewport: { w: innerWidth, h: innerHeight },
      offCentreX: Math.round(Math.abs((cr.left + cr.right) / 2 - innerWidth / 2)),
      offCentreY: Math.round(Math.abs((cr.top + cr.bottom) / 2 - innerHeight / 2)),
      head: box(".row.space-between"),
      headTitleTag: card.querySelector("h2, h3")?.tagName,
      seg: box("#doc-ai-verb"),
      segClass: card.querySelector("#doc-ai-verb").className,
      segLabels,
      segTrackFits: (() => {
        const t = card.querySelector("#doc-ai-verb").getBoundingClientRect();
        const ls = [...card.querySelectorAll("#doc-ai-verb label")].map((l) => l.getBoundingClientRect());
        return ls.every((l) => l.left >= t.left - 1 && l.right <= t.right + 1);
      })(),
      scope: box("#doc-ai-scope"),
      instruction: box("#doc-ai-instruction"),
      resultLabel: box('label[for="doc-ai-result"]'),
      result: box("#doc-ai-result"),
      accept: box("#doc-ai-accept"),
      heights,
      // The empty result area is the largest thing in the dialog before there
      // is anything to show in it.
      emptyResultShare: (() => {
        const r = card.querySelector("#doc-ai-result").getBoundingClientRect();
        return Math.round((r.height / cr.height) * 100);
      })(),
      resultHasText: card.querySelector("#doc-ai-result").value.length > 0,
    };
  });
  console.log("card -> " + JSON.stringify(dialog.card) + " viewport " + JSON.stringify(dialog.viewport));
  console.log("off centre -> x " + dialog.offCentreX + "px, y " + dialog.offCentreY + "px");
  console.log("head -> " + JSON.stringify(dialog.head) + " title <" + dialog.headTitleTag + ">");
  console.log("segment -> " + JSON.stringify(dialog.seg) + " class " + dialog.segClass);
  console.log("segment labels -> " + JSON.stringify(dialog.segLabels) + " inside track: " + dialog.segTrackFits);
  console.log("scope -> " + JSON.stringify(dialog.scope));
  console.log("instruction -> " + JSON.stringify(dialog.instruction));
  console.log("result label -> " + JSON.stringify(dialog.resultLabel));
  console.log("result -> " + JSON.stringify(dialog.result) + " (" + dialog.emptyResultShare + "% of the card, text: " + dialog.resultHasText + ")");
  console.log("control heights -> " + JSON.stringify(dialog.heights));

  if (dialog.offCentreX > 2 || dialog.offCentreY > 2) fails.push(`the dialog is ${dialog.offCentreX}/${dialog.offCentreY}px off centre`);
  if (!dialog.segTrackFits) fails.push("a segment sits outside its own track");
  {
    // The head row's own pair are the app's `small` tier and are measured
    // against each other; the column under them is measured against itself.
    const head = ["#doc-ai-history", "#doc-ai-close"].map((k) => dialog.heights[k]).filter(Boolean);
    if (head.length === 2 && head[0] !== head[1]) fails.push(`the head row's buttons are ${head.join(" and ")}px`);
    const column = Object.entries(dialog.heights).filter(([k]) => !/history|close/.test(k)).map(([, v]) => v);
    const min = Math.min(...column), max = Math.max(...column);
    console.log(`control column spans ${min}..${max}px, head row ${head.join("/")}px`);
    if (max - min > 1) fails.push(`control heights span ${min}..${max}px (${JSON.stringify(dialog.heights)})`);
  }
  if (dialog.result.visible && !dialog.resultHasText) fails.push(`the empty result area takes ${dialog.emptyResultShare}% of the dialog`);
  if (dialog.resultLabel && dialog.resultLabel.visible && !dialog.resultHasText) fails.push("the result's label shows before there is a result");
  if (dialog.accept.visible && !dialog.resultHasText) fails.push("Replace is offered with nothing to replace with");

  // With an answer in it: the block appears, and its two actions stand at the
  // same height as the Suggest button that produced them.
  const answered = await page.evaluate(async () => {
    showDocAiResult("A rewritten first paragraph that says the same thing in fewer words.");
    await new Promise((r) => setTimeout(r, 400));
    const card = document.querySelector("#doc-ai-panel .doc-ai-card");
    const cr = card.getBoundingClientRect();
    const h = (id) => Math.round(document.getElementById(id).getBoundingClientRect().height);
    return {
      cardH: Math.round(cr.height),
      blockShown: !document.getElementById("doc-ai-result-block").classList.contains("hidden"),
      resultH: h("doc-ai-result"),
      heights: { run: h("doc-ai-run"), accept: h("doc-ai-accept"), cancel: h("doc-ai-cancel"), verb: h("doc-ai-verb"), instruction: h("doc-ai-instruction") },
      fitsY: cr.top >= -1 && cr.bottom <= innerHeight + 1,
      actionsRight: (() => {
        const row = document.querySelector(".doc-ai-result-actions").getBoundingClientRect();
        const accept = document.getElementById("doc-ai-accept").getBoundingClientRect();
        return Math.round(row.right - accept.right);
      })(),
    };
  });
  console.log("with an answer -> " + JSON.stringify(answered));
  if (!answered.blockShown) fails.push("the result block did not appear with a result in it");
  {
    const vs = Object.values(answered.heights);
    if (Math.max(...vs) - Math.min(...vs) > 1) fails.push(`control heights span ${Math.min(...vs)}..${Math.max(...vs)}px with an answer (${JSON.stringify(answered.heights)})`);
  }
  if (!answered.fitsY) fails.push(`the answered dialog is ${answered.cardH}px tall and does not fit the window`);

  // Switching verb must not leave an answer to the previous question standing.
  const switched = await page.evaluate(async () => {
    const radio = document.querySelector('input[name="doc-ai-verb"][value="remove"]');
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    return {
      blockShown: !document.getElementById("doc-ai-result-block").classList.contains("hidden"),
      result: document.getElementById("doc-ai-result").value,
      status: document.getElementById("doc-ai-status").textContent.trim(),
    };
  });
  console.log("verb switched with an answer up -> " + JSON.stringify(switched));
  if (switched.blockShown || switched.result) fails.push("a suggestion for one verb survived switching to another");
  if (!switched.status) fails.push("the suggestion vanished with nothing said about it");

  // Every verb, because the scope sentence and two labels change with it and a
  // dialog that resizes as you choose is the thing that reads as unfinished.
  const verbs = await page.evaluate(async () => {
    const out = [];
    for (const value of ["edit", "write", "remove"]) {
      const radio = document.querySelector(`input[name="doc-ai-verb"][value="${value}"]`);
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
      const card = document.querySelector("#doc-ai-panel .doc-ai-card").getBoundingClientRect();
      out.push({
        value,
        cardH: Math.round(card.height),
        run: document.getElementById("doc-ai-run").textContent.trim(),
        scope: document.getElementById("doc-ai-scope").textContent.trim().slice(0, 70),
        scopeLines: Math.round(document.getElementById("doc-ai-scope").getBoundingClientRect().height / 20),
      });
    }
    return out;
  });
  for (const v of verbs) console.log("verb " + v.value + " -> " + JSON.stringify(v));
  {
    const hs = verbs.map((v) => v.cardH);
    if (Math.max(...hs) - Math.min(...hs) > 2) fails.push(`the dialog changes height by ${Math.max(...hs) - Math.min(...hs)}px between verbs`);
  }

  // The history dialog, opened from inside this one: INBOX 111's centring.
  const history = await page.evaluate(async () => {
    document.getElementById("doc-ai-history").click();
    await new Promise((r) => setTimeout(r, 900));
    const d = document.getElementById("doc-ai-history-dialog");
    const r = d.getBoundingClientRect();
    return {
      open: d.open,
      w: Math.round(r.width), h: Math.round(r.height),
      offCentreX: Math.round(Math.abs((r.left + r.right) / 2 - innerWidth / 2)),
      offCentreY: Math.round(Math.abs((r.top + r.bottom) / 2 - innerHeight / 2)),
      // Above the panel it was opened from, or it is a dialog nobody can read.
      aboveThePanel: (() => {
        const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + 8));
        return d.contains(top);
      })(),
      emptyShown: !document.getElementById("doc-ai-history-empty").classList.contains("hidden"),
    };
  });
  console.log("history dialog -> " + JSON.stringify(history));
  if (!history.open) fails.push("the history dialog did not open");
  if (history.offCentreX > 2 || history.offCentreY > 2) fails.push(`the history dialog is ${history.offCentreX}/${history.offCentreY}px off centre in a ${history.w}x${history.h} box`);
  if (!history.aboveThePanel) fails.push("the history dialog is behind the panel that opened it");

  // Narrow, because a dialog that overflows the phone is the other half of
  // "modernise": 390 is the width Phase 6 names.
  await page.setViewportSize({ width: 390, height: 820 });
  await page.waitForTimeout(600);
  const narrow = await page.evaluate(async () => {
    document.getElementById("doc-ai-history-dialog").close();
    await new Promise((r) => setTimeout(r, 400));
    const card = document.querySelector("#doc-ai-panel .doc-ai-card");
    const r = card.getBoundingClientRect();
    const seg = document.getElementById("doc-ai-verb").getBoundingClientRect();
    return {
      cardW: Math.round(r.width), cardH: Math.round(r.height),
      fitsX: r.left >= -1 && r.right <= innerWidth + 1,
      fitsY: r.top >= -1 && r.bottom <= innerHeight + 1,
      segW: Math.round(seg.width),
      segInside: seg.right <= r.right + 1,
      scrollsX: card.scrollWidth > card.clientWidth + 1,
    };
  });
  console.log("390 wide -> " + JSON.stringify(narrow));
  if (!narrow.fitsX || narrow.scrollsX) fails.push("the dialog does not fit 390px");
  if (!narrow.segInside) fails.push("the segment hangs past the card at 390px");

  console.log("console errors: " + errs.length + (errs.length ? " " + JSON.stringify(errs.slice(0, 3)) : ""));
  if (errs.length) fails.push(`${errs.length} console errors`);
  await browser.close();
  if (fails.length) { console.log("FAIL\n- " + fails.join("\n- ")); process.exit(1); }
  console.log("PASS");
})();
