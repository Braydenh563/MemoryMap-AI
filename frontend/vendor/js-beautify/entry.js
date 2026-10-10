// The three formatters the documents editor's Format command uses for
// JavaScript, CSS and HTML (documents-code.js, `docFormatCode`).
import beautify from "js-beautify";
export const js = beautify.js;
export const css = beautify.css;
export const html = beautify.html;
