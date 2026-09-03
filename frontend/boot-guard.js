// Runs before anything else, and is deliberately the only file that must
// never fail. See the comment on its <script> tag in index.html for why it
// is a file rather than an inline block.
//
// **What it is for.** Reported: "idk if it is just slow but the app is stuck
// on th eloading screen", with a screenshot of the progress bar stalled
// short of the end, and later "the loading issue is only on the pydesktop
// view".
//
// `initAuth()` in app.js already bounds its own `/auth/status` probe at 8s
// and hides the splash on every branch, so it cannot hang *if it runs*. The
// failures this covers are the ones where it never runs at all: a runtime
// error earlier in app.js, a script the CSP refused, or an asset that 404s.
// In every one of those the splash sits at ~90% with its dots animating from
// CSS, which looks exactly like "still loading" and is not.
(function () {
  function say(text) {
    var splash = document.getElementById("boot-splash");
    if (!splash || splash.classList.contains("hidden")) return;
    var line = document.getElementById("boot-splash-error");
    if (!line) {
      line = document.createElement("p");
      line.id = "boot-splash-error";
      line.className = "boot-splash-error";
      line.setAttribute("role", "alert");
      splash.appendChild(line);
    }
    line.textContent = text;
  }

  // A script error is the likeliest cause and the one worth naming exactly:
  // it is the difference between "my machine is slow" and "this build is
  // broken", and nobody can tell those apart from a progress bar.
  // **No "press Ctrl+Shift+R" here.** Reported immediately after the first
  // version said exactly that: "ctrl shift r hard reload doesnt work as it is
  // a hothey" — in the desktop shell that chord is bound to something else,
  // so the one instruction on a dead screen was one the reader could not
  // follow. Restarting the app is the advice that works in every shell this
  // runs in, and it also fixes the stale-server case below.
  window.addEventListener("error", function (event) {
    say(
      "Something failed while starting: " +
        (event.message || "a script error") +
        ". Close MemoryMap and start it again. If it keeps happening this is " +
        "a bug \u2014 the message above is the useful part of the report."
    );
  });

  // A CSP refusal does not fire `error` with a useful message, and it is the
  // failure mode most likely to leave a completely blank app — so it is
  // reported specifically, with the one thing that actually fixes it.
  document.addEventListener("securitypolicyviolation", function (event) {
    say(
      "The app blocked one of its own scripts (" +
        (event.violatedDirective || "script-src") +
        "). This usually means the MemoryMap server is still running from " +
        "before an update \u2014 close MemoryMap completely and start it again."
    );
  });

  setTimeout(function () {
    say(
      "This is taking longer than it should. If it doesn't finish, close " +
        "MemoryMap completely and start it again."
    );
  }, 12000);
})();
