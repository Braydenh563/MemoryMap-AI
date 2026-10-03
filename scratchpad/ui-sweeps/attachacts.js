// INBOX 440 (2): drives the attachment card's actions on the note seeded by
// attachcards.js (run that first on the same data dir). Prints one line per
// check: the menu's rows on a note's own file, open into the lightbox, the
// keyboard path and focus ring, remove with undo and rename in Capture.
//
//   BASE=http://127.0.0.1:8789 node scratchpad/ui-sweeps/attachacts.js
const { boot } = require("./lib");

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 900 } });
  const log = (k, v) => console.log(k.padEnd(22), JSON.stringify(v));
  const id = await page.evaluate(async () => {
    const all = await apiJson("/entries?limit=200");
    const list = Array.isArray(all) ? all : all.items || [];
    return list.find((e) => (e.content || "").startsWith("Gary The Moss Monster"))?.id;
  });
  await page.evaluate(() => { switchTab("notes"); window.showNotesSection && showNotesSection("browse"); notesViewMode = "cards"; loadEntries(); });
  await page.waitForTimeout(2000);
  const card = `#entry-list > li[data-id="${id}"]`;
  const own = `${card} .att-cards .att-card[data-kind="image"]`;

  // 1. The menu on a note's own picture.
  await page.click(`${own} .att-card-more`);
  await page.waitForTimeout(300);
  log("own-image menu", await page.evaluate(() => {
    const menu = [...document.querySelectorAll('[role="menu"]')].find((m) => m.getClientRects().length);
    return [...menu.children].map((b) => (b.getAttribute("role") === "separator" ? "--" : b.textContent.trim()));
  }));
  await page.keyboard.press("Escape");
  log("focus back on opener", await page.evaluate(() => document.activeElement?.classList.contains("att-card-more")));

  // 2. Open: the card's own button, into the lightbox.
  await page.click(`${own} .att-card-open`);
  await page.waitForTimeout(1500);
  log("lightbox open", await page.evaluate(() => {
    const box = [...document.querySelectorAll(".lightbox")].find((b) => b.getClientRects().length && !b.classList.contains("hidden"));
    const img = box?.querySelector("img:not(.hidden)");
    return box ? { label: box.getAttribute("aria-label"), img: img ? img.naturalWidth : null } : null;
  }));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  // A text file opens in the lightbox's document reader.
  await page.click(`${card} .att-cards .att-card[data-kind="file"] .att-card-open`);
  await page.waitForTimeout(1500);
  log("text file open", await page.evaluate(() => {
    const box = [...document.querySelectorAll(".lightbox")].find((b) => b.getClientRects().length && !b.classList.contains("hidden"));
    return box ? { label: box.getAttribute("aria-label"), text: (box.innerText.match(/Some plain text notes/) || [null])[0] } : null;
  }));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 3. Keyboard: Tab reaches the card's open button, and the ring shows.
  await page.focus(`${own} .att-card-open`);
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  log("tab focus ring", await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return { cls: el.className, outline: `${cs.outlineStyle} ${cs.outlineWidth}`, visible: el.matches(":focus-visible") };
  }));
  // A right-click on a card opens the card's menu, not the note's.
  await page.click(`${own} .att-card-name`, { button: "right" });
  await page.waitForTimeout(300);
  log("right-click menu", await page.evaluate(() => {
    const menu = [...document.querySelectorAll('[role="menu"]')].find((m) => m.getClientRects().length);
    return menu ? [...menu.querySelectorAll('[role="menuitem"]')].map((b) => b.textContent.trim()).slice(0, 3) : null;
  }));
  await page.keyboard.press("Escape");

  // 4. Remove with undo, in the edit form.
  await page.evaluate((id) => { editingId = id; renderEntries(); }, id);
  await page.waitForTimeout(1200);
  const edit = "#entry-edit-attachment-chips .att-card[data-kind='pdf']";
  await page.click(`${edit} .att-card-more`);
  await page.waitForTimeout(300);
  await page.click('[role="menu"]:not(.hidden) .menu-item.menu-danger');
  await page.waitForTimeout(800);
  const afterRemove = await page.evaluate(() => {
    const ta = document.querySelector("#entry-list textarea");
    const toast = [...document.querySelectorAll(".toast")].map((t) => t.textContent.trim()).pop();
    return { hasPdf: ta.value.includes(".pdf"), cards: document.querySelectorAll("#entry-edit-attachment-chips .att-card").length, toast };
  });
  log("removed", afterRemove);
  await page.click(".toast .toast-action");
  await page.waitForTimeout(500);
  log("undone", await page.evaluate(() => ({
    hasPdf: document.querySelector("#entry-list textarea").value.includes(".pdf"),
    cards: document.querySelectorAll("#entry-edit-attachment-chips .att-card").length,
  })));

  // 5. Rename in the edit form: the text changes, the extension stays.
  await page.click(`${edit} .att-card-more`);
  await page.waitForTimeout(300);
  await page.click('[role="menu"]:not(.hidden) .menu-item:has-text("Rename")');
  await page.waitForTimeout(500);
  await page.fill(".prompt-card input", "Week 7 slides");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  log("renamed", await page.evaluate(() => ({
    text: document.querySelector("#entry-list textarea").value.match(/\[[^\]]*\]\(\/media\/[^)]*pdf\)/)?.[0],
    card: document.querySelector("#entry-edit-attachment-chips .att-card[data-kind='pdf'] .att-card-name")?.textContent,
  })));
  await page.evaluate(() => { editingId = null; renderEntries(); });

  // 6. A recording plays in place. The backend refuses audio and video
  // attachments today (415), so the card is built here over a blob url: a
  // one-second silent WAV, put on the note card where a file row would be.
  await page.evaluate(() => {
    const rate = 8000, n = rate;
    const buf = new ArrayBuffer(44 + n);
    const v = new DataView(buf);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, "data"); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    const url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
    const row = document.createElement("div");
    row.className = "att-cards";
    row.id = "sweep-audio";
    row.append(attachmentCard({ name: "voice memo.wav", url, size: buf.byteLength }));
    document.querySelector("#entry-list > li[data-id]").append(row);
  });
  const audio = "#sweep-audio .att-card";
  await page.click(`${audio} .att-card-open`);
  await page.waitForTimeout(1200);
  log("audio player", await page.evaluate((sel) => {
    const card = document.querySelector(sel);
    const p = card.querySelector("audio.att-card-player");
    return p && { controls: p.controls, duration: Math.round(p.duration * 10) / 10, expanded: card.querySelector(".att-card-open").getAttribute("aria-expanded"), w: Math.round(p.getBoundingClientRect().width), cardW: Math.round(card.getBoundingClientRect().width), meta: card.querySelector(".att-card-meta").textContent, menu: [...card.querySelectorAll('[role="menuitem"]')].map((b) => b.textContent.trim()) };
  }, audio));
  await page.click(`${audio} .att-card-open`);
  log("audio folded", await page.evaluate((sel) => !document.querySelector(`${sel} audio`), audio));
  await page.evaluate(() => document.getElementById("sweep-audio").remove());

  // 7. A picture staged in Capture (not uploaded yet) is a card too.
  await page.evaluate(() => { switchTab("notes"); window.showNotesSection && showNotesSection("capture"); });
  await page.waitForTimeout(500);
  log("staged picture", await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 40; canvas.height = 30;
    canvas.getContext("2d").fillRect(0, 0, 20, 20);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const box = document.getElementById("entry-content");
    box.value = "";
    await handleFileUpload(box, [new File([blob], "screenshot of the moss.png", { type: "image/png" })]);
    await new Promise((r) => setTimeout(r, 500));
    const card = document.querySelector("#entry-attachment-chips .att-card");
    const out = card && { state: card.dataset.state, meta: card.querySelector(".att-card-meta").textContent, thumb: card.querySelector(".att-card-tile").classList.contains("has-thumb") };
    box.value = "";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    clearStagedImages();
    return out;
  }));
  await browser.close();
})();
