#!/usr/bin/env node
// Moves declarations out of src/App.jsx into feature modules.
//   node scripts/split-extract.mjs plan.json
//
// Blocks are located by AST node range (extended back over leading comments), never by line
// number: regex boundaries mis-slice on brackets inside strings and swallow the comment that
// belongs to the NEXT declaration. Cuts are applied from the end of the file backwards so the
// earlier offsets stay valid.
import { readFileSync, writeFileSync } from "node:fs";
import { indexFile } from "./split-deps.mjs";

const plan = JSON.parse(readFileSync(process.argv[2], "utf8"));
const PATH = "src/App.jsx";
let { src, decls } = indexFile(PATH);

const cuts = [];
for (const { file, header, names } of plan.modules) {
  const parts = names.map((n) => {
    if (!decls[n]) throw new Error("not found in App.jsx: " + n);
    cuts.push(decls[n]);
    const d = decls[n];
    const text = src.slice(d.start, d.end);
    const at = d.declStart - d.start;           // exact offset of the declaration keyword
    return text.slice(0, at) + "export " + text.slice(at);
  });
  writeFileSync(file, header + "\n" + parts.join("\n\n") + "\n");
  console.log(`wrote ${file.padEnd(24)} ${names.length} blocks`);
}

cuts.sort((a, b) => b.start - a.start);
for (const c of cuts) src = src.slice(0, c.start) + src.slice(c.end);

const anchor = src.indexOf(plan.importAnchor);
if (anchor < 0) throw new Error("import anchor not found: " + plan.importAnchor);
const at = src.indexOf("\n", anchor) + 1;
src = src.slice(0, at) + plan.appImports.join("\n") + "\n" + src.slice(at);
src = src.replace(/\n{4,}/g, "\n\n\n");
writeFileSync(PATH, src);
console.log("App.jsx rewritten");
