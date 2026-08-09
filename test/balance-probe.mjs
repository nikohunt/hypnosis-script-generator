#!/usr/bin/env node
// Naive bracket balance probe per region, comparing worktree vs HEAD.
// Run: node test/balance-probe.mjs
import { execSync } from "node:child_process";
const cur = execSync("cat build/perchance_2.txt", { encoding: "utf8" });
const head = execSync("git show HEAD:build/perchance_2.txt", { encoding: "utf8" });

function regionBalance(src, name) {
  const lines = src.split("\n");
  const styleEnd = lines.findIndex(l => /<\/style>/i.test(l));
  const scriptStart = lines.findIndex(l => /^<script>/i.test(l));

  const count = (arr, re) => arr.join("\n").split(re).length - 1;
  const r = (from, to) => lines.slice(from, to < 0 ? lines.length : to);
  const report = (label, arr) => {
    const o = count(arr, /\{/g), c = count(arr, /\}/g), ob = count(arr, /\[/g), cb = count(arr, /\]/g);
    console.log(`  ${label}: { ${o} vs } ${c}  |  [ ${ob} vs ] ${cb}   ${o === c && ob === cb ? "OK" : "<<< IMBALANCE"}`);
  };
  console.log(name);
  report("CSS(0..styleEnd)", r(0, styleEnd >= 0 ? styleEnd + 1 : 0));
  report("HTML(styleEnd..scriptStart)", r(styleEnd + 1, scriptStart >= 0 ? scriptStart : -1));
  report("SCRIPT(scriptStart..end)", r(scriptStart >= 0 ? scriptStart : 0, -1));
  report("TOTAL", lines);
}
regionBalance(cur, "== WORKTREE ==");
regionBalance(head, "== HEAD ==");