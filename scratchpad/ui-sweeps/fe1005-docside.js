// fe1005: the document sidebar's tabs at 1024 (audit FE-19: "Outline" cut
// 7px and overlapped by the collapse toggle).
//   BASE=http://127.0.0.1:8842 WIDTH=1024 node fe1005-docside.js
const { boot } = require("./lib.js");
(async () => {
  const width = Number(process.env.WIDTH || 1024);
  const { browser, page } = await boot({ viewport: { width, height: 768 } });
  const out = await page.evaluate(async () => {
    await ensureModule("library");
    const res = await api("/documents", { method: "POST", body: JSON.stringify({ title: "fe1005 side", content: "# One\n\nWords.\n\n## Two\n" }) });
    const id = (await res.json()).id;
    await switchTab("documents");
    await openDocument(id);
    await new Promise((r) => setTimeout(r, 1500));
    const side = document.getElementById("doc-sidebar");
    const toggle = side && side.querySelector(".sidebar-collapse-toggle");
    const t = toggle && toggle.getBoundingClientRect();
    const strip = document.getElementById("doc-sidebar-tabs");
    const cs = strip && getComputedStyle(strip);
    const info = strip && `strip client=${strip.clientWidth} scroll=${strip.scrollWidth} padR=${cs.paddingRight} side=${Math.round(side.getBoundingClientRect().width)} toggleL=${Math.round(t.left - side.getBoundingClientRect().left)}`;
    return [info].concat([...(side ? side.querySelectorAll('[role="tab"], .doc-sidebar-tabs button') : [])]
      .filter((b) => b.getBoundingClientRect().width > 0)
      .map((b) => {
        const r = b.getBoundingClientRect();
        const cut = Math.max(0, b.scrollWidth - b.clientWidth);
        const under = t && r.right > t.left && r.left < t.right && r.bottom > t.top && r.top < t.bottom;
        return `${b.textContent.trim()}: w=${Math.round(r.width)} right=${Math.round(r.right - side.getBoundingClientRect().left)} cut=${cut}${under ? " UNDER-TOGGLE" : ""}`;
      }));
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
