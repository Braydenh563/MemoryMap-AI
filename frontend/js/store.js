// store.js: one owner for the page's shared state (WORLD_CLASS_PLAN section
// 10, F12). Loaded right after prefs.js.
//
// "Frontend state lives in module globals, DOM and localStorage with no single
// owner", and that is the shape of every "the list did not refresh" report: a
// surface drew from a copy, the copy changed somewhere else, and nothing told
// the surface. A slice here has one current value, set in one place, and any
// surface that draws from it subscribes rather than keeping its own copy or
// fetching the same rows again.
//
// Introduced slice by slice, by decision (the plan's own words), not all at
// once: the first is `notes`, the notes list `loadEntries` keeps in
// `allEntries`. `allEntries` stays the variable every existing reader uses;
// `loadEntries` publishes each new list here as well (`publishNotes`), so a
// reader can wait for the first one (`appState.when`) or follow every one
// (`appState.subscribe`) instead of polling or refetching.

const appState = (() => {
  const values = new Map();
  const listeners = new Map();
  return {
    get(slice) {
      return values.get(slice);
    },
    //: Whether the slice has been set at all: an empty list is an answer.
    has(slice) {
      return values.has(slice);
    },
    //: Set and tell every subscriber. One that throws does not stop the rest.
    set(slice, value) {
      values.set(slice, value);
      for (const fn of [...(listeners.get(slice) || [])]) {
        try {
          fn(value);
        } catch (error) {
          console.error(`[store] a ${slice} subscriber failed`, error);
        }
      }
    },
    //: Call `fn` on every later set. Returns the unsubscribe.
    subscribe(slice, fn) {
      if (!listeners.has(slice)) listeners.set(slice, new Set());
      listeners.get(slice).add(fn);
      return () => listeners.get(slice)?.delete(fn);
    },
    //: The slice's value once it has one: now if it is set, else on the
    //: first set, else `null` after `timeoutMs` so a caller never waits on a
    //: load that failed.
    when(slice, timeoutMs = 15000) {
      if (values.has(slice)) return Promise.resolve(values.get(slice));
      return new Promise((resolve) => {
        let off = null;
        const timer = setTimeout(() => {
          off?.();
          resolve(null);
        }, timeoutMs);
        off = appState.subscribe(slice, (value) => {
          clearTimeout(timer);
          off();
          resolve(value);
        });
      });
    },
  };
})();

//: The notes slice's one writer, called wherever `allEntries` is replaced.
function publishNotes(list) {
  appState.set("notes", list);
}
