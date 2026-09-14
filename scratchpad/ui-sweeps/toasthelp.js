const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  const out = await page.evaluate(async () => {
    toast("Couldn't save the note (500)", true);
    const note = document.querySelector("#toast-box .toast.error");
    const btn = note?.querySelector(".toast-help");
    const r = note?.getBoundingClientRect(), b = btn?.getBoundingClientRect();
    const errs = [];
    const orig = console.error; console.error = (...a) => errs.push(String(a[0]));
    let threw = null;
    try { await emailSupportReport("probe"); } catch (e) { threw = String(e); }
    console.error = orig;
    return { toast: r && [Math.round(r.width), Math.round(r.height)], button: b && [Math.round(b.width), Math.round(b.height)], inside: b && r && b.right <= r.right + 1 && b.bottom <= r.bottom + 1, threw, errs: errs.slice(0, 2), toasts: [...document.querySelectorAll("#toast-box .toast")].map((t) => t.textContent.slice(0, 60)) };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
