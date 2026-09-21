// MINDMAP_PLAN.md §12.1 item 2's fourth: **an image in a node**, which the
// plan left open because it needs the board's upload path and a node whose
// body is a picture rather than a label, "a second node shape, not a fourth
// button on a strip".
//
// Both halves are measured here, and neither is a screenshot:
//
//   - the upload is the real one. A PNG is written to disk, handed to the
//     file chooser the topic's own menu action opens, and the url that comes
//     back is read off the server afterwards: what this proves is that the
//     node stores a `/media/...` upload from `/media/upload` and not a data
//     URI, a blob url or a second upload route of its own;
//   - the shape is read with `getBoundingClientRect` and `getComputedStyle`.
//     A picture node has to be a different node, not a label node with an
//     image tucked beside the text, so the check is that the body lays out as
//     a column, that the label sits *under* the picture rather than beside it,
//     and that the picture fills the card's width inside its own padding.
//
//   BASE=http://127.0.0.1:8793 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   timeout 110 node scratchpad/ui-sweeps/mindmapimage.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { boot, OUT } = require("./lib.js");

const VIEWPORT = (() => {
  const raw = process.env.VIEWPORT;
  if (!raw) return { width: 1440, height: 900 };
  const [w, h] = raw.split("x").map(Number);
  return { width: w || 1440, height: h || 900 };
})();

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

