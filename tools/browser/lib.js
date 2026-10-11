const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = (process.env.SCRATCH||'.') + '/shots';
require('fs').mkdirSync(OUT,{recursive:true});
const PW = 'testpassword123';
const BASE = process.env.BASE || 'http://127.0.0.1:8781';
async function boot(opts={}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: opts.viewport||{width:1440,height:900}, deviceScaleFactor:1});
  const page = await ctx.newPage();
  page.on('pageerror', e=>console.log('PAGEERROR:', e.message, '\n', (e.stack||'').split('\n').slice(0,6).join('\n')));
  page.on('console', m=>{ if(m.type()==='error') console.log('CONSOLE-ERR:', m.text().slice(0,160)); });
  await page.goto(BASE + '/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#lock-password', {state:'visible', timeout:20000});
  await page.fill('#lock-password', PW);
  await page.click('#lock-submit');
  await page.waitForTimeout(3000);
  if (await page.$('#lock-password') && await page.isVisible('#lock-password')) {
    await page.fill('#lock-password', PW); await page.click('#lock-submit'); await page.waitForTimeout(3000);
  }
  //: Close the welcome through its own Skip so the first-run queue advances (hiding the overlay by class
  //: leaves the recovery-key offer waiting behind it for ever); hide by class only if Skip is missing.
  if (await page.isVisible('#onboarding-skip').catch(()=>false)) await page.click('#onboarding-skip');
  await page.evaluate(()=>{ const o=document.getElementById('onboarding-overlay'); if(o) o.classList.add('hidden'); });
  await page.waitForTimeout(800);
  //: A first unlock queues a recovery-key offer (a modal <dialog>) behind the welcome and the tour; once
  //: it draws it blocks every click. Wait briefly for it, then take "Skip for now". Absent on later unlocks.
  try {
    await page.waitForSelector('#recovery-key-dialog[open] #recovery-key-skip', {state:'visible', timeout: 4000});
    await page.click('#recovery-key-skip');
    await page.waitForSelector('#recovery-key-dialog[open]', {state:'detached', timeout: 2000});
  } catch (e) { /* no offer this run */ }
  return {browser, ctx, page, OUT};
}
module.exports = {boot, OUT, PW, BASE};
