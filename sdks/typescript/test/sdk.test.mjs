// Runs the SDK against tools/mock-server.mjs (no network, no key, no charges).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { StudioClient, TeamClient, OpenClient, AlgoHashError } from "../dist/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
let proc, base;
before(async () => {
  proc = spawn(process.execPath, [path.join(ROOT, "tools/mock-server.mjs")], { env: { ...process.env, PORT: "0" } });
  base = await new Promise((res, rej) => {
    proc.stdout.on("data", (b) => { const m = /http:\/\/[\d.]+:\d+/.exec(String(b)); if (m) res(m[0]); });
    proc.on("exit", (c) => rej(new Error("mock exited " + c)));
  });
});
after(() => proc && proc.kill());

const studio = (key, extra = {}) => new StudioClient({ apiKey: key, endpoint: base + "/mcp/studio", ...extra });

test("initialize negotiates the latest protocol", async () => {
  const s = studio("smk_mock_read");
  const init = await s.initialize();
  assert.equal(init.protocolVersion, "2025-11-25");
  assert.equal(init.serverInfo.name, "studio");
});

test("tools/list matches the generated groups", async () => {
  const tools = await studio("smk_mock_read").listTools();
  assert.equal(tools.length, 22);
  assert.ok(tools.every((t) => !("x-actions" in t)));
});

test("read action succeeds", async () => {
  const r = await studio("smk_mock_read").core.listAssets({ pillar: "avatars" });
  assert.equal(r.status, "ok");
  assert.equal(r.data.action, "list_assets");
});

test("server-side scope_denied is parsed", async () => {
  const r = await studio("smk_mock_read").create.storyboard({ args: { prompt: "x" } });
  assert.equal(r.status, "error");
  assert.equal(r.code, "scope_denied");
  assert.equal(r.local, false);
  assert.throws(() => r.unwrap(), (e) => e instanceof AlgoHashError && e.code === "scope_denied");
});

test("local preflight refuses before the network when keyScopes is set", async () => {
  const r = await studio("smk_mock_read", { keyScopes: ["read"] }).create.storyboardDraw({ version: "v1" });
  assert.equal(r.code, "scope_denied");
  assert.equal(r.local, true);
});

test("allowedActions splits the matrix", () => {
  const s = studio("smk_mock_read");
  const { allowed, denied } = s.allowedActions(["read"]);
  assert.ok(allowed.includes("studio.list_assets"));
  assert.ok(denied.includes("studio_create.storyboard_draw"));
  assert.equal(allowed.length + denied.length, 329);
});

test("paid call returns needs_confirmation and nothing runs", async () => {
  const r = await studio("smk_mock_read_edit_spend").create.storyboardDraw({ version: "v1" });
  assert.equal(r.status, "needs_confirmation");
  assert.ok(r.confirmToken);
  assert.equal(r.feeHwt, 120);
});

test("callWithApproval: user says yes → token repeat runs once", async () => {
  const s = studio("smk_mock_read_edit_spend");
  const seen = [];
  const r = await s.callWithApproval("studio_create", { action: "storyboard_draw", version: "v1" },
    { approve: (q) => { seen.push(q); return true; } });
  assert.equal(r.status, "ok");
  assert.equal(seen.length, 1);
  assert.equal(seen[0].kind, "confirmation");
  assert.match(r.data.job_id, /^job_mock_/);
});

test("callWithApproval: user says no → declined, no charge", async () => {
  const r = await studio("smk_mock_read_edit_spend").callWithApproval("studio_create",
    { action: "storyboard_draw", version: "v2" }, { approve: () => false });
  assert.equal(r.status, "declined");
});

test("token is bound to the exact arguments", async () => {
  // Owner approval off: the token is usable at once, so only the argument binding stops it.
  // (With owner approval on, an unapproved token answers awaiting_approval first.)
  const s = studio("smk_mock_read_edit_spend_agentapproval");
  const q = await s.create.storyboardDraw({ version: "v3" });
  const r = await s.create.storyboardDraw({ version: "v4", confirm_token: q.confirmToken });
  assert.equal(r.code, "confirm_invalid");
});

test("publish + spend: permission round then quote round", async () => {
  const s = studio("smk_mock_all");
  const kinds = [];
  const r = await s.callWithApproval("studio", { action: "blog_generate", topic: "x", confirm: true }, { approve: (q) => { kinds.push(q.kind); return true; } });
  assert.equal(r.status, "ok");
  assert.deepEqual(kinds, ["permission", "confirmation"]);
});

test("card mode uses studio_confirm.show + wait", async () => {
  const r = await studio("smk_mock_read_edit_spend").callWithApproval("studio_create",
    { action: "storyboard_draw", version: "v5" }, { card: true });
  assert.equal(r.status, "ok");
});

test("rate_limited is retried then surfaced", async () => {
  const r = await studio("smk_mock_read_ratelimited", { retryRateLimited: 1 }).core.listAssets();
  assert.equal(r.code, "rate_limited");
  assert.equal(r.retryAfterSec, 1);
});

test("bad key throws invalid_api_key", async () => {
  await assert.rejects(studio("nope").listTools(), (e) => e.code === "invalid_api_key" && e.httpStatus === 401);
});

test("batch keeps order", async () => {
  const rs = await studio("smk_mock_read").batch([
    { tool: "studio", args: { action: "list_assets" } },
    { tool: "studio_outputs", args: { action: "get" } },
  ]);
  assert.equal(rs.length, 2);
  assert.equal(rs[0].data.action, "list_assets");
});

test("team: client_ref and approvals", async () => {
  const t = new TeamClient({ apiKey: "tmk_mock_read_edit_spend", endpoint: base + "/mcp/team" });
  assert.equal((await t.core.overview()).status, "ok");
  const r = await t.callWithApproval("team_deploy", { action: "deploy", room_id: 1, args: { goal: "x" } }, { approve: () => true });
  assert.equal(r.status, "ok");
});

test("open: list_models, quote, generate, job_status, balance", async () => {
  const o = new OpenClient({ apiKey: "ahk_mock", endpoint: base + "/open/v1/mcp" });
  const m = await o.listModels({ kind: "image" });
  assert.equal(m.data.models[0].op, "image.sample");
  assert.equal((await o.quote({ op: "image.sample" })).data.price_hwt, 40);
  const j = await o.generate({ op: "image.sample", inputs: { prompt: "x" } });
  assert.equal((await o.jobStatus({ job_id: j.data.job_id })).data.status, "completed");
  assert.equal((await o.balance()).data.balance_hwt, 10000);
});
