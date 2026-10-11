// run-debug.js: JavaScript for the debugger (DOCUMENTS_PLAN 23, D3).
//
// Lazy, in the `run` bundle (`LAZY_MODULES.run` in app.js) with run-core.js.
//
// **Why a pass at all.** Debug steps a script with JS-Interpreter, which reads
// ES5. Run keeps the worker's native engine, so a script that runs may still
// use syntax the stepper cannot read. The commonest of it is lowered here,
// on CodeMirror's own JavaScript parse tree (`CM6.javascript`), with every
// line kept where it was so a stop's line is the document's: `let` and
// `const` become `var`, an arrow function a function expression (bound to
// `this` when its body says `this`), a template string a concatenation, a
// shorthand property or method its long form. What is left that ES5 cannot
// say is named, with its line, and Debug does not start: Run still runs the
// file as it is. TypeScript reaches here after sucrase has taken its types.

//: The constructs the pass does not lower, by the parse tree's node name,
//: as the panel names them.
const RUN_DEBUG_REFUSED = {
  ClassDeclaration: "classes",
  ClassExpression: "classes",
  ForOfSpec: "for...of loops",
  Spread: "spread and rest (...)",
  ObjectPattern: "destructuring",
  ArrayPattern: "destructuring",
  AwaitExpression: "async functions and await",
  async: "async functions and await",
  YieldExpression: "generators",
  Star: "generators",
  TaggedTemplateExpression: "tagged templates",
  ImportDeclaration: "import and export",
  ExportDeclaration: "import and export",
  NewTarget: "new.target",
  "?.": "optional chaining (?.)",
};

//: An edit of the pass: replace `from` to `to` with `text`. `rank` orders
//: two edits at one place: an outer construct opens before an inner one and
//: closes after it.
function runDebugEdit(edits, from, to, text, rank) {
  edits.push({ from, to, text, rank });
}

//: The text of a template string's literal part as a quoted string, its
//: line breaks kept as line breaks (a closing quote, a plus, the break, an
//: opening quote) so every line after it keeps its number.
function runDebugQuote(raw) {
  const cooked = raw.replace(/\\`/g, "`").replace(/\\\$/g, "$");
  return cooked.split("\n").map((part) => part.replace(/"/g, '\\"').replace(/\r$/, "")).join('\\n" +\n"');
}

//: Lower `source` for JS-Interpreter. Returns `{ code, dom }` (`dom`: the
//: script reaches for `document` or `window`); throws an Error with `line`
//: naming the first construct it cannot lower.
function runDebugLower(source) {
  const CM = window.CM6;
  if (!CM?.javascript) throw new Error("The editor's JavaScript parser is not loaded.");
  const tree = CM.javascript.javascriptLanguage.parser.parse(source);
  const lineAt = (pos) => source.slice(0, pos).split("\n").length;
  const refuse = (what, pos) => {
    const error = new Error(`Debug cannot step ${what} yet (line ${lineAt(pos)}): Run runs this file as it is.`);
    error.line = lineAt(pos);
    throw error;
  };
  const edits = [];
  let depth = 0;
  let dom = false;
  tree.iterate({
    enter(ref) {
      depth += 1;
      const name = ref.name;
      const text = () => source.slice(ref.from, ref.to);
      if (Object.prototype.hasOwnProperty.call(RUN_DEBUG_REFUSED, name)) refuse(RUN_DEBUG_REFUSED[name], ref.from);
      if (name === "LogicOp" && text() === "??") refuse("the ?? operator", ref.from);
      if (name === "UpdateOp" && /^(?:\?\?|&&|\|\|)=$/.test(text())) refuse("logical assignment", ref.from);
      if (name === "ArithOp" && text() === "**") refuse("the ** operator", ref.from);
      if (name === "UpdateOp" && text() === "**=") refuse("the ** operator", ref.from);
      if (name === "Number" && /[n_]/i.test(text()) && !/^0x/i.test(text())) refuse("BigInt and numeric separators", ref.from);
      if (name === "VariableName" && /^(?:document|window)$/.test(text())) dom = true;
      if (name === "let" || name === "const") runDebugEdit(edits, ref.from, ref.to, "var", 0);
      if (name === "ParamList") {
        for (let c = ref.node.firstChild; c; c = c.nextSibling) if (c.name === "Equals") refuse("default parameter values", c.from);
      }
      if (name === "Property") {
        const kids = [];
        for (let c = ref.node.firstChild; c; c = c.nextSibling) kids.push(c);
        if (kids[0]?.name === "[") refuse("computed property names", ref.from);
        const def = kids[0]?.name === "PropertyDefinition" ? kids[0] : null;
        if (def && kids.length === 1) runDebugEdit(edits, def.to, def.to, `: ${source.slice(def.from, def.to)}`, 0);
        if (def && kids[1]?.name === "ParamList") runDebugEdit(edits, def.to, def.to, ": function", 0);
      }
      if (name === "ArrowFunction") {
        const kids = [];
        for (let c = ref.node.firstChild; c; c = c.nextSibling) kids.push(c);
        const arrow = kids.find((c) => c.name === "Arrow");
        const params = kids[0];
        const body = kids[kids.length - 1];
        if (!arrow || !params || !body || body === arrow) refuse("this arrow function", ref.from);
        //: `x => ...` is a ParamList too, without its brackets.
        if (params.name === "ParamList" && source[params.from] === "(") {
          runDebugEdit(edits, params.from, params.from, "function ", depth);
        } else {
          runDebugEdit(edits, params.from, params.from, "function (", depth);
          runDebugEdit(edits, params.to, params.to, ")", -depth);
        }
        runDebugEdit(edits, arrow.from, arrow.to, "", 0);
        const usesThis = /\bthis\b/.test(source.slice(body.from, body.to));
        if (body.name === "Block") {
          if (usesThis) runDebugEdit(edits, ref.to, ref.to, ".bind(this)", -depth);
        } else {
          runDebugEdit(edits, body.from, body.from, "{ return (", depth);
          runDebugEdit(edits, body.to, body.to, `); }${usesThis ? ".bind(this)" : ""}`, -depth);
        }
      }
      if (name === "TemplateString") {
        let at = ref.from + 1;
        runDebugEdit(edits, ref.from, ref.from + 1, '("', depth);
        for (let c = ref.node.firstChild; c; c = c.nextSibling) {
          if (c.name === "Interpolation") {
            runDebugEdit(edits, at, c.from, runDebugQuote(source.slice(at, c.from)), 0);
            const start = c.firstChild;
            const end = c.lastChild;
            if (start?.name === "InterpolationStart") runDebugEdit(edits, start.from, start.to, '" + (', depth);
            if (end?.name === "InterpolationEnd") runDebugEdit(edits, end.from, end.to, ') + "', -depth);
            at = c.to;
          }
        }
        runDebugEdit(edits, at, ref.to - 1, runDebugQuote(source.slice(at, ref.to - 1)), 0);
        runDebugEdit(edits, ref.to - 1, ref.to, '")', -depth);
      }
    },
    leave() {
      depth -= 1;
    },
  });
  //: Applied in one pass, front to back. At one place the ranks order them:
  //: an inner construct's closing (most negative) first, then an outer one's,
  //: then a plain replacement (0), then the openings, outer before inner.
  edits.sort((a, b) => a.from - b.from || a.rank - b.rank);
  let out = "";
  let pos = 0;
  for (const edit of edits) {
    if (edit.from < pos) continue;
    out += source.slice(pos, edit.from) + edit.text;
    pos = edit.to;
  }
  return { code: out + source.slice(pos), dom };
}
