// INBOX 455 (1): the "+N" opens what folded, by mouse and by keyboard, and a
// row does what its chip does (a tag filters the list).
const {boot}=require('./lib.js');
(async()=>{
  const {browser,page}=await boot({viewport:{width:+(process.env.W||1100),height:900}});
  const errors=[];page.on("pageerror",(e)=>errors.push(String(e)));
  await page.evaluate(()=>{switchTab("notes");window.showNotesSection&&showNotesSection("browse");});
  await page.waitForTimeout(1500);
  const more=page.locator("#entry-list > li[data-id] .note-meta-more:not([hidden])").first();
  const label=await more.getAttribute("aria-label"), title=await more.getAttribute("title");
  await more.click();
  await page.waitForTimeout(300);
  const rows=await page.evaluate(()=>[...document.querySelectorAll(".action-menu:not(.hidden) [role=menuitem]")].map((r)=>r.textContent.trim()));
  const focused=await page.evaluate(()=>document.activeElement?.getAttribute("role"));
  await page.keyboard.press("Escape");
  await more.focus();await page.keyboard.press("Enter");await page.waitForTimeout(300);
  const byKey=await page.evaluate(()=>document.querySelectorAll(".action-menu:not(.hidden) [role=menuitem]").length);
  const tag=rows.find((r)=>!r.startsWith("+"));
  await page.locator(".action-menu:not(.hidden) [role=menuitem]").filter({hasText:tag}).first().click();
  await page.waitForTimeout(800);
  const filter=await page.evaluate(()=>document.querySelector("#entry-filter, #notes-filter, input[placeholder^='Filter notes']")?.value);
  console.log(JSON.stringify({label,title,rows,focused,byKey,tag,filter,errors}));
  await browser.close();
})();
