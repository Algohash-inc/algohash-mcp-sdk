#!/usr/bin/env node
// Local mock of the three AlgoHash MCP endpoints, driven entirely by spec/*.json.
//
// It reproduces the *interface contract* only — auth, scopes, approval tokens, errors,
// rate limiting, NEXT hints — so SDKs, samples and CI can run with no account, no key
// and no charges. It never generates media and its results are placeholders.
//
//   node tools/mock-server.mjs            # listens on 127.0.0.1:8787
//   PORT=9000 node tools/mock-server.mjs
//
// Keys (any suffix after the prefix is fine):
//   smk_mock_<scopes>      Studio key, e.g. smk_mock_read_edit   (scopes joined by "_")
//   tmk_mock_<scopes>      Team key,   e.g. tmk_mock_read_edit_spend
//   ahk_mock               Open API key
//   *_ratelimited          always answers rate_limited (retry_after_sec = 1)
//   smk_mock_all           every scope
//   *_agentapproval        key with "Only I can approve paid and risky steps" OFF (approval: "agent")
//
// Approval (default keys, approval: "user"): needs_confirmation / needs_permission carry an approve_url.
// Repeating the call before the "user" decides returns awaiting_approval. The mock user decides on the
// first studio_confirm.wait / team_confirm.wait call (approve; MOCK_DECLINE=1 declines). With
// MOCK_APPROVE_VIA_PAGE=1 the mock user decides only when you open the approve_url in a browser
// (GET /approve/<id>, or /approve/<id>?decision=decline), and wait long-polls like the live server.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, "spec", `${n}.json`), "utf8"));
const SPEC = { studio: load("studio"), team: load("team"), open: load("open") };
const ROUTES = { "/mcp/studio": "studio", "/mcp/team": "team", "/open/v1/mcp": "open" };
const PREFIX = { studio: "smk_", team: "tmk_", open: "ahk_" };
const LATEST = "2025-11-25";
const MOCK_FEE_HWT = 120;

const tokens = new Map();          // token -> { kind, key, tool, action, argsHash, used, human, decision, aid, exp }
const byAid = new Map();           // approval id -> token
let BASE = "http://127.0.0.1:8787";
const TOKEN_TTL_MS = 5 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let jobSeq = 0;

const argsHash = (a) => {
  const c = { ...a }; delete c.confirm_token; delete c.permission_token; delete c.client_ref;
  return crypto.createHash("sha256").update(JSON.stringify(c, Object.keys(c).sort())).digest("hex");
};
const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const err = (id, code, message, data) => ({ jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } });
const textResult = (obj, { isError = false, next, meta } = {}) => {
  const s = next ? { ...obj, next } : obj;
  return { content: [{ type: "text", text: JSON.stringify(obj) }, ...(next ? [{ type: "text", text: `NEXT: ${next.say}` }] : [])],
    structuredContent: s, isError, ...(meta ? { _meta: meta } : {}) };
};
const errorResult = (code, message, extra = {}) => ({
  content: [{ type: "text", text: `ERROR: ${code} — ${message}` }],
  structuredContent: { ok: false, error: code, message, ...extra }, isError: true,
});

function scopesOfKey(server, key) {
  if (server === "open") return [];
  const rest = key.slice(PREFIX[server].length).replace(/^mock_?/, "").replace(/_(agentapproval|ratelimited)\b/g, "");
  if (rest === "all" || rest === "") return [...SPEC[server].scopes];
  return rest.split("_").filter((s) => SPEC[server].scopes.includes(s));
}

function actionMeta(server, tool, action) {
  const t = SPEC[server].tools.find((x) => x.name === tool);
  if (!t) return null;
  return (t["x-actions"] || []).find((a) => a.name === action) || null;
}

function approvalTool(server) { return server === "team" ? "team_confirm" : "studio_confirm"; }

function issue(kind, key, name, action, h) {
  const t = (kind === "confirm" ? "cfm_" : "perm_") + crypto.randomBytes(8).toString("hex");
  const human = !key.includes("_agentapproval");
  const aid = crypto.randomBytes(8).toString("hex");
  tokens.set(t, { kind, key, tool: name, action, argsHash: h, used: false, human, decision: "", aid, exp: Date.now() + TOKEN_TTL_MS });
  byAid.set(aid, t);
  return t;
}
const approvalOut = (rec) => (rec.human ? { approval: "user", approve_url: `${BASE}/approve/${rec.aid}` } : { approval: "agent" });
const pendingHuman = (rec) => !!(rec && rec.human && !rec.decision && !rec.used && rec.exp > Date.now());

