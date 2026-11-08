// Shared setup for the samples.
//   ALGOHASH_MOCK=1          → talk to tools/mock-server.mjs on 127.0.0.1:8787 with mock keys
//   ALGOHASH_STUDIO_KEY etc. → real keys (never hard-code them)
import readline from "node:readline/promises";
import { StudioClient, TeamClient, OpenClient } from "../../sdks/typescript/dist/index.js";

export const MOCK = process.env.ALGOHASH_MOCK === "1";
const MOCK_BASE = process.env.ALGOHASH_MOCK_URL || "http://127.0.0.1:8787";

function key(name, mockKey) {
  if (MOCK) return mockKey;
  const v = process.env[name];
  if (!v) { console.error(`Set ${name} (or ALGOHASH_MOCK=1 to use the local mock server).`); process.exit(2); }
  return v;
}
const scopes = (name) => (process.env[name] ? process.env[name].split(",").map((s) => s.trim()) : undefined);

export const studio = () => new StudioClient({
  apiKey: key("ALGOHASH_STUDIO_KEY", "smk_mock_read_edit_spend"), keyScopes: scopes("ALGOHASH_STUDIO_SCOPES"),
  ...(MOCK ? { endpoint: `${MOCK_BASE}/mcp/studio` } : {}),
});
export const team = () => new TeamClient({
  apiKey: key("ALGOHASH_TEAM_KEY", "tmk_mock_read_edit_spend"), keyScopes: scopes("ALGOHASH_TEAM_SCOPES"),
  ...(MOCK ? { endpoint: `${MOCK_BASE}/mcp/team` } : {}),
});
export const open = () => new OpenClient({
  apiKey: key("ALGOHASH_OPEN_KEY", "ahk_mock"), ...(MOCK ? { endpoint: `${MOCK_BASE}/open/v1/mcp` } : {}),
});

/**
 * Ask a human on the terminal. Returns true only for an explicit "y".
 * approval "user" (when the key owner turned on page approval): the owner approves on AlgoHash at q.approveUrl,
 * so print the link; "y" here only means "wait for my decision there".
 * Non-interactive runs are declined — except against the mock server with
 * ALGOHASH_MOCK_AUTO_APPROVE=1 (CI). Live endpoints are never auto-approved.
 */
export async function askHuman(q) {
  let text = q.kind === "confirmation"
    ? `Spend ${q.feeHwt ?? "?"} HWT on ${q.tool}.${q.action}? ${q.summary ?? ""}`
    : `Allow ${q.tool}.${q.action}? ${q.message ?? ""}`;
  if (q.approval === "user") {
    text += `\nApprove or decline on AlgoHash (signed in): ${q.approveUrl ?? "open AlgoHash → approvals"}\nWait for your decision there?`;
  }
  if (MOCK && process.env.ALGOHASH_MOCK_AUTO_APPROVE === "1") { console.log(`[mock auto-approve] ${text}`); return true; }
  if (!process.stdin.isTTY) { console.log(`[declined: no terminal to ask] ${text}`); return false; }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = await rl.question(`${text}\n[y/N] `);
  rl.close();
  return a.trim().toLowerCase() === "y";
}

export const show = (label, r) => console.log(`${label}: ${r.status}${r.code ? ` (${r.code})` : ""}`, r.status === "ok" ? JSON.stringify(r.data).slice(0, 300) : r.message ?? "");
