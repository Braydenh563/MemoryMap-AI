// Computed-style snapshot of the Library bundle's surfaces, to prove a CSS move
// from the boot sheets to library-lazy.css changed no rendered style.
//
//   LABEL=before BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/cssdiff-lazy.js          (writes $OUTDIR/<label>.json)
//   node scratchpad/ui-sweeps/cssdiff-lazy.js diff before after
//
// Every element under <body> in each scene gets its whole computed style
// recorded (keyed by scene, tag, id/class and document order); `diff` lists the
// elements and properties that differ. The data (one doc, one whiteboard, one
// map) is made once and reused, so the DOM is the same in both runs.
const fs = require("fs");
const OUTDIR = process.env.OUTDIR || "/tmp/cssdiff";
fs.mkdirSync(OUTDIR, { recursive: true });

if (process.argv[2] === "self") {
  // One run, two stylesheet configurations on the same DOM: `|new` is the files
  // as they are, `|old` the boot sheet and lazy sheet as they were before the move.
  const a = JSON.parse(fs.readFileSync(`${OUTDIR}/${process.argv[3]}.json`));
  let diffs = 0;
  let elements = 0;
  const perScene = {};
  const shown = {};
  for (const scene of Object.keys(a).filter((k) => k.endsWith("|new"))) {
    const A = a[scene];
    const B = a[scene.replace("|new", "|old")];
    for (const k of Object.keys(A)) {
      elements++;
      if (!B[k] || A[k].split("#")[0] === B[k].split("#")[0]) continue;
      diffs++;
      perScene[scene] = (perScene[scene] || 0) + 1;
      if (!shown[scene] || shown[scene] < 6) {
        shown[scene] = (shown[scene] || 0) + 1;
        let detail = "";
        if (A[k].includes("#") && B[k].includes("#")) {
          const names = JSON.parse(fs.readFileSync(`${OUTDIR}/props.json`));
          const pa = A[k].slice(A[k].indexOf("#") + 1).split("|");
          const pb = B[k].slice(B[k].indexOf("#") + 1).split("|");
          detail = names.map((n, i) => (pa[i] !== pb[i] ? `${n}: ${pb[i]} -> ${pa[i]}` : "")).filter(Boolean).slice(0, 6).join("; ");
        }
        console.log(`DIFF ${scene} ${k} ${detail}`);
      }
    }
  }
  console.log(JSON.stringify(perScene));
  console.log(`elements compared ${elements}, differing ${diffs}`);
  process.exit(diffs ? 1 : 0);
}

if (process.argv[2] === "diff") {
  const a = JSON.parse(fs.readFileSync(`${OUTDIR}/${process.argv[3]}.json`));
  const b = JSON.parse(fs.readFileSync(`${OUTDIR}/${process.argv[4]}.json`));
  // A third label is a second run of the same code: what differs between those
  // two is timing, not style, and is left out of the count.
  const n1 = process.argv[5] ? JSON.parse(fs.readFileSync(`${OUTDIR}/${process.argv[5]}.json`)) : null;
  let diffs = 0;
  let scenes = 0;
  let elements = 0;
  for (const scene of Object.keys(a)) {
    scenes++;
    const A = a[scene];
    const B = b[scene] || {};
    const keys = Object.keys(A);
    elements += keys.length;
    if (Object.keys(B).length !== keys.length) console.log(`SCENE ${scene}: element count ${keys.length} vs ${Object.keys(B).length}`);
    for (const k of keys) {
      if (!B[k]) continue;
      if (A[k].split('#')[0] === B[k].split('#')[0]) continue;
      if (n1 && n1[scene] && n1[scene][k] && n1[scene][k].split('#')[0] !== A[k].split('#')[0]) continue;
      const changed = [];
      if (A[k].includes("#") && B[k].includes("#")) {
        const pa = A[k].slice(A[k].indexOf("#") + 1).split("|");
        const pb = B[k].slice(B[k].indexOf("#") + 1).split("|");
        const names = JSON.parse(fs.readFileSync(`${OUTDIR}/props.json`));
        for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) changed.push(`${names[i]}: ${pa[i]} -> ${pb[i]}`);
      }
      diffs++;
      if (diffs <= 40) console.log(`DIFF ${scene} ${k}\n   ${changed.slice(0, 6).join("\n   ")}`);
    }
  }
  console.log(`scenes ${scenes}, elements ${elements}, differing elements ${diffs}`);
  process.exit(diffs ? 1 : 0);
}

