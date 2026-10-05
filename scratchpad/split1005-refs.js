// split1005: for a line range of one boot file, list what it declares at top
// level and every reference to those names from the rest of the boot set,
// split into load-time (outside any function) and call-time (inside one).
//   node scratchpad/split1005-refs.js settings-panes.js 1547 2160 [more FROM TO pairs]
// The old appjs-map.js reads the one-file app.js and no longer applies.
const fs = require('fs');
const path = require('path');
const NM = '/opt/node-tools/node_modules/';
const espree = require(NM + 'espree');
const scope = require(NM + 'eslint-scope');
const JS = path.join(__dirname, '..', 'frontend', 'js');
const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'index.html'), 'utf8');
const names = [...html.matchAll(/<script src="\/js\/([A-Za-z0-9_.-]+\.js)/g)].map((m) => m[1]);
const boot = names.slice(names.indexOf('app.js'), names.indexOf('agent-activity.js') + 1);
const [file, ...nums] = process.argv.slice(2);
const ranges = [];
for (let i = 0; i < nums.length; i += 2) ranges.push([+nums[i], +nums[i + 1]]);
const inRange = (l) => ranges.some(([a, b]) => l >= a && l <= b);

function parse(f) {
  const src = fs.readFileSync(path.join(JS, f), 'utf8');
  const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'script', loc: true, range: true });
  const mgr = scope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
  return { src, ast, g: mgr.globalScope };
}
const target = parse(file);
const moved = new Map();
for (const v of target.g.variables) {
  const d = v.defs[0];
  if (!d) continue;
  const line = d.node.loc.start.line;
  const top = d.type === 'FunctionName' ? d.node.loc.start.line : d.parent ? d.parent.loc.start.line : line;
  if (inRange(top)) moved.set(v.name, { line: top, kind: d.type });
}
console.log('moved names:', moved.size);
const where = (s) => {
  for (let x = s; x; x = x.upper) if (x.type === 'function') return 'call';
  return 'load';
};
// references from the rest of the target file (outside ranges) and other boot files
for (const f of boot) {
  const p = f === file ? target : parse(f);
  const out = [];
  const visit = (scopeObj) => {
    for (const r of scopeObj.references) {
      const n = r.identifier.name;
      if (!moved.has(n)) continue;
      const line = r.identifier.loc.start.line;
      if (f === file && inRange(line)) continue;
      // must resolve to the global (not shadowed): unresolved or resolved in target's global
      if (r.resolved && r.resolved.scope.type !== 'global') continue;
      if (f === file && !r.resolved) continue;
      out.push(`${f}:${line} ${where(r.from)} ${n}${r.isWrite() ? ' (write)' : ''}`);
    }
    scopeObj.childScopes.forEach(visit);
  };
  visit(p.g);
  out.forEach((o) => console.log(o));
}
// textual mentions in strings/other (window[name], typeof) for the report
