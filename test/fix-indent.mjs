#!/usr/bin/env node
// Re-indent the two post-template-literal JS blocks so Perchance's indent-list
// rule is satisfied (2-space steps, no level skips). Whitespace-only change;
// does not alter any string content, so LLM prompts are byte-identical.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "build/perchance_2.txt";
const lines = readFileSync(FILE, "utf8").split("\n");

// (1-indexed range, assertion) -> all get -2 spaces
const jobs = [
  { from: 3161, to: 3178, assert: () => /^    try \{/.test(lines[3160]) && /^    \}$/.test(lines[3177]) },
  { from: 3236, to: 3236, assert: () => /^    const demoBlock = /.test(lines[3235]) },
  { from: 3243, to: 3243, assert: () => /^    const instruction = `You are/.test(lines[3242]) },
  { from: 3284, to: 3298, assert: () => /^    try \{/.test(lines[3283]) && /^    \} finally \{/.test(lines[3297]) },
];

for (const j of jobs) {
  if (!j.assert()) {
    console.error("ASSERT FAILED for range", j.from, "-", j.to);
    console.error(" line", j.from, JSON.stringify(lines[j.from - 1].slice(0, 60)));
    process.exit(1);
  }
  for (let n = j.from; n <= j.to; n++) {
    const idx = n - 1;
    if (lines[idx].startsWith("  ")) lines[idx] = lines[idx].slice(2);
  }
  console.log(`re-indented ${j.from}..${j.to}`);
}

writeFileSync(FILE, lines.join("\n"));
console.log("written", FILE);