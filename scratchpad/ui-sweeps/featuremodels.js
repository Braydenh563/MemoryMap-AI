// A model per feature: Settings' list, the per-row reset, the mass reset, and
// the inline picker in each of the three surfaces.
//
// Asked for directly: "allow the user to alter the model they use for that
// specific feature ... individually altered and reset and for there to be a
// mass reset for all individually altered ai model preferences."
//
// **What is real here and what is not.** Every model preference in this sweep
// is set and read through the real server: the POSTs are real, the rows come
// back from `/models/status`'s own `feature_models`, and the reset really
// clears them. The one thing that is patched is the *backend being up*: this
// sandbox has no Ollama, `ollama_running` comes back false and Settings hides
// `#models-config` whole, so nothing about the list could be measured at all.
// So the status response is fetched from the server and two fields are
// rewritten on the way through: `ollama_running` and `installed_models`.
// `feature_models` is left exactly as the server resolved it, which is the
// part under test.
//
// Numbers, never a screenshot (CLAUDE.md section 5): getBoundingClientRect for
// geometry, getComputedStyle for the disabled reading, and the row's own text
// for what it says it is on.
const { boot } = require("./lib.js");

const MODELS = ["llama3.2", "gemma4:12b", "mistral-nemo"];
const fail = [];
const check = (ok, message) => { if (!ok) fail.push(message); };