async function callTool(server, key, name, args) {
  const spec = SPEC[server];
  const tool = spec.tools.find((t) => t.name === name);
  if (!tool) return { rpcError: [-32602, `Unknown tool: ${name}`] };

  if (server === "open") return openTool(name, args);

  const action = String(args.action || "");
  const meta = actionMeta(server, name, action);
  if (!meta) return errorResult("bad_args", `unknown action "${action}" for ${name}`,
    { format: { actions: (tool["x-actions"] || []).map((a) => a.name) } });

  const have = scopesOfKey(server, key);
  if (!meta.scopes.every((s) => have.includes(s))) {
    return errorResult("scope_denied", `this action needs [${meta.scopes.join(" + ")}]; key has [${have.join(", ")}]`,
      { needs: meta.scopes, have });
  }
  if (key.endsWith("_ratelimited")) {
    const r = errorResult("rate_limited", "too many calls — retry in 1s (retry_after_sec=1)", { retry_after_sec: 1 });
    r._meta = { retry_after_sec: 1 };
    return r;
  }

  // Approval helpers (studio_confirm / team_confirm): show = render a card, wait = user decision,
  // decide = the card's own click (an MCP key may only decline approval:"user" tokens).
  if (name === approvalTool(server)) {
    const inner = args.args && typeof args.args === "object" ? args.args : {};
    const tok = args.confirm_token || args.permission_token || inner.confirm_token || inner.permission_token;
    const rec = tok && tokens.get(tok);
    const own = rec && rec.key === key;
    if (action === "show") return textResult({ ok: true, shown: true, token: tok || null, ...(own ? approvalOut(rec) : {}) });
    if (action === "decide") {
      if (!own) return textResult({ ok: false, status: "not_found", decision: "" });
      const d = String(inner.decision || args.decision || "");
      if (d === "approve" && rec.human) return textResult({ ok: false, status: "user_required", decision: "", ...approvalOut(rec) });
      rec.decision = d === "approve" ? "approved" : "declined";
      return textResult({ ok: true, status: "decided", decision: rec.decision });
    }
    // Mirrors the live shape: { status: open|decided|expired|used|not_found, decision: approved|declined|"" }.
    if (action === "wait") {
      if (!own) return textResult({ status: "not_found", decision: "" });
      const out = (status) => textResult({ status, decision: rec.decision || "", expires_at: Math.floor(rec.exp / 1000), ...approvalOut(rec) });
      if (rec.used) return out("used");
      if (rec.exp <= Date.now()) return out("expired");
      if (rec.decision) return out("decided");
      if (process.env.MOCK_APPROVE_VIA_PAGE === "1") {
        const sec = Math.max(1, Math.min(50, parseInt(inner.timeout_sec ?? args.timeout_sec, 10) || 50));
        const until = Date.now() + sec * 1000;
        while (!rec.decision && Date.now() < until) await sleep(100);
        return out(rec.decision ? "decided" : "open");
      }
      // The mock user decides right away: approve, or decline with MOCK_DECLINE=1.
      rec.decision = process.env.MOCK_DECLINE === "1" ? "declined" : "approved";
      return out("decided");
    }
    return textResult({ ok: true, action });
  }

  // A token the user has not approved yet: nothing runs, nothing is charged, the token stays valid.
  for (const field of ["confirm_token", "permission_token"]) {
    const rec = typeof args[field] === "string" && tokens.get(args[field]);
    if (rec && rec.key === key && pendingHuman(rec)) {
      return textResult({ ok: false, error: "awaiting_approval", [field]: args[field], expires_at: Math.floor(rec.exp / 1000), ...approvalOut(rec),
        message: "The user has not approved this yet on AlgoHash. Give them the approve_url, wait, then repeat the call. Nothing ran and nothing was charged." },
        { next: { call: `${approvalTool(server)}.wait`, say: "Still waiting for the user to approve on AlgoHash." } });
    }
  }

  if (meta.destructiveConfirm && args.confirm !== true) {
    return errorResult("confirm_required", `"${action}" is destructive — ask the user, then call again with confirm: true`);
  }

  const h = argsHash(args);
  const consume = (field, kind) => {
    const t = args[field];
    if (!t) return false;
    const rec = tokens.get(t);
    if (!rec || rec.used || rec.kind !== kind || rec.key !== key || rec.tool !== name || rec.action !== action || rec.argsHash !== h) return null;
    if (rec.exp <= Date.now() || rec.decision === "declined" || (rec.human && rec.decision !== "approved")) return null;
    rec.used = true;
    return true;
  };

  // A matching, unused quote token also counts as the user's permission (same as live).
  const quoteCovers = (() => {
    const rec = args.confirm_token && tokens.get(args.confirm_token);
    return !!(rec && !rec.used && rec.kind === "confirm" && rec.key === key && rec.tool === name && rec.action === action && rec.argsHash === h
      && rec.decision !== "declined" && (!rec.human || rec.decision === "approved"));
  })();

  // publish → user approval rule ("ask") → needs_permission
  if (meta.scopes.includes("publish") && !quoteCovers) {
    const c = consume("permission_token", "permission");
    if (c === null) return errorResult("confirm_invalid", "permission_token does not match these exact arguments, or was already used");
    if (!c) {
      const t = issue("permission", key, name, action, h);
      return textResult({ ok: false, error: "needs_permission", permission_token: t, ...approvalOut(tokens.get(t)),
        summary: `${name}.${action} (mock)`,
        message: "The user's approval rules ask before this action. Show the permission card, wait, then repeat the call with permission_token." },
        { next: { call: `${approvalTool(server)}.show`, say: "Ask the user to allow this action." } });
    }
  }

  // spend → quote above threshold → needs_confirmation
  if (meta.scopes.includes("spend")) {
    const c = consume("confirm_token", "confirm");
    if (c === null) return errorResult("confirm_invalid", "confirm_token does not match these exact arguments, or was already used");
    if (!c) {
      const t = issue("confirm", key, name, action, h);
      return textResult({ ok: false, error: "needs_confirmation", fee_hwt: MOCK_FEE_HWT,
        confirm_threshold_hwt: spec.confirmThresholdHwt ?? 50, confirm_token: t, ...approvalOut(tokens.get(t)),
        summary: `${name}.${action} — about ${MOCK_FEE_HWT} HWT (mock)`,
        message: "Ask the user. If they agree, repeat the exact same call with confirm_token (valid 5 minutes, single use). Nothing was charged." },
        { next: { call: `${approvalTool(server)}.show`, say: `Show the quote (${MOCK_FEE_HWT} HWT) and wait for approval.` } });
    }
    const job = `job_mock_${++jobSeq}`;
    return textResult({ ok: true, mock: true, tool: name, action, job_id: job, charged_hwt: MOCK_FEE_HWT, status: "queued" },
      { next: { call: `${name}.${action.endsWith("status") ? action : "status"}`, say: "Poll the job until it finishes." } });
  }

  return textResult({ ok: true, mock: true, tool: name, action, scopes: meta.scopes,
    items: meta.scopes.includes("read") ? [] : undefined });
}

