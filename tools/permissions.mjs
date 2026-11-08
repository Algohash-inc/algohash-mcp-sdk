#!/usr/bin/env node
// Show what a key with a given scope set can and cannot do, from spec/*.json.
//
//   node tools/permissions.mjs studio read,edit
//   node tools/permissions.mjs team read --denied      # list every denied action
//   node tools/permissions.mjs studio read,edit,spend --json
//
// This is the base matrix. A few actions need extra scopes for some arguments
// (see docs/reference/permissions.md); the server re-checks every call.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [server, scopeArg = ""] = process.argv.slice(2);
if (!["studio", "team", "open"].includes(server)) {
  console.error("usage: node tools/permissions.mjs <studio|team|open> <scope,scope,...> [--denied] [--json]");
  process.exit(2);
}
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, "spec", `${server}.json`), "utf8"));
const have = scopeArg.split(",").map((s) => s.trim()).filter(Boolean);
const bad = have.filter((s) => !spec.scopes.includes(s));
if (bad.length) { console.error(`unknown scope(s) for ${server}: ${bad.join(", ")} (valid: ${spec.scopes.join(", ") || "none"})`); process.exit(2); }

const rows = [];
for (const t of spec.tools) {
  const acts = t["x-actions"] || [];
  if (!acts.length) { rows.push({ tool: t.name, action: null, scopes: [], allowed: true, spends: t.name === "generate" }); continue; }
  for (const a of acts) rows.push({ tool: t.name, action: a.name, scopes: a.scopes, allowed: a.scopes.every((s) => have.includes(s)), spends: !!a.spends });
}
if (process.argv.includes("--json")) { console.log(JSON.stringify({ server, scopes: have, actions: rows }, null, 1)); process.exit(0); }

const by = new Map();
for (const r of rows) { const g = by.get(r.tool) || { ok: 0, no: 0 }; r.allowed ? g.ok++ : g.no++; by.set(r.tool, g); }
const ok = rows.filter((r) => r.allowed).length;
console.log(`${server} key with [${have.join(", ") || "no scopes"}]: ${ok} allowed, ${rows.length - ok} denied\n`);
console.log("tool".padEnd(22) + "allowed  denied");
for (const [t, g] of by) console.log(t.padEnd(22) + String(g.ok).padStart(7) + String(g.no).padStart(8));
const paidOk = rows.filter((r) => r.allowed && r.spends);
const paidNoSpend = paidOk.filter((r) => !r.scopes.includes("spend"));
if (paidOk.length - paidNoSpend.length) console.log(`\n⚠ ${paidOk.length - paidNoSpend.length} allowed action(s) spend HWT (above the confirm threshold each needs a fresh approval).`);
if (paidNoSpend.length) console.log(`ℹ ${paidNoSpend.length} allowed action(s) are free with some arguments and paid with others (${paidNoSpend.map((r) => r.action).join(", ")}); the paid path is refused without \`spend\`.`);
if (process.argv.includes("--denied")) {
  console.log("\nDenied:");
  for (const r of rows.filter((x) => !x.allowed)) console.log(`  ${r.tool}.${r.action}  needs ${r.scopes.join(" + ")}`);
}
