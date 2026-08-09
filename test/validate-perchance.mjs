#!/usr/bin/env node
// Structural validator approximating Perchance's documented parse rules.
// NOT the real engine - catches the common failure classes we can observe.
// Run:  node test/validate-perchance.mjs
import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname + "build";
const p1 = readFileSync(ROOT + "/perchance_1.txt", "utf8");
const p2 = readFileSync(ROOT + "/perchance_2.txt", "utf8");
const full = p1 + p2; // exactly how `cat` produces it

const errors = [];

// ---- Part 1: code section (before $output) ----
const p1lines = p1.split("\n");
if (!/^\$meta/.test(p1lines[0])) errors.push(["metadata", "line 1 must be $meta", 1]);
const outIdx = p1lines.findIndex(l => /^\$output$/.test(l.trim()));
if (outIdx === -1) errors.push(["metadata", "no standalone `$output` marker in part 1", 0]);
else {
  const tail = p1lines.slice(outIdx + 1).join("\n");
  if (tail.trim()) errors.push(["metadata", "content AFTER $output inside part 1 (should be empty)", outIdx + 1]);
}
if (!/^aiTextPlugin = \{import:ai-text-plugin\}$/m.test(p1)) errors.push(["metadata", "aiTextPlugin import line is missing or malformed", 0]);

// indentation in the code section must step in 2-space multiples
for (let i = 1; i < p1lines.length - 1; i++) {
  const l = p1lines[i];
  if (!l.trim()) continue;
  const lead = (l.match(/^ */) || [""])[0].length;
  if (lead % 2 !== 0) errors.push(["meta-indent", `odd indentation (${lead} spaces)`, i + 1]);
}

// ---- Part 2: output section ----
const ostart = full.indexOf("$output");
if (ostart === -1) {
  errors.push(["output", "$output not found in assembly", 0]);
} else {
  const after = full.slice(ostart + "$output".length);
  if (!/^\n/.test(after)) errors.push(["output", "$output must be followed by a NEWLINE (it is glued to the next text)", ostart]);

  const VOID = new Set(["meta","link","img","br","hr","input","source","track","wbr","area","base","col","embed","param"]);
  const stack = [];
  let inRaw = null;
  let i = 0;
  after.split("\n").forEach(line => {
    i++;
    // skip executable bodies (Perchance passes <script>/<style> content through verbatim)
    if (inRaw === null) {
      const om = line.match(/<(\/)?(script|style)\b/i);
      if (om && !om[1]) { inRaw = om[2].toLowerCase(); return; }
    } else {
      if (line.match(new RegExp("</" + inRaw + ">", "i"))) inRaw = null;
      return;
    }
    const clean = line.replace(/<!--[\s\S]*?-->/g, "");
    const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)\/?>/g;
    let m;
    while ((m = re.exec(clean))) {
      const name = m[1].toLowerCase();
      const whole = m[0];
      if (whole.startsWith("</")) {
        const top = stack.pop();
        if (!top) { errors.push(["html", `stray closing </${name}> (stack: ${stack.join(">")} | empty)`, i]); break; }
        if (top !== name) errors.push(["html", `</${name}> closes mismatched <${top}> (stack: ${stack.slice(-6).join(">")})`, i]);
      } else if (VOID.has(name)) {
      } else if (whole.endsWith("/>")) {
      } else {
        stack.push(name);
      }
    }
  });
  if (stack.length) errors.push(["html", `unclosed tags at EOF: ${stack.join(", ")}`, 0]);
  else if (!errors.some(e => e[0] === "html")) errors.push(["html", "tags balanced", 0]);
}

// ---- Report ----
const hard = errors.filter(e => !(e[0] === "html" && e[1] === "tags balanced"));
if (hard.length === 0) {
  console.log("All structural checks PASSED OK");
} else {
  console.log("Findings:");
  for (const [, msg, detail] of hard) console.log(`  • ${msg}${detail ? `   [line ${detail}]` : ""}`);
  if (hard.some(e => e[0] !== "html")) process.exitCode = 1;
}