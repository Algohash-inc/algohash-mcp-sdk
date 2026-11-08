// Owner approval on AlgoHash ("Only I can approve paid and risky steps", approval: "user").
// The mock runs with MOCK_APPROVE_VIA_PAGE=1: nothing is approved until the approve_url is opened.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { StudioClient, TeamClient } from "../dist/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
let proc, base;
before(async () => {
  proc = spawn(process.execPath, [path.join(ROOT, "tools/mock-server.mjs")], { env: { ...process.env, PORT: "0", MOCK_APPROVE_VIA_PAGE: "1" } });
  base = await new Promise((res, rej) => {
    proc.stdout.on("data", (b) => { const m = /http:\/\/[\d.]+:\d+/.exec(String(b)); if (m) res(m[0]); });
    proc.on("exit", (c) => rej(new Error("mock exited " + c)));
  });
});
after(() => proc && proc.kill());

const studio = (key) => new StudioClient({ apiKey: key, endpoint: base + "/mcp/studio" });
const userOpens = (url, decision) => setTimeout(() => fetch(url + (decision ? `?decision=${decision}` : "")), 300);

test("quote carries approval user + an approve_url on the endpoint's origin", async () => {
  const r = await studio("smk_mock_read_edit_spend").create.storyboardDraw({ version: "a1" });
  assert.equal(r.status, "needs_confirmation");
  assert.equal(r.approval, "user");
  assert.ok(r.approveUrl.startsWith(base + "/approve/"));
});

test("repeating before the owner approves → awaiting_approval, not an error, nothing runs", async () => {
  const s = studio("smk_mock_read_edit_spend");
  const q = await s.create.storyboardDraw({ version: "a2" });
  const r = await s.create.storyboardDraw({ version: "a2", confirm_token: q.confirmToken });
  assert.equal(r.status, "awaiting_approval");
  assert.equal(r.isError, false);
  assert.equal(r.approveUrl, q.approveUrl);
});

test("an MCP key cannot approve its own token through studio_confirm.decide", async () => {
  const s = studio("smk_mock_read_edit_spend");
  const q = await s.create.storyboardDraw({ version: "a3" });
  const d = await s.call("studio_confirm", { action: "decide", args: { confirm_token: q.confirmToken, decision: "approve" } });
  assert.equal(d.data.status, "user_required");
  const r = await s.create.storyboardDraw({ version: "a3", confirm_token: q.confirmToken });
  assert.equal(r.status, "awaiting_approval");
});

test("callWithApproval: approver shows the link, owner approves on AlgoHash → runs once", async () => {
  const seen = [];
  const r = await studio("smk_mock_read_edit_spend").callWithApproval("studio_create", { action: "storyboard_draw", version: "a4" },
    { approve: (q) => { seen.push(q); userOpens(q.approveUrl); return true; } });
  assert.equal(r.status, "ok");
  assert.match(r.data.job_id, /^job_mock_/);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].approval, "user");
});

test("callWithApproval: owner declines on AlgoHash → declined", async () => {
  const r = await studio("smk_mock_read_edit_spend").callWithApproval("studio_create", { action: "storyboard_draw", version: "a5" },
    { approve: (q) => { userOpens(q.approveUrl, "decline"); return true; } });
  assert.equal(r.status, "declined");
});

test("callWithApproval: owner never decides → awaiting_approval after maxWaitSec, with the link", async () => {
  const r = await studio("smk_mock_read_edit_spend").callWithApproval("studio_create", { action: "storyboard_draw", version: "a6" },
    { approve: () => true, maxWaitSec: 2 });
  assert.equal(r.status, "awaiting_approval");
  assert.ok(r.approveUrl);
  assert.ok(r.confirmToken);
});

test("approver says no → declined without waiting", async () => {
  const t0 = Date.now();
  const r = await studio("smk_mock_read_edit_spend").callWithApproval("studio_create", { action: "storyboard_draw", version: "a7" },
    { approve: () => false });
  assert.equal(r.status, "declined");
  assert.ok(Date.now() - t0 < 2000);
});

test("card mode waits for the owner on AlgoHash too", async () => {
  const s = studio("smk_mock_read_edit_spend");
  const q = await s.create.storyboardDraw({ version: "a8" });
  userOpens(q.approveUrl);
  // Same arguments → the card flow quotes again; open that link as well.
  const orig = s.call.bind(s);
  s.call = async (tool, args, o) => { const r = await orig(tool, args, o); if (r.status === "needs_confirmation") userOpens(r.approveUrl); return r; };
  const r = await s.callWithApproval("studio_create", { action: "storyboard_draw", version: "a8" }, { card: true });
  assert.equal(r.status, "ok");
});

test("key with owner approval off (approval agent) runs on the approver's yes", async () => {
  const seen = [];
  const r = await studio("smk_mock_read_edit_spend_agentapproval").callWithApproval("studio_create", { action: "storyboard_draw", version: "a9" },
    { approve: (q) => { seen.push(q); return true; } });
  assert.equal(r.status, "ok");
  assert.equal(seen[0].approval, "agent");
  assert.equal(seen[0].approveUrl, undefined);
});

test("team: owner approval with team_confirm.wait", async () => {
  const t = new TeamClient({ apiKey: "tmk_mock_read_edit_spend", endpoint: base + "/mcp/team" });
  const r = await t.callWithApproval("team_deploy", { action: "deploy", room_id: 1, args: { goal: "x" } },
    { approve: (q) => { userOpens(q.approveUrl); return true; } });
  assert.equal(r.status, "ok");
});

test("an approve_url on another origin is never handed to the approver", async () => {
  let calls = 0;
  const fake = async (_url, init) => {
    const msg = JSON.parse(init.body);
    const reply = (result) => new Response(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }), { headers: { "content-type": "application/json" } });
    if (msg.method === "initialize") return reply({ protocolVersion: "2025-11-25", capabilities: {}, serverInfo: { name: "studio", version: "x" } });
    if (msg.method !== "tools/call") return new Response(null, { status: 202 });
    calls++;
    if (msg.params.name === "studio_confirm") return reply({ content: [], structuredContent: { status: "decided", decision: "approved" } });
    if (calls === 1) return reply({ content: [], structuredContent: { ok: false, error: "needs_confirmation", confirm_token: "cfm_x", fee_hwt: 99,
      approval: "user", approve_url: "https://approve.example.org/phish" } });
    return reply({ content: [], structuredContent: { ok: true } });
  };
  const s = new StudioClient({ apiKey: "smk_mock_x", endpoint: "https://console.algohash.ai/mcp/studio", fetch: fake });
  let got;
  const r = await s.callWithApproval("studio", { action: "generate_image", prompt: "x" }, { approve: (q) => { got = q; return true; } });
  assert.equal(r.status, "ok");
  assert.equal(got.approval, "user");
  assert.equal(got.approveUrl, undefined);
});
