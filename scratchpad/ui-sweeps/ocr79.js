// Brief 79 (WORLD_CLASS_PLAN 28.4 rows 2 to 5, 7, 9): the OCR workspace,
// measured. Fresh data dir, no model, no OCR engine; a 900 by 400 PNG of three
// lines is the fixture. Where a reader is needed (a fresh read, a region read)
// the request is answered by Playwright, and the sweep says so in `stubbed`.
//   BASE=http://127.0.0.1:8829 VW=1440|390|320 ONLY=undo,zoom,fit,engine,live,open node ocr79.js
const { boot } = require("./lib.js");
const VW = Number(process.env.VW || 1440);
const ONLY = (process.env.ONLY || "undo,zoom,fit,engine,live,open").split(",");
const phone = VW < 600;
// The measure deepen72a.js takes (controls, past the edge, AI controls), read
// from that file so the two sweeps count the same way.
const MEASURE = require("fs").readFileSync(__dirname + "/deepen72a.js", "utf8").match(/const MEASURE = `([\s\S]*?)`;\n/)[1];
(async () => {
  const opts = phone
    ? { viewport: { width: VW, height: 844 }, hasTouch: true, isMobile: true }
    : { viewport: { width: VW, height: 900 } };
  const { browser, page } = await boot(opts);
  const out = { VW, stubbed: [] };
  await page.evaluate(() => switchTab("library"));
  await page.waitForFunction(() => typeof openOcrWorkspace === "function", null, { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.evaluate(MEASURE);
  const scan = await page.context().newPage();
  await scan.setViewportSize({ width: 900, height: 400 });
  await scan.setContent('<body style="font:28px serif;padding:30px;background:#fff"><h1>Lecture 4: memory</h1><p>Spaced repetition beats cramming for long term recall.</p><p>Read chapter 7 before Friday.</p></body>');
  const png = (await scan.screenshot({ type: "png" })).toString("base64");
  await scan.close();
  const upload = async () => page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append("file", new File([bytes], `ocr79-${Date.now()}.png`, { type: "image/png" }));
    fd.append("direct", "true");
    const res = await fetch("/media/upload", { method: "POST", body: fd, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } });
    return res.json();
  }, png);
  const open = async (media) => {
    await page.evaluate(async (url) => {
      const row = await apiJson("/media/meta/" + encodeURIComponent(url.split("/").pop()));
      openOcrWorkspace({ ...row, _isImage: true }, [{ ...row, _isImage: true }]);
    }, media.url);
    await page.waitForFunction(() => { const w = document.getElementById("ocr-workspace"); const img = w && w.querySelector("img"); return w && !w.classList.contains("hidden") && img && img.complete && img.naturalWidth > 0; }, null, { timeout: 15000 });
    await page.waitForTimeout(1200);
  };
  const close = () => page.evaluate(() => closeOcrWorkspace()).then(() => page.waitForTimeout(300));
  const meta = (media) => page.evaluate(async (url) => {
    const row = await apiJson("/media/meta/" + encodeURIComponent(url.split("/").pop()));
    return { ocr: row.ocr_text || "", vision: row.vision_ocr_text || "" };
  }, media.url);
  const setText = (media, kind, text) => page.evaluate(async ([id, kind, text]) => apiJson(`/media/${id}/${kind}`, { method: "POST", body: JSON.stringify({ text }) }), [media.id, kind, text]);
  const key = async (combo) => { await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press(combo); await page.waitForTimeout(1500); };
  await page.route("**/region-read", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ mode: "read", page: 0, text: "Lecture 4: memory", model: "stub", message: "" }) }));

  if (ONLY.includes("undo")) {
    const acts = {};
    const probe = async (name, setup, act, state) => {
      try {
        const m = await upload();
        await setup(m);
        await open(m);
        const before = JSON.stringify(await state(m));
        await act(m);
        await page.waitForTimeout(1500);
        const after = JSON.stringify(await state(m));
        await key("Control+z");
        const undone = JSON.stringify(await state(m));
        await key("Control+Shift+z");
        const redone = JSON.stringify(await state(m));
        acts[name] = { changed: before !== after, undone: undone === before, redone: redone === after };
        await close();
      } catch (e) { acts[name] = { error: String(e).slice(0, 160) }; await close().catch(() => {}); }
    };
    await probe("edit", (m) => setText(m, "vision-ocr", "Lecture four, memory."), async () => {
      await page.evaluate(() => { ocrOpenEdit(); document.getElementById("ocr-edit-box").value = "Lecture 4: memory, corrected."; document.getElementById("ocr-edit-save").click(); });
    }, meta);
    await probe("delete", (m) => setText(m, "vision-ocr", "Read chapter 7 before Friday."), async () => {
      await page.evaluate(() => document.getElementById("ocr-delete-reading").click());
    }, meta);
    await probe("clean", (m) => setText(m, "vision-ocr", Array(12).fill("Test, Test").join("\n")), async () => {
      await page.evaluate(() => document.getElementById("ocr-clean-loops").click());
    }, meta);
    out.stubbed.push("region-read answered by the sweep");
    await probe("region", async () => {}, async () => {
      await page.evaluate(() => { ocrReaders.vision = true; ocrRegionRect = { x: 0.05, y: 0.05, w: 0.6, h: 0.3 }; return ocrRunRegion("describe"); });
    }, async () => page.evaluate(() => document.querySelectorAll("#ocr-region-results .ocr-region-result").length));
    out.stubbed.push("fresh read: the request's body is replaced by a text set");
    await page.route("**/media/*/vision-ocr", async (route) => {
      const body = route.request().postData() || "";
      if (body.includes("force")) return route.continue({ postData: JSON.stringify({ text: "Fresh reading after install." }) });
      return route.continue();
    });
    await probe("read", (m) => setText(m, "vision-ocr", "An older reading."), async () => {
      await page.evaluate(async () => { ocrReaders.vision = true; const s = document.getElementById("ocr-reader"); if (s) s.value = "vision"; await ocrReadImage(ocrWorkspaceCurrent, document.getElementById("ocr-read")); });
    }, meta);
    await page.unroute("**/media/*/vision-ocr");
    out.undo = acts;
    out.undoScore = `${Object.values(acts).filter((a) => a.changed && a.undone && a.redone).length}/5`;
  }

  if (ONLY.includes("fit") || ONLY.includes("engine")) {
    const m = await upload();
    await open(m);
    await page.waitForTimeout(1500);
    out.fit = await page.evaluate(() => __m("#ocr-workspace"));
    out.engine = await page.evaluate(() => (document.getElementById("ocr-engine")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 300));
    //: A dead control: enabled, visible, and pressing it can do nothing with
    //: no model and no engine. Counted from the AI controls the measure finds
    //: that are neither disabled nor carrying a reason.
    out.aiDead = await page.evaluate(() => {
      const vis = (e) => e.offsetParent && e.getBoundingClientRect().width > 0;
      const ai = [...document.querySelectorAll("#ocr-workspace button, #ocr-workspace [role=menuitem]")].filter(vis).filter((c) => !c.classList.contains("select-opener"))
        .filter((c) => c.querySelector(".ph-sparkle, .ph-magic-wand, .ph-robot") || /\bAI\b|Summari[sz]e|Describe|Explain with/.test((c.getAttribute("aria-label") || "") + " " + (c.title || "") + " " + c.textContent));
      return ai.map((c) => ({ id: c.id || c.textContent.trim().slice(0, 20), disabled: c.disabled || c.getAttribute("aria-disabled") === "true", help: c.dataset.helpFor || c.getAttribute("aria-describedby") || "" }));
    });
    await close();
  }

  if (ONLY.includes("zoom")) {
    const m = await upload();
    await open(m);
    const level = () => page.evaluate(() => document.getElementById("ocr-zoom-level")?.textContent.trim());
    const pane = await page.evaluate(() => { const r = document.getElementById("ocr-page-pane").getBoundingClientRect(); return { x: r.left + r.width * 0.3, y: r.top + r.height * 0.4 }; });
    // The page point under the pointer, as a fraction of the content, before and after.
    const under = (p) => page.evaluate(({ x, y }) => { const pane = document.getElementById("ocr-page-pane"); const b = pane.getBoundingClientRect(); return [(pane.scrollLeft + x - b.left) / pane.scrollWidth, (pane.scrollTop + y - b.top) / pane.scrollHeight]; }, p);
    const z = { before: await level() };
    if (!phone) {
      await page.mouse.move(pane.x, pane.y);
      await page.evaluate(() => { const e = new WheelEvent("wheel", { deltaY: -2, ctrlKey: true, bubbles: true, cancelable: true }); document.getElementById("ocr-page-pane").dispatchEvent(e); });
      await page.keyboard.down("Control");
      for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(60); }
      await page.keyboard.up("Control");
      await page.waitForTimeout(400);
      z.afterCtrlWheel = await level();
      const u0 = await under(pane);
      await page.keyboard.down("Control");
      await page.mouse.wheel(0, -100);
      await page.keyboard.up("Control");
      await page.waitForTimeout(300);
      const u1 = await under(pane);
      z.drift = Math.round(Math.hypot(u1[0] - u0[0], u1[1] - u0[1]) * 1000) / 1000;
      z.afterSecond = await level();
    } else {
      const cdp = await page.context().newCDPSession(page);
      const pts = (d) => [{ x: pane.x - d, y: pane.y }, { x: pane.x + d, y: pane.y }];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(30) });
      for (let d = 40; d <= 140; d += 10) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(d) }); await page.waitForTimeout(30); }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(400);
      z.afterPinchOut = await level();
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(140) });
      for (let d = 130; d >= 50; d -= 10) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(d) }); await page.waitForTimeout(30); }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(400);
      z.afterPinchIn = await level();
      z.pageScale = await page.evaluate(() => window.visualViewport ? visualViewport.scale : 1);
    }
    out.zoom = z;
    await close();
  }

  if (ONLY.includes("live")) {
    // No optical reader here: the regions answer is the sweep's, three lines
    // of words placed where the fixture prints them (measured from its DOM).
    out.stubbed.push("ocr-regions answered by the sweep, words placed from the fixture's layout");
    const lines = [["Lecture", "4:", "memory"], ["Spaced", "repetition", "beats", "cramming", "for", "long", "term", "recall."], ["Read", "chapter", "7", "before", "Friday."]];
    const tops = [0.1, 0.42, 0.62];
    const regions = lines.map((words, index) => {
      const per = 0.8 / words.length;
      return { index, kind: index ? "text" : "heading", text: words.join(" "), confidence: 90,
        box: { x: 0.05, y: tops[index], w: 0.8, h: 0.08 },
        words: words.map((text, i) => ({ text, x: 0.05 + i * per, y: tops[index], w: per * 0.9, h: 0.08 })) };
    });
    await page.route("**/ocr-regions*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ width: 900, height: 400, regions, source: "tesseract", message: "", pages: 1, page: 0, readings: [] }) }));
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: process.env.BASE || "http://127.0.0.1:8829" });
    const m = await upload();
    await open(m);
    await page.evaluate(() => ocrSetZoom(null));
    await page.waitForTimeout(800);
    const pts = await page.evaluate(() => {
      const words = [...document.querySelectorAll("#ocr-live-text .ocr-live-word")];
      const c = (e, side) => { const r = e.getBoundingClientRect(); return { x: side < 0 ? r.left + 2 : r.right - 2, y: r.top + r.height / 2 }; };
      return { count: words.length, from: words.length ? c(words[0], -1) : null, to: words.length ? c(words[words.length - 1], 1) : null,
        sx: words.slice(0, 3).map((w) => Number(getComputedStyle(w).getPropertyValue("--word-sx") || 1).toFixed(2)) };
    });
    const live = { words: pts.count, stretch: pts.sx };
    if (pts.count) {
      await page.mouse.move(pts.from.x, pts.from.y);
      await page.mouse.down();
      await page.mouse.move((pts.from.x + pts.to.x) / 2, (pts.from.y + pts.to.y) / 2, { steps: 8 });
      await page.mouse.move(pts.to.x, pts.to.y, { steps: 8 });
      await page.mouse.up();
      live.selected = await page.evaluate(() => String(window.getSelection()).length);
      live.regionDrawn = await page.evaluate(() => Boolean(ocrRegionRect));
      await page.keyboard.press("Control+c");
      await page.waitForTimeout(300);
      live.clipboard = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => "ERR " + e);
      live.inOrder = live.clipboard === lines.map((l) => l.join(" ")).join("\n");
    }
    out.live = live;
    await page.unroute("**/ocr-regions*");
    await close();
  }

  if (ONLY.includes("open")) {
    const m = await upload();
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const ms = await page.evaluate(async (url) => {
        const row = await apiJson("/media/meta/" + encodeURIComponent(url.split("/").pop()));
        performance.clearResourceTimings();
        const t0 = performance.now();
        openOcrWorkspace({ ...row, _isImage: true }, [{ ...row, _isImage: true }]);
        const sync = Math.round(performance.now() - t0);
        const marks = {};
        const pageImg = document.getElementById("ocr-image");
        const lt = new PerformanceObserver((list) => { for (const e of list.getEntries()) marks.longTasks = (marks.longTasks || 0) + Math.round(e.duration); });
        try { lt.observe({ type: "longtask" }); } catch (e) {}
        requestAnimationFrame(() => { marks.firstFrame = Math.round(performance.now() - t0); });
        const until = performance.now() + 15000;
        while (performance.now() < until) {
          await new Promise((res) => requestAnimationFrame(res));
          const w = document.getElementById("ocr-workspace"); const img = w && w.querySelector("img");
          if (pageImg.complete && pageImg.naturalWidth > 0 && marks.pageImg === undefined) marks.pageImg = Math.round(performance.now() - t0);
          if (w && !w.classList.contains("hidden") && img && img.complete && img.naturalWidth > 0) {
            lt.disconnect();
            marks.firstImgIs = img.id || img.className || img.parentElement.className;
            const res = performance.getEntriesByType("resource").filter((e) => e.startTime >= t0 - 1).map((e) => `${e.name.replace(location.origin, "").split("?")[0].slice(0, 40)} ${Math.round(e.startTime - t0)}+${Math.round(e.duration)}`);
            return { ms: Math.round(performance.now() - t0), sync, marks, res: res.length };
          }
        }
        return -1;
      }, m.url);
      runs.push(ms);
      await page.waitForTimeout(1500);
      await close();
      await page.waitForTimeout(500);
    }
    out.openMs = runs;
  }
  console.log(JSON.stringify(out));
  await browser.close();
})();
