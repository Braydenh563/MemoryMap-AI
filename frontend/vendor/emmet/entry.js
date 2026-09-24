// The Emmet surface MemoryMap vendors: one IIFE, one global (`EMMET`), the
// core expander and the abbreviation extractor and nothing else. Rebuilt by
// frontend/vendor/emmet/build.sh; versions pinned in package.json there.
//
// **Its own bundle, not a module in codemirror.min.js.** Emmet's core has no
// CodeMirror dependency at all (it turns a string into a string), so it does
// not need to share CodeMirror's state instances the way a CodeMirror
// extension would; and keeping it apart means adding it did not rebuild, and
// could not silently change, the 795 KB editor bundle the rest of the
// documents editor depends on. `@emmetio/codemirror6-plugin` was considered
// and not taken: it must be bundled *into* the CodeMirror build (it imports
// @codemirror/state as a peer), its package declares no licence, and the
// integration it provides is the part that has to follow this app's own
// completion list, Tab and theme anyway (documents.js, `docEmmet*`).
export { default as expand, extract, resolveConfig } from "emmet";
// Added for INBOX 402 (balance, rename the matching tag): the tag matcher
// Emmet's own editor plugins use. It reads tags from the text, so it works
// the same in HTML, XML (a stream mode here, with no tree to ask) and JSX.
export { default as matchTag, balancedInward, balancedOutward } from "@emmetio/html-matcher";
