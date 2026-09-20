// The split document view's two panes, measured the way the view is used.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers BASE=http://127.0.0.1:8952 \
//     node scratchpad/ui-sweeps/docsplit.js
//
// INBOX 274 item 3 was closed on a synthetic five-section document: five
// headings, one direction, a document that had just been opened and never
// touched. The owner re-reported it (INBOX 278, "the documents split view
// scrolling is broken and misaligned"), which is what a probe that measured
// the easy case looks like from the other side.
//
// So this one measures a document with the things a real one has (frontmatter,
// an H1 title, long wrapped paragraphs, real images that load after the markup
// does, a table, a code fence, nested lists, a callout, 200+ lines) and it
// measures BOTH directions at several positions including the bottom, in each
// of the states the view is actually in: after a mid-document edit, across a
// view switch, after a save, after the sidebar has been resized, at two widths.
//
// The number is always the same one: put a heading at the top of one pane, and
// ask how far the same heading is from the top of the other. Zero is perfect,
// and the tolerance below is about one line of prose, because that is the
// point where a reader stops being able to tell.
const { boot } = require("./lib.js");

const TITLE = "Split scroll, the real shape";
//: One line of body text. Past this, the two panes are showing different
//: paragraphs and the feature is not doing its job.
const TOLERANCE = 24;

const failures = [];
function check(ok, line) {
  if (!ok) failures.push(line);
  console.log(`${ok ? "ok  " : "FAIL"}  ${line}`);
}

//: The headings the measurements are taken at. Named rather than indexed, so a
//: failure says which part of the document drifted.
const MARKS = ["Beginnings", "The middle", "Pictures", "Tables and code", "Lists", "The end"];

function realDocument() {
  const out = [];
  //: Frontmatter: taken out of the body before rendering and put back as a
  //: properties block, which is one of the two things `docPreviewLineShift`
  //: has to undo. A document written by the vault import has this.
  out.push("---", "title: Split scroll", "tags: probe, documents", "status: draft", "---", "");
  out.push("# A document with the usual furniture", "");
  out.push(
    "This opening paragraph is deliberately long enough to wrap several times in a pane that is half the window wide, because a wrapped line is one source line and several rendered ones and that is exactly the arithmetic the map has to get right.",
    ""
  );
  for (const mark of MARKS) {
    out.push(`## ${mark}`, "");
    //: A real image, same origin, whose height is not known until it loads:
    //: the suspect named in the report, since a block that grows after the
    //: anchors were measured moves every anchor below it.
    out.push(`![the app icon](/icon-512.png)`, "");
    out.push(
      `Under ${mark} there is a paragraph that runs on for long enough to wrap two or three times at half a window, so that the source's line count and the preview's height disagree in the ordinary way rather than only at the furniture.`,
      ""
    );
    out.push("> [!note]", "> A callout, which renders as its own box and is four lines of source.", "");
    out.push("- a list item", "  - a nested item", "  - another nested item", "    - deeper still", "- back out again", "");
    out.push("| column | column | column |", "| --- | --- | --- |", "| 1 | 2 | 3 |", "| 4 | 5 | 6 |", "| 7 | 8 | 9 |", "");
    out.push("```python", "def example():", '    """A fence of a few lines."""', "    return 1 + 2", "```", "");
    for (let n = 0; n < 4; n += 1) {
      out.push(
        `Paragraph ${n} under ${mark}, again long enough to wrap, so that the space between two headings is made of prose and not only of blocks whose heights are fixed.`,
        ""
      );
    }
  }
  return out.join("\n");
}

//: Where a heading is, in each pane's own scrolled coordinates. Asked of
//: CodeMirror's height map on the source side (it answers for the whole
//: document, not only the rendered part) and, on the preview side, of the
//: block's rect corrected by the pane's own rect and scroll.
//:
//: **Not `offsetTop`, and that is the whole reason this file exists.** The
//: probe that closed INBOX 274's split-view item read `offsetTop` on the
//: preview side, and so did the code it was measuring. `offsetTop` is taken
//: from the nearest positioned ancestor, which is not the preview: measured
//: here, it ran 218px past the block's true offset in the pane with the
//: sidebar open and 146px with it collapsed. The same bias on both sides of
//: the subtraction cancels, so the probe reported 0px from a pane that was a
//: paragraph and a half out, and the owner reported it again (INBOX 278).
//: A probe that shares its subject's mistake cannot see it.
const PLACES = (heading) => {
  const preview = document.getElementById("doc-preview");
  const editor = docSurface();
  const lines = editor.text.split("\n");
  const line = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (line < 0) return { missing: "source line" };
  const view = editor.view;
  const srcTop = view
    ? view.lineBlockAt(view.state.doc.line(line + 1).from).top
    : (line / lines.length) * editor.scrollHeight;
  const block = [...preview.querySelectorAll("h2, h3, h4, h5")].find(
    (h) => h.textContent.trim().startsWith(heading)
  );
  if (!block) return { missing: "preview block" };
  return {
    line,
    srcTop,
    prevTop:
      block.getBoundingClientRect().top
      - preview.getBoundingClientRect().top
      + preview.scrollTop,
    offsetTopBias: Math.round(
      block.offsetTop
        - (block.getBoundingClientRect().top
          - preview.getBoundingClientRect().top
          + preview.scrollTop)
    ),
    srcRange: editor.scrollHeight - editor.clientHeight,
    prevRange: preview.scrollHeight - preview.clientHeight,
  };
};

