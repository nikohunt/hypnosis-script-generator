#!/usr/bin/env node
// Model Perchance's panel indent rule: 2-space steps only (no level skips).
// A line indented N where the previous context is at M errors if N > M+2
// (orphan child). Col-0 lines are top-level.
// Run: node test/check-indent.mjs
import { readFileSync } from "node:fs";
// Assembled exactly how `cat build/perchance_1.txt build/perchance_2.txt` produces it
// (the two files are pasted into separate Perchance editor fields, but for structural
// tracing purposes we only care about the combined text).
const L = (readFileSync("build/perchance_1.txt", "utf8") + readFileSync("build/perchance_2.txt", "utf8")).split("\n");
const start = L.indexOf("$output") + 1;
const stack = [0]; // indentation stack, levels in spaces
const viol = [];
for (let i = start; i < L.length; i++) {
  const raw = L[i];
  if (!raw.trim()) continue;
  const indent = (raw.match(/^ */) || [""])[0].length;
  // pop any levels deeper than current indent
  while (stack.length > 1 && indent < stack[stack.length - 1]) stack.pop();
  const top = stack[stack.length - 1];
  if (indent === top) continue;             // sibling
  if (indent === top + 2) { stack.push(indent); continue; } // valid child
  // orphan / level-skip: show the offending line
  viol.push({ lno: i + 1, indent, stack: stack.slice(-4).join(">"), text: raw.slice(0, 60) });
}
console.log("violations:", viol.length);
for (const v of viol) console.log(`  L${v.lno} indent=${v.indent} (stack ${v.stack}) :: ${v.text}`);
process.exit(viol.length ? 1 : 0);