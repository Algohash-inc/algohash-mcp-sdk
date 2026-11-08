// Transport-safety guarantees. These must never regress.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import util from "node:util";
import { StudioClient, McpClient, assertSafeEndpoint } from "../dist/index.js";

const KEY = "smk_mock_secret_value_do_not_print";

test("plain http to a non-loopback host is refused before any request", () => {
  assert.throws(() => new StudioClient({ apiKey: KEY, endpoint: "http://example.com/mcp/studio" }), (e) => e.code === "insecure_endpoint");
});

test("https and http://localhost are accepted", () => {
  assert.ok(assertSafeEndpoint("https://console.algohash.ai/mcp/studio"));
  assert.ok(assertSafeEndpoint("http://127.0.0.1:8787/mcp/studio"));
  assert.ok(assertSafeEndpoint("http://localhost:8787/mcp/studio"));
});

test("credentials in the URL are refused", () => {
  assert.throws(() => assertSafeEndpoint("https://u:p@console.algohash.ai/mcp/studio"), (e) => e.code === "bad_endpoint");
});

test("keys with CR/LF are refused (header injection)", () => {
  assert.throws(() => new StudioClient({ apiKey: "smk_x\r\nX-Evil: 1" }), (e) => e.code === "bad_api_key");
});

test("the key never appears in inspect / JSON / String output", () => {
  const c = new StudioClient({ apiKey: KEY });
  for (const s of [util.inspect(c, { depth: 5, showHidden: true }), JSON.stringify(c), String(c), JSON.stringify(Object.entries(c))]) {
    assert.ok(!s.includes(KEY), "leaked: " + s.slice(0, 200));
  }
});

test("custom headers cannot override Authorization", async () => {
  let seen;
  const srv = http.createServer((req, res) => { seen = req.headers.authorization; res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-11-25" } })); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const c = new McpClient({ server: "studio", apiKey: KEY, endpoint: `http://127.0.0.1:${srv.address().port}/mcp`, headers: { authorization: "Bearer attacker" } });
  await c.initialize().catch(() => {});
  srv.close();
  assert.equal(seen, `Bearer ${KEY}`);
});

test("custom headers cannot override Authorization in any casing", async () => {
  for (const name of ["Authorization", "AUTHORIZATION", "aUthorization"]) {
    let seen;
    const srv = http.createServer((req, res) => { seen = req.headers.authorization; res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-11-25" } })); });
    await new Promise((r) => srv.listen(0, "127.0.0.1", r));
    const c = new McpClient({ server: "studio", apiKey: KEY, endpoint: `http://127.0.0.1:${srv.address().port}/mcp`, headers: { [name]: "Bearer attacker" } });
    await c.initialize().catch(() => {});
    srv.close();
    assert.equal(seen, `Bearer ${KEY}`, name);
  }
});

test("approve links on another origin, or with user info, are dropped from results", async () => {
  const links = [];
  const srv = http.createServer((req, res) => {
    let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => {
      const m = JSON.parse(b); res.setHeader("content-type", "application/json");
      const port = srv.address().port;
      const url = [`http://127.0.0.1:${port}/mcp/studio/approve/mca_ok`, "https://evil.example/approve", `http://user@127.0.0.1:${port}/approve`][links.length];
      if (m.method === "tools/call") links.push(url);
      res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: m.method === "tools/call"
        ? { structuredContent: { ok: false, error: "awaiting_approval", approval: "user", approve_url: url } } : { protocolVersion: "2025-11-25" } }));
    });
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const c = new McpClient({ server: "studio", apiKey: KEY, endpoint: `http://127.0.0.1:${srv.address().port}/mcp/studio` });
  const got = [];
  for (let i = 0; i < 3; i++) got.push((await c.call("studio", { action: "list_assets" })).approveUrl);
  srv.close();
  assert.equal(got[0], links[0]);
  assert.equal(got[1], undefined);
  assert.equal(got[2], undefined);
});

test("redirects are not followed (the key must not travel to another host)", async () => {
  let hit = false;
  const target = http.createServer((req, res) => { hit = true; res.end("{}"); });
  await new Promise((r) => target.listen(0, "127.0.0.1", r));
  const srv = http.createServer((req, res) => { res.writeHead(307, { location: `http://127.0.0.1:${target.address().port}/steal` }); res.end(); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const c = new McpClient({ server: "studio", apiKey: KEY, endpoint: `http://127.0.0.1:${srv.address().port}/mcp` });
  await assert.rejects(c.initialize(), (e) => e.code === "network_error");
  srv.close(); target.close();
  assert.equal(hit, false);
});

test("oversized responses are cut off", async () => {
  const srv = http.createServer((req, res) => { res.setHeader("content-type", "application/json"); res.end("x".repeat(4096)); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const c = new McpClient({ server: "studio", apiKey: KEY, endpoint: `http://127.0.0.1:${srv.address().port}/mcp`, maxResponseBytes: 1024 });
  await assert.rejects(c.initialize(), (e) => e.code === "response_too_large");
  srv.close();
});

test("batch over 20 is refused locally", async () => {
  const c = new StudioClient({ apiKey: KEY, endpoint: "http://127.0.0.1:1/mcp/studio" });
  await assert.rejects(c.batch(Array.from({ length: 21 }, () => ({ tool: "studio" }))), (e) => e.code === "batch_too_large");
});

test("callWithApproval refuses to run without a human approver", async () => {
  const c = new StudioClient({ apiKey: KEY, endpoint: "http://127.0.0.1:1/mcp/studio" });
  await assert.rejects(c.callWithApproval("studio", { action: "generate_image" }, {}), (e) => e.code === "no_approver");
});

test("there is no wrapper that records an approval decision", () => {
  const c = new StudioClient({ apiKey: KEY });
  assert.equal(typeof c.confirm.decide, "undefined");
  assert.equal(typeof c.confirm.show, "function");
});