function openTool(name, args) {
  const rows = [
    { op: "image.sample", kind: "image", label: "Sample image model", price_hwt: 40, price_usd: 0.04, rate_unit: "image" },
    { op: "video.sample", kind: "video", label: "Sample video model", price_hwt: 1500, price_usd: 1.5, rate_unit: "second" },
  ];
  if (name === "list_models") {
    let r = rows;
    if (args.kind) r = r.filter((x) => x.kind === args.kind);
    if (args.search) r = r.filter((x) => (x.op + " " + x.label).toLowerCase().includes(String(args.search).toLowerCase()));
    return textResult({ currency: "HWT", hwt_per_usd: 1000, models: r });
  }
  if (name === "quote") {
    const row = rows.find((x) => x.op === args.op);
    if (!row) return errorResult("unknown_op", `Unknown op: ${args.op}`);
    return textResult({ op: row.op, price_hwt: row.price_hwt, price_usd: row.price_usd });
  }
  if (name === "generate") {
    const row = rows.find((x) => x.op === args.op);
    if (!row) return errorResult("unknown_op", `Unknown op: ${args.op}`);
    return textResult({ job_id: `job_mock_${++jobSeq}`, op: row.op, status: "running" });
  }
  if (name === "job_status") return textResult({ job_id: args.job_id, status: "completed", outputs: [{ kind: "image", url: "https://example.com/mock.png" }] });
  if (name === "balance") return textResult({ balance_hwt: 10000, currency: "HWT" });
  return { rpcError: [-32602, `Unknown tool: ${name}`] };
}

