// The offline page's one control (offline.html, shown by sw.js when the
// server cannot be reached). Retry loads the page the person was on: the
// worker shows this page at the address that failed, so a reload there asks
// the server again (and keeps a share target's query). Opened directly at
// /offline.html it has no such address, so it goes to the app.
(() => {
  const retry = document.getElementById("offline-retry");
  if (!retry) return;
  retry.addEventListener("click", () => {
    if (location.pathname === "/offline.html") location.assign("/");
    else location.reload();
  });
})();