async function settle(page, ms = 420) {
  await page.waitForTimeout(ms);
}

//: Scroll the source so the heading sits at its top, then ask how far the same
//: heading is from the top of the preview.
async function forward(page, heading) {
  return page.evaluate(async (name) => {
    const preview = document.getElementById("doc-preview");
    const editor = docSurface();
    const places = window.__places(name);
    if (places.missing) return places;
    editor.scrollTop = Math.round(places.srcTop);
    editor.scrollEl.dispatchEvent(new Event("scroll"));
    await new Promise((r) => setTimeout(r, 380));
    const after = window.__places(name);
    return {
      heading: name,
      //: Measured against where the source ACTUALLY landed, not where it was
      //: asked to go: a virtualised editor corrects its own height map mid
      //: scroll, and blaming the map for that is how a probe reports a fault
      //: it created.
      srcOffset: Math.round(after.srcTop - editor.scrollTop),
      error: Math.round(after.prevTop - preview.scrollTop),
      previewH: preview.clientHeight,
    };
  }, heading);
}

//: And the other way: scroll the preview so the heading's block sits at its
//: top, then ask where the source is.
async function reverse(page, heading) {
  return page.evaluate(async (name) => {
    const preview = document.getElementById("doc-preview");
    const editor = docSurface();
    const places = window.__places(name);
    if (places.missing) return places;
    preview.scrollTop = Math.round(places.prevTop);
    preview.dispatchEvent(new Event("scroll"));
    await new Promise((r) => setTimeout(r, 380));
    const after = window.__places(name);
    return {
      heading: name,
      prevOffset: Math.round(after.prevTop - preview.scrollTop),
      error: Math.round(after.srcTop - editor.scrollTop),
      editorH: editor.clientHeight,
    };
  }, heading);
}

async function pass(page, label) {
  console.log(`\n--- ${label} ---`);
  let worst = 0;
  for (const heading of MARKS) {
    const f = await forward(page, heading);
    if (f.missing) {
      check(false, `${label} ${heading}: no ${f.missing}`);
      continue;
    }
    const r = await reverse(page, heading);
    if (r.missing) {
      check(false, `${label} ${heading}: no ${r.missing}`);
      continue;
    }
    console.log(
      `  ${heading.padEnd(16)} source->preview ${String(f.error).padStart(6)}px ` +
        `(source landed ${String(f.srcOffset).padStart(4)}px off its own mark)   ` +
        `preview->source ${String(r.error).padStart(6)}px ` +
        `(preview landed ${String(r.prevOffset).padStart(4)}px off)`
    );
    worst = Math.max(worst, Math.abs(f.error), Math.abs(r.error));
    check(
      Math.abs(f.error) <= TOLERANCE,
      `${label} ${heading} source to preview within ${TOLERANCE}px (${f.error})`
    );
    check(
      Math.abs(r.error) <= TOLERANCE,
      `${label} ${heading} preview to source within ${TOLERANCE}px (${r.error})`
    );
  }
  console.log(`  worst in this pass: ${worst}px`);
  return worst;
}

