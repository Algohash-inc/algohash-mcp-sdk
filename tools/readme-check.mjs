#!/usr/bin/env node
// Keeps the translated READMEs in step with README.md:
//   - every language linked from the language bar exists, and every README.*.md is linked
//   - the language bar is byte-identical in every file
//   - same number of headings, code fences and table rows as README.md
//   - every relative link and image points at a file that exists
//   - every in-page #anchor matches a heading (GitHub slug rules)
//
//   node tools/readme-check.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const en = read("README.md");
const bar = (s) => (s.match(/<p align="center">\s*<a href="README\.md">[\s\S]*?<\/p>/) || [""])[0];
const shape = (s) => ({
  headings: (s.match(/^#+ /gm) || []).length,
  fences: (s.match(/^```/gm) || []).length,
  tableRows: (s.match(/^\|/gm) || []).length,
});

// GitHub heading anchors: lowercase, drop everything but letters, marks, numbers, "_", "-" and spaces,
// then spaces become "-". Emoji are dropped, so "## 🚀 Quick Start" -> "-quick-start".
const slug = (h) => h.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}_\- ]/gu, "").replace(/ /g, "-");
const anchors = (s) => {
  const out = new Set();
  let fenced = false;
  for (const line of s.split("\n")) {
    if (line.startsWith("```")) fenced = !fenced;
    const m = !fenced && line.match(/^#{1,6} (.+)$/);
    if (!m) continue;
    let a = slug(m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/`/g, "")), n = 1, b = a;
    while (out.has(b)) b = `${a}-${n++}`;
    out.add(b);
  }
  return out;
};

const problems = [];
const enBar = bar(en);
if (!enBar) problems.push("README.md: language bar not found");
const linked = [...enBar.matchAll(/href="(README[^"]*\.md)"/g)].map((m) => m[1]);
const present = fs.readdirSync(ROOT).filter((f) => /^README(\.[A-Za-z-]+)?\.md$/.test(f));
for (const f of linked) if (!present.includes(f)) problems.push(`language bar links ${f}, which does not exist`);
for (const f of present) if (!linked.includes(f)) problems.push(`${f} is not linked from the language bar`);

const enShape = shape(en);
for (const f of present) {
  const s = read(f);
  if (f !== "README.md" && bar(s) !== enBar) problems.push(`${f}: language bar differs from README.md`);
  const sh = shape(s);
  for (const k of Object.keys(enShape)) if (sh[k] !== enShape[k]) problems.push(`${f}: ${k} ${sh[k]} != ${enShape[k]} in README.md`);
  const targets = [
    ...[...s.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]),
    ...[...s.matchAll(/(?:href|src|srcset)="([^"]+)"/g)].map((m) => m[1]),
  ];
  const ids = anchors(s);
  for (const t of targets) {
    if (t.startsWith("#")) { if (!ids.has(decodeURIComponent(t.slice(1)))) problems.push(`${f}: anchor ${t} matches no heading`); continue; }
    if (/^(https?:|mailto:)/.test(t)) continue;
    const p = path.join(ROOT, decodeURIComponent(t.split("#")[0]));
    if (!fs.existsSync(p)) problems.push(`${f}: broken link ${t}`);
  }
}

if (problems.length) { for (const p of problems) console.log(p); console.error(`\nreadme-check: ${problems.length} problem(s)`); process.exit(1); }
console.log(`readme-check: ${present.length} READMEs consistent`);
