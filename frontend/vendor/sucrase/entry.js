// The one function the run protocol uses (run-core.js, the TypeScript row):
// strip a TypeScript document's types, and turn `import`/`export` into the
// CommonJS names the sandbox's runner defines, keeping every line where it was.
export { transform } from "sucrase";
