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

  function token() {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  }

  function status(text, isError = false) {
    $("capture-status").textContent = text;
    $("capture-status").classList.toggle("error", isError);
  }

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
      const response = await fetch("/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token() },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(response.status === 401 ? "Sign in to MemoryMap in this browser first, then capture again." : (typeof body.detail === "string" && body.detail) || "Couldn't save that note.");
      }
      $("capture-text").value = "";
      //: A window the person's own browser opened for the command cannot be
      //: closed by its script in every browser, so the line says what to do
      //: either way and the box is ready for the next note.
      status("Saved and being filed. Type another, or close this window.");
      setTimeout(() => window.close(), 700);
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
