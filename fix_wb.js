const fs = require('fs');
const file = 'c:\\Projects\\MemoryMap-AI\\frontend\\whiteboard.js';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove wbUndoStack and wbRedoStack declarations
code = code.replace(/let wbUndoStack\s*=\s*\[\];\s*(\/\/.*?\n)*let wbRedoStack\s*=\s*\[\];\n?/, '');
// Sometimes they are declared separately or just one is there.
code = code.replace(/let wbUndoStack\s*=\s*\[\];\n?/g, '');
code = code.replace(/let wbRedoStack\s*=\s*\[\];\n?/g, '');

// 2. Remove wbUpdateUndoRedoButtons, wbPushUndo, wbApplyHistoryEntry, wbUndo, wbRedo
const toRemove = [
  /function wbUpdateUndoRedoButtons\(\) \{[\s\S]*?\n\}\n/g,
  /window\.wbUndo\s*=\s*wbUndo;\n/g,
  /window\.wbRedo\s*=\s*wbRedo;\n/g,
  /window\.wbCanUndo\s*=\s*\(\) =>.*?\n/g,
  /window\.wbCanRedo\s*=\s*\(\) =>.*?\n/g,
  /async function wbUndo\(\) \{[\s\S]*?\n\}\n/g,
  /async function wbRedo\(\) \{[\s\S]*?\n\}\n/g,
];

for (const regex of toRemove) {
  code = code.replace(regex, '');
}

// 3. Replace wbPushUndo and wbApplyHistoryEntry
const wbPushUndoRegex = /function wbPushUndo\([\s\S]*?async function wbApplyHistoryEntry\([^)]*\)\s*\{[\s\S]*?\n\}\n/g;

const replacement = `function wbPushUndo(entry) {
  if (!window.pushUndo) return;
  
  let currentUndoEntry = entry;
  let currentRedoEntry = null;

  const getLabel = (e) => {
    if (e.action === "batch") return "multiple whiteboard changes";
    if (e.action === "create") return \`created a \${e.kind}\`;
    if (e.action === "delete") return \`deleted a \${e.kind}\`;
    if (e.action === "move") return \`moved/resized a \${e.kind}\`;
    return "whiteboard edit";
  };

  window.pushUndo(
    getLabel(entry),
    async function () {
      if (currentUndoEntry) {
        currentRedoEntry = await wbApplyHistoryEntry(currentUndoEntry);
        if (typeof wbScheduleRender === "function") wbScheduleRender();
      }
    },
    async function () {
      if (currentRedoEntry) {
        currentUndoEntry = await wbApplyHistoryEntry(currentRedoEntry);
        if (typeof wbScheduleRender === "function") wbScheduleRender();
      }
    }
  );
}

async function wbApplyHistoryEntry(entry) {
  if (!entry) return null;
  if (entry.action === "batch") {
    const reverse = [];
    for (const sub of entry.entries) {
      const subReverse = await wbApplyHistoryEntry(sub);
      if (subReverse) reverse.push(subReverse);
    }
    return { action: "batch", entries: reverse };
  }
  const { base, list, payload: toPayload } = WB_KIND_INFO[entry.kind];
  if (entry.action === "delete") {
    const restored = await apiJson(base, { method: "POST", body: JSON.stringify(entry.payload) });
    wbState[list].push(restored);
    return { action: "create", kind: entry.kind, id: restored.id };
  } else if (entry.action === "move") {
    const item = wbState[list].find((i) => i.id === entry.id);
    if (!item) return null;
    const current = toPayload(item);
    const restored = await apiJson(\`\${base}/\${entry.id}\`, { method: "PUT", body: JSON.stringify(entry.before) });
    Object.assign(item, restored);
    return { action: "move", kind: entry.kind, id: entry.id, before: current };
  } else {
    const item = wbState[list].find((i) => i.id === entry.id);
    const payload = item && toPayload(item);
    await apiJson(\`\${base}/\${entry.id}\`, { method: "DELETE" });
    wbState[list] = wbState[list].filter((i) => i.id !== entry.id);
    if (payload) return { action: "delete", kind: entry.kind, payload };
  }
  return null;
}
`;

code = code.replace(wbPushUndoRegex, replacement);

// There are a few stray pops from wbUndoStack in whiteboard.js:
// 12743: wbUndoStack.pop();
// 13057: wbUndoStack.pop();
// 13508: wbUndoStack.pop();
// We should replace them with undoStack.pop() if window.undoStack was exported, but it's not.
// Let's replace wbUndoStack.pop() with window.popUndo?.() and add popUndo to app.js later, or just remove the action.
// The code does: 
//   wbUndoStack.pop(); // the delete never happened, so neither did the undo entry
// If we just pushed it to global undoStack, we need a way to pop it.
// Let's add a global `window.popUndo = () => { undoStack.pop(); renderUndoBar(); }` in app.js.
code = code.replace(/wbUndoStack\.pop\(\)/g, "if (window.popUndo) window.popUndo()");

fs.writeFileSync(file, code);
console.log('Fixed whiteboard.js');