// A real PNG, written here rather than checked in: a landscape one, so the
// aspect the node draws it at is a number worth reading, and a gradient so a
// blank element cannot pass for a picture.
const PNG_W = 160;
const PNG_H = 90;
function png() {
  const rows = Buffer.alloc(PNG_H * (1 + PNG_W * 3));
  let at = 0;
  for (let y = 0; y < PNG_H; y++) {
    rows[at++] = 0;
    for (let x = 0; x < PNG_W; x++) {
      rows[at++] = Math.floor((x * 255) / PNG_W);
      rows[at++] = Math.floor((y * 255) / PNG_H);
      rows[at++] = 120;
    }
  }
  const chunk = (tag, data) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(tag, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(body) >>> 0 : crc32(body) >>> 0, 0);
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(PNG_W, 0);
  ihdr.writeUInt32BE(PNG_H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Node 22 has `zlib.crc32`; this is the fallback so the probe does not depend
// on which minor it is run on.
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}

const READ = `(ids) => {
  const of = (id) => {
    const node = document.querySelector(\`.wb-object[data-id="\${id}"]\`);
    if (!node) return null;
    const body = node.querySelector(".wb-map-node-body");
    const img = node.querySelector(".wb-map-node-picture");
    const text = node.querySelector(".wb-map-text");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1), right: +b.right.toFixed(1) };
    };
    const cs = getComputedStyle(node);
    return {
      shape: node.dataset.body || null,
      flow: body ? getComputedStyle(body).flexDirection : null,
      pad: cs.padding,
      node: r(node),
      img: img && !img.hidden ? r(img) : null,
      src: img ? (img.getAttribute("src") || "") : "",
      natural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
      text: r(text),
    };
  };
  return { picture: of(ids.pictured), label: of(ids.labelled) };
}`;

(async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mmpic-")), "probe.png");
  fs.writeFileSync(file, png());

  const { page, browser } = await boot({ viewport: VIEWPORT });
  page.on("filechooser", async (chooser) => {
    await chooser.setFiles(file);
  });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);

  const built = await page.evaluate(async () => {
    const view = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== view);
    await initWhiteboard();
    const board = await apiJson("/whiteboard/boards", {
      method: "POST",
      body: JSON.stringify({ name: `pictures ${Date.now()}`, type: "map" }),
    });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    const mk = async (x, y, text, parent) => {
      const made = await apiJson("/whiteboard/objects", {
        method: "POST",
        body: JSON.stringify({ board_id: board.id, kind: "topic", x, y, width: 200, height: 52, data: { content: text } }),
      });
      if (parent) {
        Object.assign(made, await apiJson(`/whiteboard/boards/${board.id}/nodes/${made.id}/move`, {
          method: "PUT", body: JSON.stringify({ parent_id: parent }),
        }));
      }
      return made;
    };
    const root = await mk(140, 380, "Trunk");
    // Two siblings with the same text and the same width: whatever differs
    // between them afterwards is the picture and nothing else.
    const pictured = await mk(560, 200, "The photograph", root.id);
    const labelled = await mk(560, 520, "The photograph", root.id);
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 700));
    return { board: board.id, root: root.id, pictured: pictured.id, labelled: labelled.id };
  });

  const read = () => page.evaluate(`(${READ})(${JSON.stringify(built)})`);
  const before = await read();

  // The real path: the action the topic's menu calls, the file chooser it
  // opens, `/media/upload`, and whatever the node stores afterwards.
  await page.evaluate((id) => {
    const node = wbMapIndex().byId.get(id);
    return wbMapEditPicture(node);
  }, built.pictured);
  await page.waitForTimeout(3000);
  const after = await read();

  const stored = await page.evaluate(async (ids) => {
    const state = await apiJson(`/whiteboard/?board_id=${ids.board}`);
    const obj = state.objects.find((o) => o.id === ids.pictured) || {};
    const exported = await fetch(`/whiteboard/boards/${ids.board}/export?format=freemind`, {
      headers: { "X-Auth-Token": authToken() },
    }).then((r) => r.text());
    return { image: obj.data?.image ?? null, exported: exported.includes(`_image="${obj.data?.image}"`) };
  }, built);

  // What the topic's own menu offers, read from the menu itself rather than
  // assumed from the source: the ring's More is how a map node reaches it.
  const menu = await page.evaluate((id) => {
    selectWbItem("object", id);
    // The route a map node actually takes to its menu: the ring, then More.
    wbOpenMapRadial(wbMapIndex().byId.get(id));
    document.getElementById("wb-radial-more").click();
    const items = [...document.querySelectorAll(".wb-ctx-menu .menu-item")].map((b) => b.textContent.trim());
    wbCloseContextMenu();
    return items;
  }, built.pictured);

  // And off again, which must leave the topic exactly as it started.
  await page.evaluate((id) => wbMapRemovePicture(wbMapIndex().byId.get(id)), built.pictured);
  await page.waitForTimeout(900);
  const removed = await read();

  const pic = after.picture;
  const lab = after.label;
  const inside = pic.img && pic.node &&
    pic.img.x >= pic.node.x - 0.5 && pic.img.right <= pic.node.right + 0.5 &&
    pic.img.y >= pic.node.y - 0.5 && pic.img.bottom <= pic.node.bottom + 0.5;

  check("the picture the file chooser took is stored as a /media upload",
    typeof stored.image === "string" && /^\/media\/[A-Za-z0-9][\w.-]*$/.test(stored.image) &&
      pic.src.startsWith(stored.image),
    `${stored.image}, drawn from ${pic.src.slice(0, 48)}`);
  check("it reaches the browser as the picture it was, not a broken image",
    pic.natural && pic.natural.w === PNG_W && pic.natural.h === PNG_H,
    `natural ${pic.natural && pic.natural.w}x${pic.natural && pic.natural.h}, sent ${PNG_W}x${PNG_H}`);
  check("it draws at a sane box inside the node",
    inside && pic.img.w > 120 && pic.img.h > 40 && pic.img.w >= pic.node.w * 0.8,
    `picture ${pic.img && pic.img.w}x${pic.img && pic.img.h} inside node ${pic.node.w}x${pic.node.h}`);
  check("the aspect it was uploaded at survives the draw",
    pic.img && Math.abs(pic.img.w / pic.img.h - PNG_W / PNG_H) < 0.15,
    `${(pic.img.w / pic.img.h).toFixed(2)} against ${(PNG_W / PNG_H).toFixed(2)}`);

  check("a picture topic is a second node shape, not a label with a thumbnail",
    pic.shape === "picture" && pic.flow === "column" && lab.shape === null && lab.flow === "row",
    `picture node data-body=${pic.shape} ${pic.flow}, label node data-body=${lab.shape} ${lab.flow}`);
  check("the label is the caption under it, not a column beside it",
    pic.text.y >= pic.img.bottom - 1 && lab.text.y < lab.node.bottom - 1,
    `caption top ${pic.text.y} against picture bottom ${pic.img.bottom}`);
  check("the card grows for it and its sibling is untouched",
    pic.node.h > lab.node.h + 40 && lab.node.h === before.label.node.h,
    `${before.picture.node.h} -> ${pic.node.h} tall, sibling still ${lab.node.h}`);

  check("the topic's own menu is where a picture is put and taken out",
    menu.some((row) => row.includes("Change this topic's picture")) &&
      menu.some((row) => row.includes("Take the picture out")),
    JSON.stringify(menu.filter((row) => row.toLowerCase().includes("picture"))));
  check("the map export carries the url out",
    stored.exported, `_image in the FreeMind file: ${stored.exported}`);
  check("taking it out puts the topic back as it was",
    removed.picture.shape === null && removed.picture.img === null &&
      Math.abs(removed.picture.node.h - before.picture.node.h) < 2,
    `${removed.picture.node.h} tall against ${before.picture.node.h} before`);

  await page.screenshot({ path: `${OUT}/mindmapimage-${process.env.THEME || "light"}.png` });
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed  ${OUT}/mindmapimage-${process.env.THEME || "light"}.png`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
