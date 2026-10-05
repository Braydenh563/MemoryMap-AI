// INBOX 621: every dock in the app and how to reach it, shared by
// dockshots621.js and dockgrammar621.js. Each stop is [name, go(page), selector].
const tab = (t, sub) => async (page) => {
  // On a phone the tab strip is the bottom dock; a click by evaluate reaches
  // the button wherever the shell has put it.
  await page.evaluate((t) => document.querySelector(`[data-tab="${t}"]`)?.click(), t);
  await page.waitForTimeout(700);
  if (sub) {
    await page.evaluate((s) => document.querySelector(s)?.click(), sub);
    await page.waitForTimeout(700);
  }
};
const settings = (pane) => async (page) => {
  await page.evaluate(() => document.getElementById('settings-btn')?.click());
  await page.waitForTimeout(900);
  await page.evaluate((p) => {
    const b = document.querySelector(`#settings-modal [data-settings-tab="${p}"], #settings-modal [data-pane="${p}"]`);
    b?.click();
  }, pane);
  await page.waitForTimeout(600);
};
module.exports = [
  ['dashboard', tab('dashboard'), '[data-dock-name="dashboard"]'],
  ['notes', tab('notes', '[data-section="browse"]'), '[data-dock-name="notes"]'],
  ['questions', tab('notes', '[data-section="questions"]'), '[data-dock-name="questions"]'],
  ['writing-room', tab('notes', '[data-section="writing-room"]'), '[data-dock-name="writing-room"]'],
  ['chat', tab('chat'), '[data-dock-name="chat"]'],
  ['graph', tab('graph'), '[data-dock-name="graph"]'],
  ['library', tab('library', '[data-target="library-view-documents"]'), '[data-dock-name="library"]'],
  ['library-docs', tab('library', '[data-target="library-view-docs"]'), '[data-dock-name="library-docs"]'],
  ['library-boards', tab('library', '[data-target="library-view-whiteboard"]'), '[data-dock-name="library-boards"]'],
  ['library-media', tab('library', '[data-target="library-view-media"]'), '[data-dock-name="library-media"]'],
  ['library-skills', tab('library', '[data-target="library-view-skills"]'), '[data-dock-name="library-skills"]'],
  ['library-links', tab('library', '[data-target="library-view-links"]'), '[data-dock-name="library-links"]'],
  ['library-contents', tab('library', '[data-target="library-view-contents"]'), '[data-dock-name="library-contents"]'],
  ['timeline', tab('timeline'), '[data-dock-name="timeline"]'],
  ['reminders', tab('reminders'), '[data-dock-name="reminders"]'],
];
module.exports.settings = settings;
