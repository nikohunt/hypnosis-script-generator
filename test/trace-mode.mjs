#!/usr/bin/env node
// Trace Perchance-ish HTML script/style/comment state through the assembly.
// Goal: find where "script passthrough" would break early (letting the parser
// list-parse JS, which produces the "indenting error near try {" symptom).
import { readFileSync } from "node:fs";

// Assembled exactly how `cat build/perchance_1.txt build/perchance_2.txt` produces it
// (the two files are pasted into separate Perchance editor fields, but for structural
// tracing purposes we only care about the combined text).
const L = (readFileSync("build/perchance_1.txt", "utf8") + readFileSync("build/perchance_2.txt", "utf8")).split("\n");
let script = false, style = false, comment = false;

for (let i = 0; i < L.length; i++) {
  let line = L[i];

  // html comment blocks
  if (comment) {
    const c = line.indexOf("-->");
    if (c === -1) continue;
    comment = false;
    line = line.slice(c + 3) || " ";
  }
  // strip inline <!-- --> spans
  for (;;) {
    const m = line.match(/<!--/);
    if (!m) break;
    const close = line.indexOf("-->", m.index);
    if (close === -1) { comment = true; line = line.slice(0, m.index); break; }
    line = line.slice(0, m.index) + " " + line.slice(close + 3);
  }

  if (script) {
    if (/<\/script>/i.test(line)) { script = false; }
    continue;
  }
  if (style) {
    if (/<\/style>/i.test(line)) { style = false; }
    continue;
  }
  const t = line.match(/<(\/)?(script|style)\b/i);
  if (t) {
    const closing = !!t[1];
    const which = t[2].toLowerCase() === "script" ? "script" : "style";
    if (closing) {
      if (which === "script") script = false;
      else style = false;
    } else {
      if (which === "script") script = true;
      else style = true;
    }
  }
}

console.log("final state -> script:", script, "style:", style, "comment:", comment);
process.exit(script || style || comment ? 1 : 0);