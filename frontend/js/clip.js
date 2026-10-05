// The web clipper's window (WORLD_CLASS_PLAN D9, row 24): clip.html.
//
// Fully local. The bookmarklet (Settings, Import & export, Web clipper) runs
// in the page being read, opens this window on the app's own address, and
// sends it the page: first its address, title and selected text in this
// page's fragment (enough on its own), then, when this page says it is ready,
// the page's HTML by `postMessage`. Nothing is fetched from the web.
//
// Two rules make it safe to open from any site:
// - the HTML is taken only from the window that opened this one
//   (`event.source !== window.opener` is dropped), and only once;
// - nothing is saved until the person presses Save, so a page that opens
//   this window on its own can at most fill a preview nobody keeps.
// The note is stored with its address (`source_url`), which marks it as text
// from outside for the agent's guard and the prompt fence.

(() => {
  const $ = (id) => document.getElementById(id);
  const MAX_HTML = 3_000_000;
  const clip = { url: "", title: "", selection: "", html: "" };
  let saved = false;

  function token() {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  }

  function status(text, isError = false) {
    const line = $("clip-status");
    line.textContent = text;
    line.classList.toggle("error", isError);
  }

  function describe() {
    $("clip-preview").classList.remove("hidden");
    if (!$("clip-title").value) $("clip-title").value = clip.title || clip.url;
    $("clip-source").textContent = clip.url;
    const words = clip.selection ? clip.selection.split(/\s+/).filter(Boolean).length : 0;
    $("clip-what").textContent = clip.selection
      ? `The ${words} words you selected.`
      : clip.html
        ? "The page's main text, without its menus and footer."
        : "The address and title only (this page did not send its text).";
    $("clip-save").disabled = !clip.url || saved;
    status(token() ? "Check the title, then save." : "Sign in to MemoryMap in this browser first, then clip again.", !token());
    $("clip-open").classList.toggle("hidden", Boolean(token()));
  }

  function fromFragment() {
    const raw = location.hash.slice(1);
    if (!raw) return;
    try {
      const data = JSON.parse(decodeURIComponent(raw));
      clip.url = String(data.u || "").slice(0, 2000);
      clip.title = String(data.t || "").slice(0, 300);
      clip.selection = String(data.s || "");
    } catch {
      // A fragment this page did not write: nothing to show from it.
    }
  }

  window.addEventListener("message", (event) => {
    if (!window.opener || event.source !== window.opener) return;
    const data = event.data;
    if (!data || data.type !== "memorymap-clip" || clip.html) return;
    clip.url = String(data.url || clip.url).slice(0, 2000);
    clip.title = String(data.title || clip.title).slice(0, 300);
    clip.selection = String(data.selection || clip.selection).slice(0, 200_000);
    clip.html = String(data.html || "").slice(0, MAX_HTML);
    describe();
  });

  async function save() {
    const button = $("clip-save");
    button.disabled = true;
    status("Saving…");
    try {
      const response = await fetch("/links/clip-page", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token() },
        body: JSON.stringify({
          url: clip.url,
          title: $("clip-title").value.trim() || clip.title,
          html: clip.selection ? "" : clip.html,
          selection: clip.selection,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof body.detail === "string" ? body.detail : "";
        throw new Error(response.status === 401 ? "Sign in to MemoryMap in this browser first, then clip again." : detail || "Couldn't save this page.");
      }
      saved = true;
      status(body.existing ? "Already in your notes, so nothing new was saved." : "Saved as a note. It is being filed now.");
      $("clip-open").classList.remove("hidden");
      try {
        window.opener?.postMessage("memorymap-clip-ok", "*");
      } catch {
        // The page that opened this one may have gone; the note is saved.
      }
    } catch (error) {
      status(error.message || "Couldn't save this page.", true);
      button.disabled = false;
    }
  }

  $("clip-save").addEventListener("click", save);
  $("clip-close").addEventListener("click", () => window.close());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") window.close();
  });

  fromFragment();
  if (clip.url) describe();
  else status("Open this from the Clip to MemoryMap bookmark on the page you want to keep.");
  // Ask the opener for the page itself. The message carries nothing.
  try {
    window.opener?.postMessage("memorymap-clip-ready", "*");
  } catch {
    // No opener (opened by hand, or the site cut the link): the fragment is enough.
  }
})();
