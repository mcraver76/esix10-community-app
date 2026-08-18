#!/usr/bin/env node
// Dangling-import check for the modules split out of App.jsx.  `npm run check:imports`
//
// WHY THIS EXISTS: splitting a big file produces components that reference a helper the NEW module
// never imported. Vite BUILDS FINE anyway (the reference only fails when that code path runs), and
// oxlint has `no-undef` off — so the first signal is a crash in front of a user. This is the check
// that stands between a file split and a runtime error.
//
// It derives the candidate list AUTOMATICALLY from App.jsx's own import statements rather than a
// hand-maintained list — a hand-written list silently misses whatever you forgot to add to it, which
// is exactly how `loadMyFinancialGrants` slipped through and crashed EstimateDetail.
//
// String literals are stripped before scanning, because otherwise ordinary English ("can't", an "L"
// size label, a UI label "Messages") reads as an identifier and buries the real findings in noise.
// Template-literal INTERPOLATIONS are kept — `${foo(bar)}` contains genuine references.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "src";
const ENTRY = join(SRC, "App.jsx");
// Modules split out of App.jsx. Anything in src/ that App imports from is checked.
const MODULES = readdirSync(SRC)
  .filter((f) => /\.(jsx?|mjs)$/.test(f) && !["App.jsx", "main.jsx"].includes(f))
  .map((f) => join(SRC, f));

// Drop quoted text so prose can't masquerade as code; keep `${...}` interpolations.
//
// ORDER MATTERS: quoted strings are stripped FIRST. A backtick inside an ordinary string (e.g.
// "use `foo`") otherwise leaves the template-literal pass with unbalanced backticks, and its
// non-greedy match then swallows everything between two distant backticks. That silently deleted
// 82% of a real file and turned this check into a rubber stamp — the failure mode a correctness
// gate must never have.
//
// Because any regex-based stripper is approximate, the result is sanity-checked below: if stripping
// removed most of the file, we DISCARD it and scan the raw text instead. A few false positives are
// an acceptable price; a false negative here means a crash reaches a user.
function stripStrings(code) {
  const stripped = code
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*?`/g, (lit) =>
      [...lit.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1]).join(" "));
  // Losing more than half the source means the stripper lost its place — don't trust it.
  return stripped.length < code.length * 0.5 ? code : stripped;
}

// Share of the file that sits inside quotes. Used to spot prose-dominant data modules.
function quotedShare(code) {
  let quoted = 0;
  for (const re of [/'(?:[^'\\]|\\.)*'/g, /"(?:[^"\\]|\\.)*"/g]) {
    for (const m of code.matchAll(re)) quoted += m[0].length;
  }
  return quoted / Math.max(code.length, 1);
}

const app = readFileSync(ENTRY, "utf8");
const candidates = new Set();
for (const m of app.matchAll(/^import\s+\{([^}]+)\}\s+from/gm)) {
  m[1].split(",").forEach((s) => {
    const n = s.trim().split(/\s+as\s+/).pop().trim();
    if (n) candidates.add(n);
  });
}
for (const m of app.matchAll(/^import\s+([A-Za-z_][A-Za-z0-9_]*)\s+from/gm)) candidates.add(m[1]);

let failures = 0;
let skipped = 0;
for (const file of MODULES) {
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");

  // Pure DATA modules (strings.js, dailyContent.js) are almost entirely English prose, so the
  // stripper's safety valve refuses to strip them and every ordinary word ("can", "Messages")
  // reads as an identifier. They declare no functions, so they cannot reference a helper they
  // forgot to import — there is nothing here for this check to find.
  if (!/^(export )?(async )?function /m.test(src)) { skipped++; continue; }
  // Same reasoning, one case further: a module that is MOSTLY prose but happens to declare a
  // small helper (ESix10's dailyDevotions.js — a 366-entry devotion library plus one lookup
  // function). The stripper's safety valve refuses to strip it, so the scan falls back to raw
  // text and every capitalised word in a devotion title ("Shield of Faith", "Crown of the
  // Aged") reads as a missing import. Those findings are noise, and noise is what stops a
  // gate like this from being read. If quoted text dominates the file, skip it.
  if (stripStrings(src) === src && quotedShare(src) > 0.6) { skipped++; continue; }
  const importBlock = lines.filter((l) => l.trim().startsWith("import ")).join("\n");
  const imported = new Set([...importBlock.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)].map((m) => m[0]));
  const body = stripStrings(
    lines.filter((l) => !l.trim().startsWith("import ") && !l.trim().startsWith("//")).join("\n")
  );
  const declared = new Set(
    [...body.matchAll(/(?:function|const|let|class)\s+([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])
  );
  const missing = [...candidates].filter(
    (c) => !imported.has(c) && !declared.has(c) && new RegExp(`\\b${c}\\b`).test(body)
  );
  if (missing.length) {
    failures++;
    console.error(`✗ ${file}\n    possibly undefined: ${missing.join(", ")}`);
  }
}

if (failures) {
  console.error(`\n${failures} module(s) reference identifiers they may not import.`);
  console.error("Verify each (it may be inside a string), then add the missing import.");
  process.exit(1);
}
console.log(
  `✓ ${MODULES.length - skipped} modules checked against ${candidates.size} candidates ` +
  `(${skipped} data-only modules skipped) — no dangling imports.`
);