async function openTheDocument(page) {
  const id = await page.evaluate(async (body) => {
    const list = await apiPagedList("/documents", 100);
    const found = list.find((d) => d.title === body.title);
    if (found) {
      await apiJson(`/documents/${found.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: body.title, content: body.content }),
      });
      return found.id;
    }
    const made = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title: body.title, content: body.content }),
    });
    return made.id;
  }, { title: TITLE, content: realDocument() });
  await page.evaluate(async (docId) => {
    await switchTab("documents");
    await openDocument(docId);
  }, id);
  await page.waitForTimeout(2600);
  await page.evaluate(() => setDocView("split"));
  await page.waitForTimeout(1600);
  //: Every image decoded before anything is measured in the baseline pass, so
  //: "an image that loads late" is a case this probe can test on purpose
  //: rather than one it trips over by accident.
  await page.evaluate(async () => {
    const images = [...document.querySelectorAll("#doc-preview img")];
    await Promise.all(images.map((img) => (img.complete ? null : img.decode().catch(() => {}))));
  });
  await page.waitForTimeout(400);
  return id;
}

(async () => {
  for (const width of [1440, 1024]) {
    const { browser, page } = await boot({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
    await page.waitForTimeout(1500);
    await openTheDocument(page);
    await page.evaluate(`window.__places = ${PLACES.toString()}`);

    const setup = await page.evaluate(() => {
      const preview = document.getElementById("doc-preview");
      const editor = docSurface();
      return {
        engine: editor?.kind,
        blocks: preview.childElementCount,
        stamped: [...preview.children].filter((b) => b.dataset.srcLine !== undefined).length,
        images: preview.querySelectorAll("img").length,
        lines: editor.text.split("\n").length,
        previewRange: preview.scrollHeight - preview.clientHeight,
        editorRange: editor.scrollHeight - editor.clientHeight,
        shift: typeof docPreviewLineShift === "number" ? docPreviewLineShift : "missing",
        //: Stated rather than assumed away: how far `offsetTop` is from the
        //: truth in this layout, which is the bias that hid the fault.
        offsetTopBias: (() => {
          const b = preview.querySelector("[data-src-line]");
          if (!b) return "no block";
          return Math.round(
            b.offsetTop
              - (b.getBoundingClientRect().top
                - preview.getBoundingClientRect().top
                + preview.scrollTop)
          );
        })(),
      };
    });
    console.log(`\n===== ${width}px =====`);
    console.log(`setup: ${JSON.stringify(setup)}`);
    //: One block is not stamped on purpose and must not be: the properties
    //: block `renderDocPreview` inserts for a document with frontmatter is not
    //: anything the author wrote a line of, so it has no source line and
    //: `docScrollAnchors` skips it.
    check(
      setup.stamped >= setup.blocks - 1,
      `${width} every block but the properties one is stamped (${setup.stamped}/${setup.blocks})`
    );
    check(setup.lines >= 200, `${width} the document is 200+ lines (${setup.lines})`);
    check(setup.images > 0, `${width} it has real images (${setup.images})`);

    await pass(page, `${width} baseline`);

    // --- typing a new line mid-document -------------------------------------
    await page.evaluate(() => {
      const editor = docSurface();
      const line = editor.text.split("\n").findIndex((l) => l.trim() === "## Pictures");
      const at = editor.text.split("\n").slice(0, line).join("\n").length + 1;
      editor.replaceRange(at, at, "A line typed in the middle of the document.\n\n");
    });
    await settle(page, 900);
    await pass(page, `${width} after typing mid-document`);

    // --- Live, then back to Split -------------------------------------------
    await page.evaluate(() => setDocView("live"));
    await settle(page, 900);
    await page.evaluate(() => setDocView("split"));
    await settle(page, 1200);
    await pass(page, `${width} after live then split`);

    // --- a save --------------------------------------------------------------
    await page.evaluate(async () => {
      if (typeof saveDocument === "function") await saveDocument();
    });
    await settle(page, 1400);
    await pass(page, `${width} after a save`);

    // --- the sidebar resized -------------------------------------------------
    const resized = await page.evaluate(() => {
      //: The panes' widths change, so every wrapped line rewraps and every
      //: anchor moves. The cache token has to notice.
      const before = document.getElementById("doc-preview").clientWidth;
      //: The app's own collapse, which is a class on the aside and one on its
      //: parent (`applySidebarSheetMode`, app.js), rather than a button this
      //: probe would have to find.
      const aside = document.getElementById("doc-sidebar");
      aside.classList.toggle("sidebar-collapsed");
      aside.parentElement?.classList.toggle("layout-sidebar-collapsed");
      return { before, collapsed: aside.classList.contains("sidebar-collapsed") };
    });
    await settle(page, 1000);
    const widths = await page.evaluate(() => document.getElementById("doc-preview").clientWidth);
    console.log(`  sidebar: ${JSON.stringify(resized)} preview width ${resized.before} -> ${widths}`);
    await pass(page, `${width} after the sidebar moved`);

    check(errors.length === 0, `${width} no page errors (${errors.join("; ")})`);
    await browser.close();
  }

  console.log(
    failures.length ? `\n${failures.length} FAILURES:\n  ` + failures.join("\n  ") : "\nall checks passed"
  );
  process.exit(failures.length ? 1 : 0);
})();
