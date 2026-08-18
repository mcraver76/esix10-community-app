#!/usr/bin/env node
// Every module must have zero unresolved references.  node scripts/split-verify.mjs src/*.jsx
// The BUILD does not catch these — it compiles a dangling reference and crashes at runtime.
import { readFileSync } from "node:fs";
import { freeVars, GLOBALS } from "./split-deps.mjs";
let bad = 0;
for (const f of process.argv.slice(2)) {
  const missing = [...freeVars(readFileSync(f, "utf8"))].filter((n) => !GLOBALS.has(n)).sort();
  if (missing.length) { bad++; console.log(`✗ ${f}\n    unresolved: ${missing.join(", ")}`); }
  else console.log(`✓ ${f}`);
}
process.exit(bad ? 1 : 0);
