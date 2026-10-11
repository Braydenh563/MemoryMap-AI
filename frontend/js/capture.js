// Quick capture from anywhere (WORLD_CLASS_PLAN H9, row 27): capture.html.
//
// `memorymap --capture`, bound to a key in the system's keyboard settings,
// opens this page on the running app; it saves one line as a note through
// the same `POST /entries` Capture uses (filed and indexed like any other)
// and closes. Nothing here is an operating-system hook, so it needs no
// dependency and works the same on every platform the browser does.

(() => {
  const $ = (id) => document.getElementById(id);
  let saving = false;

  //: What the app saved in this browser: the session token, and the space
  //: open there (`activeSpaceId`, spaces-find.js), so a capture lands where
  //: the person is working rather than in the default space.
  function stored(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }
  const token = () => stored("token");

  function status(text, isError = false) {
    $("capture-status").textContent = text;
    $("capture-status").classList.toggle("error", isError);
  }

  //: The window's one request: signed in, in the space open in the app.
  const call = (path, method, body) =>
    fetch(path, {
      method,
      headers: { "Content-Type": "application/json", "X-Auth-Token": token(), "X-Workspace-ID": stored("spaceId") || "all" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  async function save() {
    const content = $("capture-text").value.trim();
    if (!content || saving) return;
    if (!token()) {
      status("Sign in to MemoryMap in this browser first, then capture again.", true);
      $("capture-open").classList.remove("hidden");
      return;
    }
    saving = true;
    $("capture-save").disabled = true;
    status("Saving…");
    try {
      const response = await call("/entries", "POST", { content });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(response.status === 401 ? "Sign in to MemoryMap in this browser first, then capture again." : (typeof body.detail === "string" && body.detail) || "Couldn't save that note.");
      }
      const made = await response.json().catch(() => null);
      $("capture-text").value = "";
      //: A window the person's own browser opened for the command cannot be
      //: closed by its script in every browser, so the line says what to do
      //: either way and the box is ready for the next note.
      status("Saved and being filed. Type another, or close this window.");
      //: The app window, when open, keeps the note on its Undo stack; with none
      //: open this window stays and offers the Undo itself (standalone-undo.js).
      const taken = made?.id != null && (await window.standaloneUndo.announce(made, "Captured a note"));
      if (taken || made?.id == null) setTimeout(() => window.close(), 700);
      else window.standaloneUndo.offer({ id: made.id, send: call, status, row: document.querySelector(".clip-actions") });
    } catch (error) {
      status(error.message || "Couldn't save that note.", true);
    } finally {
      saving = false;
      $("capture-save").disabled = false;
    }
  }

  $("capture-save").addEventListener("click", save);
  $("capture-close").addEventListener("click", () => window.close());
  $("capture-text").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      save();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") window.close();
  });
  $("capture-text").focus();
})();
