// run-tests.js: tests are a kind of run (DOCUMENTS_PLAN 23, D7; Brief 69).
//
// Lazy, in `LAZY_MODULES.run` with run-core.js. Python's tests are
// `unittest` discovery inside the Pyodide runner (`api/run_sandbox.py`,
// `_mm_tests`), plus plain `test_*` functions with bare `assert`, so a file
// written for pytest runs without pytest (its 12 wheels, 2.8 MB, were
// measured and left out). JavaScript and TypeScript get this file's own
// `describe`, `it`, `expect` harness, run inside the sandbox's worker: the
// function below is never called here, its source is sent with the run and
// evaluated there, on the script's first line, so the document's line
// numbers do not move. Each test comes back as a `test` row (name, state,
// time, the failure and its line), then one `tests-done` row.

//: Does this file look like tests? Run on such a file runs its tests.
function runLooksLikeTests(ext, source) {
  if (ext === "py") {
    return /^class\s+\w+\s*\(\s*(?:unittest\.)?(?:Isolated)?(?:Async)?TestCase\s*\)/m.test(source)
      || /^def\s+test\w*\s*\(/m.test(source);
  }
  return /^\s*(?:describe|it|test)\s*\(\s*["'`]/m.test(source) && /\bexpect\s*\(/.test(source);
}

//: The harness. Runs in the sandbox's worker, never in the app: `self`,
//: `postMessage` and the stack format are the worker's.
function runTestHarness() {
  const tests = [];
  const scopes = [{ name: "", before: [], after: [] }];
  //: The first frame that is the document's own script (`blob:`), not this
  //: harness (evaluated, so its frames say `eval at`).
  const lineOf = (error) => {
    for (const frame of String((error && error.stack) || "").split("\n")) {
      const m = /blob:[^\s)]*:(\d+):\d+\)?\s*$/.exec(frame);
      if (m) return Number(m[1]);
    }
    return null;
  };
  const show = (v) => {
    if (typeof v === "string") return JSON.stringify(v);
    if (v instanceof Function) return `[Function ${v.name || "anonymous"}]`;
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    try {
      const s = JSON.stringify(v);
      return s === undefined ? String(v) : s;
    } catch {
      return String(v);
    }
  };
  const equal = (a, b) => {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
    if (Array.isArray(a) !== Array.isArray(b) || Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    if (a instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof Map || a instanceof Set) return equal([...a], [...b]);
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && equal(a[k], b[k]));
  };
  const add = (name, fn, skip) => {
    const at = lineOf(new Error());
    const path = scopes.slice(1).map((s) => s.name).concat(String(name));
    tests.push({ name: path.join(" > "), fn, skip, line: at, before: scopes.flatMap((s) => s.before), after: scopes.flatMap((s) => s.after).reverse() });
  };
  self.describe = (name, fn) => {
    scopes.push({ name: String(name), before: [], after: [] });
    try {
      fn();
    } finally {
      scopes.pop();
    }
  };
  self.describe.skip = () => {};
  self.it = (name, fn) => add(name, fn, false);
  self.it.skip = (name, fn) => add(name, fn, true);
  self.test = self.it;
  self.beforeEach = (fn) => scopes[scopes.length - 1].before.push(fn);
  self.afterEach = (fn) => scopes[scopes.length - 1].after.push(fn);
  class Failure extends Error {}
  const matchers = (actual, negate) => {
    const check = (pass, said, expected) => {
      if (pass === negate) {
        const lines = [`expect(received)${negate ? ".not" : ""}.${said}`];
        if (expected !== undefined) lines.push(`Expected: ${negate ? "not " : ""}${show(expected)}`);
        lines.push(`Received: ${show(actual)}`);
        throw new Failure(lines.join("\n"));
      }
    };
    const thrown = () => {
      try {
        actual();
      } catch (error) {
        return { error };
      }
      return null;
    };
    return {
      toBe: (e) => check(Object.is(actual, e), "toBe(expected)", e),
      toEqual: (e) => check(equal(actual, e), "toEqual(expected)", e),
      toStrictEqual: (e) => check(equal(actual, e), "toStrictEqual(expected)", e),
      toBeTruthy: () => check(Boolean(actual), "toBeTruthy()"),
      toBeFalsy: () => check(!actual, "toBeFalsy()"),
      toBeNull: () => check(actual === null, "toBeNull()"),
      toBeUndefined: () => check(actual === undefined, "toBeUndefined()"),
      toBeDefined: () => check(actual !== undefined, "toBeDefined()"),
      toBeNaN: () => check(Number.isNaN(actual), "toBeNaN()"),
      toBeGreaterThan: (e) => check(actual > e, "toBeGreaterThan(expected)", e),
      toBeGreaterThanOrEqual: (e) => check(actual >= e, "toBeGreaterThanOrEqual(expected)", e),
      toBeLessThan: (e) => check(actual < e, "toBeLessThan(expected)", e),
      toBeLessThanOrEqual: (e) => check(actual <= e, "toBeLessThanOrEqual(expected)", e),
      toBeCloseTo: (e, digits = 2) => check(Math.abs(actual - e) < 10 ** -digits / 2, "toBeCloseTo(expected)", e),
      toBeInstanceOf: (e) => check(actual instanceof e, "toBeInstanceOf(expected)", e),
      toContain: (e) => check(actual != null && typeof actual.includes === "function" && actual.includes(e), "toContain(expected)", e),
      toHaveLength: (e) => check(actual != null && actual.length === e, "toHaveLength(expected)", e),
      toHaveProperty: (key) => check(actual != null && key in Object(actual), "toHaveProperty(key)", key),
      toMatch: (e) => check(typeof actual === "string" && (e instanceof RegExp ? e.test(actual) : actual.includes(e)), "toMatch(expected)", String(e)),
      toThrow: (e) => {
        const got = actual instanceof Function ? thrown() : null;
        const message = got ? String((got.error && got.error.message) || got.error) : "";
        const pass = Boolean(got) && (e === undefined || (e instanceof RegExp ? e.test(message) : e instanceof Function ? got.error instanceof e : message.includes(String(e))));
        check(pass, "toThrow(expected)", e === undefined ? undefined : String(e));
      },
    };
  };
  self.expect = (actual) => {
    const m = matchers(actual, false);
    m.not = matchers(actual, true);
    return m;
  };
  self.__mmTests = async () => {
    const counts = { passed: 0, failed: 0, skipped: 0 };
    const start = performance.now();
    for (const t of tests) {
      if (t.skip) {
        counts.skipped += 1;
        self.postMessage({ t: "test", name: t.name, state: "skip", ms: 0, text: "", line: t.line });
        continue;
      }
      const t0 = performance.now();
      try {
        for (const fn of t.before) await fn();
        try {
          await t.fn();
        } finally {
          for (const fn of t.after) await fn();
        }
        counts.passed += 1;
        self.postMessage({ t: "test", name: t.name, state: "pass", ms: Math.round(performance.now() - t0), text: "", line: t.line });
      } catch (error) {
        counts.failed += 1;
        const text = error instanceof Failure ? error.message : `${(error && error.name) || "Error"}: ${(error && error.message) || error}`;
        self.postMessage({ t: "test", name: t.name, state: "fail", ms: Math.round(performance.now() - t0), text, line: lineOf(error) || t.line });
      }
    }
    self.postMessage({ t: "tests-done", ...counts, ms: Math.round(performance.now() - start) });
  };
}

//: The harness as the text the sandbox evaluates.
function runTestHarnessSource() {
  return `(${runTestHarness.toString()})();`;
}