const { boot } = require("./lib.js");
const LABEL = process.env.LABEL || "run";

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const snaps = {};
  const OLD = process.env.OLD07 ? { boot: fs.readFileSync(process.env.OLD07, "utf8"), lazy: fs.readFileSync(process.env.OLDLAZY, "utf8") } : null;
  //: The old files come back through a route (a <style> element is refused by
  //: the CSP), as <link>s placed exactly where the files they stand for sit.
  if (OLD) {
    await page.route("**/css/cssdiff-freeze.css*", (r) => r.fulfill({ body: "*,*::before,*::after{animation:none !important;transition:none !important}", contentType: "text/css" }));
    await page.route("**/css/cssdiff-old-boot.css*", (r) => r.fulfill({ body: OLD.boot, contentType: "text/css" }));
    await page.route("**/css/cssdiff-old-lazy.css*", (r) => r.fulfill({ body: OLD.lazy, contentType: "text/css" }));
  }
  async function setConfig(old) {
    await page.evaluate(async (o) => {
      if (!document.getElementById("cssdiff-freeze")) {
        const f = document.createElement("link");
        f.id = "cssdiff-freeze";
        f.rel = "stylesheet";
        f.href = "/css/cssdiff-freeze.css";
        document.head.appendChild(f);
      }
      const link = (part) => [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => l.href.includes(part));
      const waits = [];
      for (const [key, part] of [["boot", "07-whiteboard-misc"], ["lazy", "library-lazy"]]) {
        const l = link(part);
        if (!l) continue;
        let st = document.getElementById("cssdiff-old-" + key);
        if (!st) {
          st = document.createElement("link");
          st.id = "cssdiff-old-" + key;
          st.rel = "stylesheet";
          st.href = `/css/cssdiff-old-${key}.css`;
          waits.push(new Promise((res) => { st.onload = st.onerror = res; }));
          l.parentNode.insertBefore(st, l);
        }
        st.disabled = !o;
        l.disabled = o;
      }
      await Promise.all(waits);
      //: A sheet enabled after it was made loads (or parses) after the enable.
      for (const key of ['boot', 'lazy']) {
        const st = document.getElementById('cssdiff-old-' + key);
        for (let i = 0; st && o && i < 100 && !(st.sheet && st.sheet.cssRules.length); i++) await new Promise((r) => setTimeout(r, 50));
      }
    }, old);
  }
  async function snap(scene) {
    await page.waitForTimeout(2200);
    if (OLD) {
      await setConfig(false);
      await snapOne(scene + "|new");
      await setConfig(true);
      await page.waitForTimeout(300);
      if (process.env.DEBUG_SHEETS) console.log(await page.evaluate(() => [...document.styleSheets].filter((x) => x.href && /07-|lazy|cssdiff/.test(x.href)).map((x) => `${x.href.split("/").pop().split("?")[0]}:${x.disabled}:${x.cssRules.length}`).join(" ")));
      await snapOne(scene + "|old");
      await setConfig(false);
    } else await snapOne(scene);
  }
  async function snapOne(scene) {
    const res = await page.evaluate((want) => {
      const WANT = want ? new RegExp(want) : null;
      const names = [...getComputedStyle(document.body)].sort();
      const out = {};
      const seen = {};
      let n = 0;
      for (const el of document.body.querySelectorAll("*")) {
        if (n++ > 9000) break;
        if (el.closest("svg") && el.tagName !== "svg") continue;
        const cs = getComputedStyle(el);
        const id = el.id ? "#" + el.id : "";
        const cls = typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "";
        const base = `${el.tagName.toLowerCase()}${id}${cls}`;
        seen[base] = (seen[base] || 0) + 1;
        if (!el.getClientRects().length) continue; // only what is drawn
        const text = names.map((p) => cs.getPropertyValue(p)).join("|");
        let h1 = 5381, h2 = 52711;
        for (let i = 0; i < text.length; i++) {
          h1 = ((h1 * 33) ^ text.charCodeAt(i)) >>> 0;
          h2 = ((h2 * 31) + text.charCodeAt(i)) >>> 0;
        }
        out[`${base}~${seen[base]}`] = `${h1}.${h2}` + (WANT && WANT.test(base) ? "#" + text : "");
      }
      return { names, out };
    }, process.env.WANT || "");
    snaps[scene] = res.out;
    fs.writeFileSync(`${OUTDIR}/props.json`, JSON.stringify(res.names));
    console.log(`${scene}: ${Object.keys(res.out).length} elements`);
  }
  const api = (path, method, body) =>
    page.evaluate(([p, m, b]) => apiJson(p, { method: m, body: b ? JSON.stringify(b) : undefined }), [path, method, body]);

  // Data, made once (a marker in the data dir's own library: the board names).
  const boards = await api("/whiteboard/boards", "GET");
  let plain = boards.find((b) => b.name === "cssdiff board");
  let map = boards.find((b) => b.name === "cssdiff map");
  if (!plain) {
    plain = await api("/whiteboard/boards", "POST", { name: "cssdiff board" });
    const post = (o) => api("/whiteboard/objects", "POST", { board_id: plain.id, ...o });
    await post({ kind: "text", data: { content: "Some words" }, x: 200, y: 200, width: 200, height: 80, z: 2 });
    await post({ kind: "text", data: { content: "Sticky", bg: "#fff2a8" }, x: 500, y: 200, width: 160, height: 160, z: 2 });
    await post({ kind: "frame", data: { content: "A frame" }, x: 800, y: 150, width: 300, height: 200, z: 0 });
  }
  if (!map) {
    map = await api("/whiteboard/boards", "POST", { name: "cssdiff map", type: "map" });
    const mk = async (x, y, text, parent) => {
      const made = await api("/whiteboard/objects", "POST", { board_id: map.id, kind: "topic", x, y, width: 170, height: 52, data: { content: text } });
      if (parent) await api(`/whiteboard/boards/${map.id}/nodes/${made.id}/move`, "PUT", { parent_id: parent });
      return made;
    };
    const root = await mk(180, 360, "Root");
    const a = await mk(460, 240, "Branch A", root.id);
    await mk(460, 480, "Branch B", root.id);
    await mk(740, 200, "Leaf", a.id);
  }
  const docs = await api("/documents", "GET");
  let doc = (docs.items || docs).find((d) => d.title === "cssdiff doc");
  if (!doc) {
    doc = await api("/documents", "POST", {
      title: "cssdiff doc",
      content: "# Heading one\n\nSome *emphasis* and **bold** text with a [link](https://example.com).\n\n## Heading two\n\n- one\n- two\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```js\nconst x = 1;\n```\n\n> a quote\n\nteh wrong spelling\n",
    });
  }

  // Scenes. The old sheets are loaded once up front, so the first scene's
  // `old` is not measured against a sheet that has not parsed.
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(1200);
  if (OLD) {
    await setConfig(false);
    await setConfig(true);
    await page.waitForTimeout(1500);
    await setConfig(false);
  }
  await snap("library-all");
  for (const t of ["library-view-docs", "library-view-whiteboard", "library-view-skills", "library-view-links", "library-view-contents"]) {
    await page.click(`#library-subtabs [data-target="${t}"]`).catch(() => {});
    await page.waitForTimeout(900);
    await snap(t);
  }
  for (const kind of ["images", "files"]) {
    await page.click(`#library-subtabs [data-media-kind="${kind}"]`).catch(() => {});
    await page.waitForTimeout(900);
    await snap(`media-${kind}`);
  }
  // Boards.
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  for (const [name, b] of [["board", plain], ["map", map]]) {
    await page.evaluate(async (id) => {
      window.currentBoardId = id;
      if (typeof wbShowCanvasView === "function") wbShowCanvasView();
      await fetchWhiteboardState(id);
    }, b.id);
    await page.waitForTimeout(1500);
    await snap(`${name}-open`);
    const first = await page.$(".wb-object, .wb-map-node");
    if (first) {
      await first.click({ force: true }).catch(() => {});
      await page.waitForTimeout(700);
      await snap(`${name}-selected`);
    }
    await page.keyboard.press("Escape");
  }
  // The document editor.
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2500);
  await page.evaluate((id) => openDocument(id), doc.id);
  await page.waitForTimeout(2500);
  await snap("doc-open");
  for (const id of ["doc-focus-toggle", "doc-view-toggle", "doc-find-toggle", "doc-history-btn", "doc-outline-toggle"]) {
    const b = await page.$("#" + id);
    if (!b) continue;
    await b.click({ force: true }).catch(() => {});
    await page.waitForTimeout(700);
    await snap(`doc-${id}`);
    await page.keyboard.press("Escape");
    await b.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
  fs.writeFileSync(`${OUTDIR}/${LABEL}.json`, JSON.stringify(snaps));
  await browser.close();
})();
