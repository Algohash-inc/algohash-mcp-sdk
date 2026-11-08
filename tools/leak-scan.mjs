#!/usr/bin/env node
// Fails CI if the repo contains anything that should never be published:
// secrets, personal paths, private IPs, stray emails, or anything on a private deny-list.
//
//   node tools/leak-scan.mjs                  # scan the repo
//   node tools/leak-scan.mjs --deny list.txt  # plus extra patterns (one regex per line, # comments)
//   LEAK_SCAN_DENY="re1\nre2" node tools/leak-scan.mjs   # same, from the environment (CI secret)
//
// Keep any private deny-list OUTSIDE this repo: the list itself would reveal what it protects.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "__pycache__", ".venv", ".pytest_cache"]);
const SKIP_FILES = new Set(["package-lock.json", "go.sum"]);
const TEXT_EXT = /\.(md|json|mjs|js|ts|py|go|mod|toml|ya?ml|txt|cfg|ini|sh|html|css|example|gitignore|editorconfig)$|^(LICENSE|Makefile|Dockerfile|CODEOWNERS)$/i;

const RULES = [
  // secrets
  { id: "studio-or-team-key", re: /\b(?:smk|tmk)_(?!mock)[A-Za-z0-9_-]{20,}/g },
  { id: "sk-style-key", re: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/g },
  { id: "aws-access-key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { id: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/g },
  { id: "slack-token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { id: "google-api-key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "stripe-key", re: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { id: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { id: "private-key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { id: "password-assignment", re: /\b(?:password|passwd|secret|api_key)\s*[:=]\s*["'][^"'\s]{8,}["']/gi },
  // personal / machine paths
  { id: "home-path", re: /(?:\/Users\/|\/home\/)(?!runner\b|you\b|me\b|<)[A-Za-z0-9._-]+/g },
  { id: "windows-home", re: /C:\\Users\\[A-Za-z0-9._-]+/g },
  { id: "tmp-session-path", re: /\/private\/tmp\/|\/var\/folders\//g },
  // network
  { id: "ipv4", re: /\b(?!127\.0\.0\.1\b)(?!0\.0\.0\.0\b)(?!192\.0\.2\.)(?!198\.51\.100\.)(?!203\.0\.113\.)(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { id: "internal-tld", re: /(?<=\/\/|@|["'`])(?:[a-z0-9-]+\.)+(?:internal|local|lan|corp|ts\.net)\b/g },
  { id: "email", re: /\b[A-Za-z0-9._%+-]+@(?!example\.(?:com|org)\b)(?!(?:[a-z0-9-]+\.)*algohash\.ai\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
];

// Allowed mentions (MCP hosts users connect from are not our infrastructure).
const ALLOW = [
  /\bOpenAI Codex\b/g, /\bChatGPT\b/g, /`?pip install`?/g,
];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* walk(path.join(dir, e.name)); continue; }
    if (SKIP_FILES.has(e.name)) continue;
    if (TEXT_EXT.test(e.name)) yield path.join(dir, e.name);
  }
}

const args = process.argv.slice(2);
const extra = [];
const di = args.indexOf("--deny");
const denyText = [di >= 0 ? fs.readFileSync(args[di + 1], "utf8") : "", process.env.LEAK_SCAN_DENY || ""].join("\n");
for (const l of denyText.split("\n").map((x) => x.trim()).filter((x) => x && !x.startsWith("#"))) {
  extra.push({ id: "private-deny", re: new RegExp(l, "gi") });
}

let n = 0;
for (const f of walk(ROOT)) {
  const rel = path.relative(ROOT, f);
  let text = fs.readFileSync(f, "utf8");
  for (const a of ALLOW) text = text.replace(a, (m) => " ".repeat(m.length));
  const rules = [...RULES, ...extra];
  for (const r of rules) {
    r.re.lastIndex = 0;
    for (const m of text.matchAll(r.re)) {
      const line = text.slice(0, m.index).split("\n").length;
      console.log(`${rel}:${line}: [${r.id}] ${r.id === "private-deny" ? "(match hidden)" : JSON.stringify(m[0].slice(0, 60))}`);
      n++;
    }
  }
}
if (n) { console.error(`\nleak-scan: ${n} finding(s)`); process.exit(1); }
console.log("leak-scan: clean");
