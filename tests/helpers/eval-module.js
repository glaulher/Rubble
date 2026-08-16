import { readFileSync } from "fs";
import { resolve } from "path";

// Evaluate a frontend ES module in the test sandbox, stripping imports and
// exposing ONLY the real named exports to globalThis. Replaces the legacy
// `globalThis.X = X` bridges at the bottom of each module.
export function evalModule(path, extraCode) {
  var code = readFileSync(resolve(__dirname, '..', path), 'utf-8');
  if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);
  var importStripped = code.replace(/^import .+$/gm, '');
  var exported = [];
  importStripped = importStripped.replace(
    /^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm,
    function (m, name) {
      exported.push(name);
      return m.replace(/^export\s+/, '');
    }
  );
  importStripped = importStripped.replace(
    /^export\s+const\s+([A-Za-z_$][\w$]*)/gm,
    function (m, name) {
      exported.push(name);
      return m.replace(/^export\s+/, '');
    }
  );
  importStripped = importStripped.replace(
    /^export\s+var\s+([A-Za-z_$][\w$]*)/gm,
    function (m, name) {
      exported.push(name);
      return m.replace(/^export\s+/, '');
    }
  );
  var bridges = exported
    .map(function (name) { return 'globalThis.' + name + ' = ' + name + ';'; })
    .join('\n');
  (0, eval)('"use strict"; ' + importStripped + '\n' + bridges + '\n' + extraCode);
  return exported;
}
