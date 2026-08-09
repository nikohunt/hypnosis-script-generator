#!/usr/bin/env node
// Per-line naive bracket depth over the <style> block and <script> block,
// reporting where depth goes NEGATIVE (a closer with no opener).
// Run: node test/negative-depth.mjs
import { readFileSync } from "node:fs";
const lines = readFileSync("build/perchance_2.txt", "utf8").split("\n");
const bins = [
  ["CSS", 0, lines.findIndex(l => /<\/style>/i.test(l)) + 1],
  ["HTML", lines.findIndex(l => /<\/style>/i.test(l)) + 1, lines.findIndex(l => /^<script>/i.test(l))],
  ["SCRIPT", lines.findIndex(l => /^<script>/i.test(l)), lines.length],
];
for (const [label, from, to] of bins) {
  let depth = 0;
  console.log(`== ${label} (${from + 1}..${to}) ==`);
  for (let i = from; i < to; i++) {
    const line = lines[i];
    const opens = (line.match(/\{/g) || []).length;
    const closers = (line.match(/\}/g) || []).length;
    depth += opens - closers;
    if (depth < 0) {
      console.log(`  depth ${depth} at line ${i + 1}: ${line.slice(0, 70)}`);
      depth = 0;
    }
  }
  console.log(`  net depth end: ${depth}`);
}