async function handle(server, key, msg) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return err(msg && msg.id !== undefined ? msg.id : null, -32600, "invalid request");
  const { id, method, params = {} } = msg;
  if (method.startsWith("notifications/")) return null;
  const spec = SPEC[server];
  if (method === "initialize") {
    const want = params.protocolVersion;
    return ok(id, { protocolVersion: spec.protocolVersions.includes(want) ? want : spec.protocolVersions.at(-1),
      capabilities: { tools: {} }, serverInfo: { name: spec.server === "open" ? "agent-hash-open" : spec.server, version: spec.serverVersion },
      instructions: `[mock] ${spec.instructions || ""}`.slice(0, 2500) });
  }
  if (method === "ping") return ok(id, {});
  if (method === "tools/list") {
    return ok(id, { tools: spec.tools.map(({ ["x-actions"]: _a, ...t }) => t) });
  }
  if (method === "tools/call") {
    const r = await callTool(server, key, String(params.name || ""), { ...(params.arguments || {}) });
    if (r.rpcError) return err(id, r.rpcError[0], r.rpcError[1]);
    return ok(id, r);
  }
  return err(id, -32601, `method not found: ${method}`);
}

const srv = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const server = ROUTES[url.pathname];
  const send = (status, body, headers = {}) => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(body === undefined ? "" : JSON.stringify(body));
  };
  if (req.method === "GET" && url.pathname === "/healthz") return send(200, { ok: true });
  // Mock approval page: opening approve_url approves (or ?decision=decline declines). Mock only:
  // the live page needs a signed-in AlgoHash session and refuses API keys.
  const ap = req.method === "GET" && /^\/approve\/([0-9a-f]{16})$/.exec(url.pathname);
  if (ap) {
    const rec = tokens.get(byAid.get(ap[1]) || "");
    if (!rec || rec.used || rec.exp <= Date.now()) { res.writeHead(410, { "content-type": "text/plain" }); return res.end("This approval request is gone (mock)."); }
    if (!rec.decision) rec.decision = url.searchParams.get("decision") === "decline" ? "declined" : "approved";
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end(`${rec.decision === "approved" ? "Approved" : "Declined"}: ${rec.tool}.${rec.action} (mock)`);
  }
  if (!server) return send(404, { error: "not_found" });
  if (req.method !== "POST") return send(405, { error: "method_not_allowed" });
  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > (SPEC[server].maxBodyBytes || 2 * 1024 * 1024)) req.destroy(); });
  req.on("end", async () => {
    let body;
    try { body = JSON.parse(raw); } catch { return send(400, err(null, -32700, "parse error")); }
    const auth = String(req.headers.authorization || "");
    const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const first = Array.isArray(body) ? body[0] : body;
    const needsKey = !(server === "open" && first && first.method === "initialize");
    if (needsKey && !key.startsWith(PREFIX[server])) {
      return send(401, err(null, -32001, `invalid or revoked ${server} key`),
        { "WWW-Authenticate": `Bearer resource_metadata="http://${req.headers.host}/.well-known/oauth-protected-resource${url.pathname}"` });
    }
    if (Array.isArray(body)) {
      if (body.length > (SPEC[server].maxBatch || 20)) return send(400, err(null, -32600, `batch limit is ${SPEC[server].maxBatch || 20}`));
      const outs = (await Promise.all(body.map((m) => handle(server, key, m)))).filter(Boolean);
      return outs.length ? send(200, outs) : send(202);
    }
    const out = await handle(server, key, body);
    return out ? send(200, out) : send(202);
  });
});

const PORT = Number(process.env.PORT || 8787);
srv.listen(PORT, "127.0.0.1", () => (BASE = `http://127.0.0.1:${srv.address().port}`, console.log(`mock AlgoHash MCP on http://127.0.0.1:${srv.address().port}  (/mcp/studio, /mcp/team, /open/v1/mcp)`)));
