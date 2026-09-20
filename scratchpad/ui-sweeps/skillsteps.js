// DOCUMENTS_PLAN Phase 8c, the half that lives in a file this plan owns: the
// skill editor's steps box gets the "/" menu, and only that.
//
// Two things need measuring, and a lint can see neither. First, that the menu
// opens at all in a box nothing had wired before, which is this repo's
// "a feature that never ran once" shape: `EDITOR_SURFACES` is a table, and a
// row added to it looks correct whether or not the delegated listener reaches
// that box. Second, that what the menu offers is the steps box's own
// vocabulary rather than the note commands, because a callout or a table
// inserted into a list of instructions is not a step.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => {
  if (!c) bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`);
};

(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  //: **Documents first, and it is not optional.** `documents.js` is loaded
  //: lazily, and `editorSurfaceFor` falls through to `asSurface` in that
  //: file: without this line every surface question answers null and the
  //: probe reports the feature missing when it is only unloaded. The same
  //: line, and the same reason, is in `draftboxes.js`.
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2200);

  //: The skill editor is a Settings section, and its tool picker is rendered
  //: when that section is shown, so the section is opened rather than the
  //: dialog alone.
  //: `openSettingsModal('skills')`, which is the app's own entry point and the
  //: one `prefssave.js` uses. An earlier draft of this probe called
  //: `openSettings()` behind a `typeof` guard: there is no such function, so
  //: the guard swallowed it, the dialog never opened, and every assertion
  //: below still passed because it read values off a form nobody could see.
  //: A guarded call to a name that does not exist is a probe that measures
  //: nothing and says PASS.
  const opened = await page.evaluate(async () => {
    openSettingsModal("skills");
    await new Promise((r) => setTimeout(r, 1800));
    const box = document.getElementById("skill-steps");
    if (!box) return { error: "no steps box" };
    box.scrollIntoView();
    return {
      //: `getBoundingClientRect`, not `offsetParent`: Settings is a dialog
      //: and a `position: fixed` ancestor makes `offsetParent` null for
      //: everything inside it, so that test called a box on screen hidden.
      height: Math.round(box.getBoundingClientRect().height),
      rows: box.rows,
      tools: document.querySelectorAll("#skill-tool-list input").length,
    };
  });
  console.log("      steps box:", JSON.stringify(opened));
  ok("the skill editor's steps box is on screen", opened.height > 20, `${opened.height}px tall`);
  ok("and its tool picker has rendered", opened.tools > 0, `${opened.tools} tools`);

  const kind = await page.evaluate(() => editorSurfaceKind(document.getElementById("skill-steps")));
  ok("it is a surface the '/' menu knows", kind === "skill", JSON.stringify(kind));

  //: With nothing declared yet, the menu must say so rather than open empty.
  const empty = await page.evaluate(() => {
    document.getElementById("skill-inputs").value = "";
    for (const t of document.querySelectorAll("#skill-tool-list input:checked")) t.checked = false;
    return editorCommands("skill").map((c) => ({ id: c.id, label: c.label, group: c.group }));
  });
  console.log("      empty:", JSON.stringify(empty));
  ok("an empty form offers one row that explains itself", empty.length === 1, `${empty.length} rows`);
  ok("and it is not an insertion", empty[0] && empty[0].id === "skill-nothing-yet", JSON.stringify(empty[0]));

  //: Now the real case: two inputs declared, one of them with a question
  //: after a colon, and a tool ticked.
  const filled = await page.evaluate(() => {
    document.getElementById("skill-inputs").value = "tag: Which tag should I file?\nweek";
    const first = document.querySelector("#skill-tool-list input");
    if (first) first.checked = true;
    const commands = editorCommands("skill");
    return {
      tool: first ? first.value : null,
      rows: commands.map((c) => ({ id: c.id, label: c.label, group: c.group })),
      //: The note commands must not be in here at all.
      leaked: commands.filter((c) => /callout|columns|table|properties|blockref/.test(c.id)).length,
    };
  });
  console.log("      filled:", JSON.stringify(filled));
  ok(
    "each declared input is offered with its braces",
    filled.rows.some((r) => r.label.includes("{{tag}}")) && filled.rows.some((r) => r.label.includes("{{week}}")),
    JSON.stringify(filled.rows.map((r) => r.label))
  );
  //: The colon is the question, not part of the name: `{{tag: Which tag...}}`
  //: is the bug this asserts against.
  ok(
    "and the question after the colon is not in the placeholder",
    filled.rows.every((r) => !r.label.includes("Which tag")),
    JSON.stringify(filled.rows.map((r) => r.label))
  );
  ok(
    "the ticked tool is offered by its exact name",
    filled.tool !== null && filled.rows.some((r) => r.label.endsWith(filled.tool)),
    `${filled.tool} against ${JSON.stringify(filled.rows.map((r) => r.label))}`
  );
  ok("no note command leaks in", filled.leaked === 0, `${filled.leaked} leaked`);

  //: And running one puts the text in the box at the caret, which is the only
  //: assertion that proves the command's `run` reaches this surface.
  const inserted = await page.evaluate(() => {
    const box = document.getElementById("skill-steps");
    box.value = "Find my notes tagged ";
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
    const surface = editorSurfaceFor(box);
    const command = editorCommands("skill").find((c) => c.id === "skill-input-tag");
    command.run(surface);
    return box.value;
  });
  console.log("      after running it:", JSON.stringify(inserted));
  ok("running it writes the placeholder at the caret", inserted === "Find my notes tagged {{tag}}", JSON.stringify(inserted));

  //: And the part no table can promise: that typing "/" in this box opens the
  //: menu. `EDITOR_SURFACES` is a lookup, and a row in it reads as correct
  //: whether or not the delegated listener ever reaches this textarea, which
  //: is this repo's "a feature that never ran once" shape. Typed as a real
  //: key through the page, not dispatched.
  await page.click("#skill-steps");
  await page.evaluate(() => {
    const box = document.getElementById("skill-steps");
    box.value = "";
    box.setSelectionRange(0, 0);
  });
  await page.keyboard.type("/");
  await page.waitForTimeout(700);
  const menu = await page.evaluate(() => {
    const el = document.getElementById("editor-menu");
    if (!el) return { error: "no menu element" };
    const box = el.getBoundingClientRect();
    return {
      open: !el.classList.contains("hidden"),
      w: Math.round(box.width),
      h: Math.round(box.height),
      groups: [...el.querySelectorAll(".editor-menu-group")].map((g) => g.textContent.trim()),
      items: [...el.querySelectorAll(".editor-menu-item")].map((i) =>
        i.textContent.trim().replace(/\s+/g, " ").slice(0, 40)
      ),
    };
  });
  console.log("      menu:", JSON.stringify(menu));
  ok("typing '/' opens the menu in this box", menu.open === true && menu.h > 20, JSON.stringify(menu));
  ok(
    "and it is the skill menu, not the note one",
    menu.groups.length > 0 && menu.groups.every((g) => /Answers|Tools|Nothing/.test(g)),
    JSON.stringify(menu.groups)
  );

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
