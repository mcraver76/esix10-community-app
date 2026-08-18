#!/usr/bin/env node
// Dependency finder for splitting src/App.jsx.   node scripts/split-deps.mjs Name1,Name2
//
// WHY: deciding what a component needs by reading it is how you end up with a module that
// imports half of App.jsx — or worse, imports App.jsx itself and creates a cycle. This parses
// the target declarations, re-parses them standalone, and reports their FREE VARIABLES: every
// name they use but do not define. That list is exactly what has to move with them or be
// imported, and "UNRESOLVED: none" is what tells you the list is complete.
import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

export const GLOBALS = new Set(["window","document","console","navigator","Math","Date","JSON","Object","Array","String","Number","Boolean","Promise","Set","Map","parseInt","parseFloat","isNaN","setTimeout","clearTimeout","setInterval","clearInterval","fetch","alert","confirm","prompt","localStorage","sessionStorage","Intl","URL","Error","FormData","Blob","File","FileReader","crypto","atob","btoa","structuredClone","AbortController","Notification","location","history","screen","performance","requestAnimationFrame","encodeURIComponent","decodeURIComponent","Image","RegExp","Symbol","BigInt","globalThis","process","undefined","NaN","Infinity","Uint8Array","__BUILD_TIME__","React"]);

export function indexFile(file) {
  const src = readFileSync(file, "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  const decls = {}, imported = new Set();
  for (const n of ast.program.body) {
    if (n.type === "ImportDeclaration") { for (const s of n.specifiers) imported.add(s.local.name); continue; }
    const nm = n.type === "VariableDeclaration" ? n.declarations[0]?.id?.name
             : n.type === "FunctionDeclaration" ? n.id?.name : null;
    // `start` includes any leading comment block so it travels with the declaration.
    // `declStart` is the declaration keyword itself — the ONLY safe place to insert `export`.
    // (Regex-inserting it hit the first `const` inside an `async function` body instead.)
    if (nm) decls[nm] = {
      start: n.leadingComments?.length ? n.leadingComments[0].start : n.start,
      declStart: n.start,
      end: n.end,
    };
  }
  return { src, decls, imported };
}

export function freeVars(code) {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
  const free = new Set();
  traverse(ast, {
    Identifier(p) { if (p.isReferencedIdentifier() && !p.scope.hasBinding(p.node.name, true)) free.add(p.node.name); },
    JSXIdentifier(p) {
      if (p.parent.type === "JSXAttribute") return;       // prop names
      // `<React.StrictMode>` is a member expression: only the OBJECT (`React`) is a variable.
      // Counting the property as one reports StrictMode, Fragment etc. as undefined.
      if (p.parent.type === "JSXMemberExpression" && p.parent.property === p.node) return;
      if (p.parent.type === "JSXNamespacedName") return;
      const n = p.node.name;
      if (/^[a-z]/.test(n)) return;                       // html tags
      if (!p.scope.hasBinding(n, true)) free.add(n);
    },
  });
  return free;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const names = process.argv[2].split(",");
  const { src, decls, imported } = indexFile("src/App.jsx");
  const text = names.map((n) => {
    if (!decls[n]) throw new Error("not found in App.jsx: " + n);
    return src.slice(decls[n].start, decls[n].end);
  }).join("\n\n");
  const free = freeVars(text);
  const inApp = [...free].filter((n) => decls[n] && !names.includes(n)).sort();
  const inImp = [...free].filter((n) => imported.has(n)).sort();
  const unk   = [...free].filter((n) => !decls[n] && !imported.has(n) && !GLOBALS.has(n) && !names.includes(n)).sort();
  console.log("NEEDS FROM App.jsx :", inApp.join(", ") || "(none)");
  console.log("NEEDS FROM IMPORTS :", inImp.join(", ") || "(none)");
  console.log("UNRESOLVED         :", unk.join(", ") || "(none)");
  console.log("LINES              :", text.split("\n").length);
}
