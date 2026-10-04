// assistant-avatar.js: the app's emblem as an assistant's head (INBOX 463 (2)).
//
// Lazy (app.js, `LAZY_MODULES.assistantAvatar`): only a person who sets
// Appearance, Assistant avatar to "App emblem" ever needs it. Entered through
// `assistantEmblemInto`, a `LAZY_ENTRY_POINTS` stand-in, from
// `assistantAvatar` (chat-agent.js), which hands over an empty canvas of the
// right box and keeps going.
//
// **Drawn once per colour and size, copied into every head.** The emblem is a
// p5 sketch (`renderEmblem`, phone-shell.js: the same ring of linked notes as
// the tab strip's mark and the welcome), and a chat of 150 replies must not
// hold 150 sketches (chatheads.js measured that for the p5 heads this replaced:
// 939ms against 410ms to open). So the sketch is drawn into a scratch box
// off the page, its canvas kept, and each head's own canvas takes a copy of
// the pixels. It turns by CSS like every emblem (`canvas.emblem-spin`,
// 03-dashboard-widgets.css) unless Reduce motion is set, which leaves the
// class off and the head still. A change of accent redraws the heads where
// they stand (`renderBrandLogo` calls `repaintAssistantAvatars`), and the new
// colour is a new key.
const assistantEmblemShots = new Map();

function assistantEmblemShot(size) {
  const accent = typeof currentAccentHex === "function" ? currentAccentHex() : "";
  const key = `${size}|${accent}`;
  let shot = assistantEmblemShots.get(key);
  if (!shot) {
    shot = ensureP5().then((ready) => {
      if (!ready) return null;
      const scratch = document.createElement("div");
      scratch.className = "assistant-emblem-scratch";
      document.body.appendChild(scratch);
      renderEmblem(scratch, size);
      const canvas = scratch.querySelector("canvas");
      releaseEmblem(scratch);
      scratch.remove();
      return canvas;
    });
    assistantEmblemShots.set(key, shot);
  }
  return shot;
}

async function assistantEmblemInto(target, size) {
  const shot = await assistantEmblemShot(size);
  if (!shot) return;
  target.width = shot.width;
  target.height = shot.height;
  target.getContext("2d").drawImage(shot, 0, 0);
  //: The same rule `renderEmblem` has: the app's own motion switch, not the
  //: system hint, decides whether it turns.
  target.classList.toggle("emblem-spin", appearancePref("motion") !== "reduced");
}