(async () => {
  const { browser, page } = await boot();

  await page.route("**/models/status", async (route) => {
    const response = await route.fetch();
    let body;
    try {
      body = await response.json();
    } catch {
      return route.fulfill({ response });
    }
    body.ollama_running = true;
    body.installed_models = MODELS.map((name) => ({ name, size: 2000000000 }));
    body.chat_model = body.chat_model || "llama3.2";
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  const rows = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("#feature-models-row-probe, .feature-model-row")].map((row) => {
        const box = row.getBoundingClientRect();
        const select = row.querySelector("select");
        //: The shell `enhanceSelect` wraps it in, which is what is on screen;
        //: the native select is one pixel wide and aria-hidden by then.
        const shell = row.querySelector(".select-shell") || select;
        const reset = row.querySelector(".feature-model-reset");
        const style = getComputedStyle(row.querySelector(".feature-model-state"));
        return {
          key: row.dataset.feature,
          overridden: row.dataset.overridden,
          label: row.querySelector(".feature-model-label").textContent.trim(),
          state: row.querySelector(".feature-model-state").textContent.trim(),
          stateColour: style.color,
          selected: select ? select.value : null,
          selectWidth: shell ? Math.round(shell.getBoundingClientRect().width) : 0,
          resetDisabled: reset ? reset.disabled : null,
          resetOpacity: reset ? Number(getComputedStyle(reset).opacity).toFixed(2) : null,
          height: Math.round(box.height),
          width: Math.round(box.width),
        };
      })
    );

  const massReset = () =>
    page.evaluate(() => {
      const button = document.getElementById("feature-models-reset");
      return {
        disabled: button.disabled,
        title: button.title,
        note: document.getElementById("feature-models-reset-note").textContent.trim(),
      };
    });

  const openModels = async () => {
    await page.evaluate(() => openSettingsModal("models"));
    await page.waitForTimeout(1500);
  };
  const closeSettings = async () => {
    await page.evaluate(() => {
      if (typeof closeSettingsModal === "function") closeSettingsModal();
      else document.getElementById("settings-modal")?.classList.add("hidden");
    });
    await page.waitForTimeout(400);
  };

  // --- the list, at rest -----------------------------------------------------
  await page.evaluate(() =>
    fetch("/models/feature-models/reset", {
      method: "POST",
      headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() },
    })
  );
  await openModels();
  const atRest = await rows();
  check(atRest.length >= 3, `expected a row per feature, got ${atRest.length}`);
  check(
    atRest.every((row) => row.state.startsWith("Inherited: ")),
    "a row at rest does not read as inherited: " +
      JSON.stringify(atRest.map((r) => r.state))
  );
  check(
    atRest.every((row) => row.state.replace("Inherited: ", "").length > 0),
    "an inherited row does not name the model it inherits"
  );
  check(
    atRest.every((row) => row.resetDisabled === true),
    "a per-row reset is live while the row is inherited"
  );
  check(
    atRest.every((row) => row.selectWidth > 80),
    "a row's select is collapsed: " + JSON.stringify(atRest.map((r) => r.selectWidth))
  );
  check(
    atRest.every((row) => row.height >= 28),
    "a row is shorter than a control: " + JSON.stringify(atRest.map((r) => r.height))
  );
  const restMass = await massReset();
  check(restMass.disabled === true, "the mass reset is live with nothing to clear");
  check(
    /no feature has a model of its own/i.test(restMass.note),
    `the mass reset note at rest reads "${restMass.note}"`
  );

  // --- changing one row ------------------------------------------------------
  await page.evaluate((model) => {
    const row = document.querySelector('.feature-model-row[data-feature="writing"]');
    const select = row.querySelector("select");
    select.value = model;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, "gemma4:12b");
  await page.waitForTimeout(2500);
  const afterOne = await rows();
  const writing = afterOne.find((row) => row.key === "writing");
  const others = afterOne.filter((row) => row.key !== "writing");
  check(
    writing && writing.state === "Its own model: gemma4:12b",
    `the changed row reads "${writing && writing.state}"`
  );
  check(writing && writing.resetDisabled === false, "the changed row's reset stayed disabled");
  check(
    others.every((row) => row.state.startsWith("Inherited: ")),
    "changing one row moved another: " + JSON.stringify(others.map((r) => r.state))
  );
  check(
    others.every((row) => row.resetDisabled === true),
    "another row's reset went live"
  );
  check(
    writing && writing.stateColour !== others[0].stateColour,
    "an overridden row is drawn the same as an inherited one"
  );
  const oneMass = await massReset();
  check(oneMass.disabled === false, "the mass reset is dead with one override to clear");
  check(/one feature/i.test(oneMass.note), `the mass reset note reads "${oneMass.note}"`);

  // --- the inline picker, in each of the three surfaces ----------------------
  await closeSettings();

  // The writing desk's own dock menu.
  await page.evaluate(() => {
    switchTab("notes");
    document.querySelector('[data-section="writing-room"]')?.click();
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.getElementById("draft-model").click());
  await page.waitForTimeout(700);
  const sheet = await page.evaluate(() => {
    const overlay = document.querySelector('.sheet-overlay[data-sheet^="feature-model-"]');
    if (!overlay) return null;
    const card = overlay.querySelector(".sheet-card");
    const box = card.getBoundingClientRect();
    return {
      name: overlay.dataset.sheet,
      title: overlay.querySelector(".sheet-title").textContent.trim(),
      rows: [...overlay.querySelectorAll(".sheet-row")].map((row) => ({
        text: row.textContent.trim(),
        height: Math.round(row.getBoundingClientRect().height),
      })),
      width: Math.round(box.width),
      inside: box.left >= 0 && box.right <= window.innerWidth + 1,
    };
  });
  check(sheet !== null, "the writing desk's model picker did not open");
  if (sheet) {
    check(sheet.name === "feature-model-writing", `the sheet opened as ${sheet.name}`);
    check(
      sheet.rows.length === MODELS.length + 1,
      `the picker offers ${sheet.rows.length} rows for ${MODELS.length} models plus inherited`
    );
    check(
      sheet.rows.every((row) => row.height >= 40),
      "a picker row is under the touch target: " + JSON.stringify(sheet.rows.map((r) => r.height))
    );
    check(sheet.inside, `the picker sits outside the window at ${sheet.width}px`);
  }
  // Pick a model from the sheet, and check Settings then says the same thing.
  await page.evaluate((model) => {
    const rows = [...document.querySelectorAll('.sheet-overlay[data-sheet^="feature-model-"] .sheet-row')];
    rows.find((row) => row.textContent.trim() === model)?.click();
  }, "mistral-nemo");
  await page.waitForTimeout(2500);
  await openModels();
  const afterSheet = await rows();
  const writingAfter = afterSheet.find((row) => row.key === "writing");
  check(
    writingAfter && writingAfter.state === "Its own model: mistral-nemo",
    `after the inline picker Settings reads "${writingAfter && writingAfter.state}"`
  );
  await closeSettings();

  // The Chat tab's own ⋯, which is a kebabMenu.
  await page.evaluate(() => switchTab("chat"));
  await page.waitForTimeout(900);
  const chatOpened = await page.evaluate(() => {
    const opener = document.querySelector("#chat-actions-menu .menu-wrap > button");
    if (!opener) return false;
    opener.click();
    return true;
  });
  await page.waitForTimeout(500);
  //: Document-wide, not inside `#chat-actions-menu`: `kebabMenu` calls
  //: `wireEscapedActionMenu`, which reparents the open dropdown out of its
  //: container so a scrolling ancestor cannot clip it.
  const chatRow = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".action-menu:not(.hidden) .menu-item")];
    const row = items.find((item) => /model for this feature/i.test(item.textContent));
    if (!row) return null;
    row.click();
    return { text: row.textContent.trim(), items: items.length };
  });
  check(chatOpened, "the chat ⋯ has no opener");
  check(chatRow !== null, "the chat ⋯ has no model row");
  await page.waitForTimeout(700);
  await page.evaluate((model) => {
    const rows = [...document.querySelectorAll('.sheet-overlay[data-sheet="feature-model-chat"] .sheet-row')];
    rows.find((row) => row.textContent.trim() === model)?.click();
  }, "gemma4:12b");
  await page.waitForTimeout(2500);

  // The documents editor's own dock menu.
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(1200);
  const docOpened = await page.evaluate(() => {
    const button = document.getElementById("doc-ai-model");
    if (!button) return false;
    button.click();
    return true;
  });
  await page.waitForTimeout(700);
  const docSheet = await page.evaluate(
    () => document.querySelector('.sheet-overlay[data-sheet="feature-model-documents"]') !== null
  );
  check(docOpened, "the documents editor has no model row");
  check(docSheet, "the documents model picker did not open");
  await page.evaluate((model) => {
    const rows = [...document.querySelectorAll('.sheet-overlay[data-sheet="feature-model-documents"] .sheet-row')];
    rows.find((row) => row.textContent.trim() === model)?.click();
  }, "llama3.2");
  await page.waitForTimeout(2500);

  // --- the mass reset --------------------------------------------------------
  await openModels();
  const beforeReset = await rows();
  const overridden = beforeReset.filter((row) => row.overridden === "1").length;
  check(overridden === 3, `expected three overridden rows before the reset, got ${overridden}`);
  const beforeMass = await massReset();
  check(/3 features/i.test(beforeMass.note), `the mass reset note reads "${beforeMass.note}"`);
  await page.evaluate(() => document.getElementById("feature-models-reset").click());
  await page.waitForTimeout(2500);
  const afterReset = await rows();
  check(
    afterReset.every((row) => row.overridden === "0"),
    "the mass reset left a row overridden: " + JSON.stringify(afterReset.map((r) => r.state))
  );
  check(
    afterReset.every((row) => row.resetDisabled === true),
    "a per-row reset stayed live after the mass reset"
  );
  const endMass = await massReset();
  check(endMass.disabled === true, "the mass reset stayed live with nothing left to clear");

  // --- the same list at a phone's width --------------------------------------
  //
  // Three columns do not fit in 390px, so the row folds to a name on its own
  // line above the select and the reset (01-forms-settings.css). What is
  // measured is the fold doing its job: no row wider than the pane it is in,
  // and a select still wide enough to read a model name in.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(600);
  await openModels();
  const phone = await page.evaluate(() => {
    const pane = document.querySelector("#feature-models-list");
    return [...document.querySelectorAll(".feature-model-row")].map((row) => {
      const box = row.getBoundingClientRect();
      const shell = row.querySelector(".select-shell");
      return {
        key: row.dataset.feature,
        width: Math.round(box.width),
        height: Math.round(box.height),
        select: shell ? Math.round(shell.getBoundingClientRect().width) : 0,
        overflows: Math.round(box.right) > Math.round(pane.getBoundingClientRect().right) + 1,
      };
    });
  });
  check(
    phone.every((row) => !row.overflows),
    "a row overflows its pane at 390: " + JSON.stringify(phone)
  );
  check(
    phone.every((row) => row.select > 120),
    "a select is unreadably narrow at 390: " + JSON.stringify(phone.map((r) => r.select))
  );

  console.log(
    JSON.stringify(
      {
        rows: atRest.length,
        atRest: atRest.map((r) => `${r.key}: ${r.state} (${r.height}px, select ${r.selectWidth}px)`),
        afterOne: afterOne.map((r) => `${r.key}: ${r.state}`),
        sheet,
        chatRow,
        afterReset: afterReset.map((r) => `${r.key}: ${r.state}`),
        phone: phone.map((r) => `${r.key}: ${r.width}x${r.height}, select ${r.select}px`),
        findings: fail,
      },
      null,
      1
    )
  );
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
