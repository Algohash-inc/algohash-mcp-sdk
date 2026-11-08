# TypeScript / JavaScript SDK

`@algohash/mcp` — Node 18+, Deno, Bun and browsers. Zero runtime dependencies (uses `fetch`).

```bash
npm install @algohash/mcp
```

## Clients

```ts
import { StudioClient, TeamClient, OpenClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY! });
const team   = new TeamClient({ apiKey: process.env.ALGOHASH_TEAM_KEY! });
const open   = new OpenClient({ apiKey: process.env.ALGOHASH_OPEN_KEY! });
```

| Option | Default | |
|---|---|---|
| `apiKey` / `accessToken` | — | Static key or OAuth access token (one is required) |
| `keyScopes` | unset | The key's scopes; enables local preflight (`scope_denied`, `local: true`) |
| `endpoint` | production URL | Override, e.g. `http://127.0.0.1:8787/mcp/studio` for the mock |
| `timeoutMs` | `120000` | Per request |
| `retryRateLimited` | `2` | Waits out `rate_limited` this many times; nothing else is retried |
| `maxResponseBytes` | 32 MiB | Larger replies throw `response_too_large` |
| `protocolVersion` | `"2025-11-25"` | |
| `clientInfo` | SDK name/version | Sent in `initialize` |
| `headers` | — | Extra headers (cannot override `Authorization`) |
| `fetch` | global `fetch` | Inject your own (proxy, tracing) |

## Calling actions

```ts
await studio.core.listAssets({ pillar: "avatars" });           // studio.list_assets
await studio.create.storyboard({ args: { prompt: "…" } });      // studio_create.storyboard
await team.core.overview();                                     // team.overview
await team.blueprint.fromTemplate({ id: "t1" });                // team_blueprint.from_template
await open.quote({ op: "…", args: {} });                        // open: quote
```

Each wrapper is `(params?, opts?) => Promise<ToolResult>`; its doc comment carries the English summary,
required scopes and flags. Raw access:

```ts
await studio.call("studio_create", { action: "storyboard", args: { prompt: "…" } });
await studio.callAction("studio_create", "storyboard", { args: { prompt: "…" } });
```

## Results

```ts
const r = await studio.core.listGallery({ kind: "outputs" });
switch (r.status) {
  case "ok":                 use(r.data); break;
  case "needs_confirmation": /* r.feeHwt, r.confirmToken */ break;
  case "error":              console.error(r.code, r.message); break;
}
const data = r.unwrap();     // throws AlgoHashError unless ok
r.images; r.links; r.next; r.untrustedFields;
```

## Approvals

```ts
const r = await studio.callWithApproval("studio", { action: "generate_image", prompt: "…" }, {
  approve: async (q) => confirmWithUser(q),     // q.kind, q.feeHwt, q.summary, q.tool, q.action
                                                // q.approval "user" → show q.approveUrl; true = wait
  // card: true,                                // Studio in MCP-Apps hosts: show the card and wait
  // maxWaitSec: 300,                           // how long to wait for the owner on AlgoHash
});
// r.status: "ok" | "declined" | "awaiting_approval" (r.approveUrl, r.confirmToken) | …
```

By default one tap approves. When the key owner turns on page approval, only they can approve, on
`q.approveUrl` on AlgoHash. See
[Approvals](approvals.md#the-sdk-helper) for what `true` means.

## Permissions

```ts
studio.requiredScopes("studio", "generate_image");   // ["spend"]
studio.canCall("studio", "generate_image", ["read"]); // false
studio.allowedActions(["read", "edit"]);             // { allowed: [...], denied: [...] }
```

## Other methods

`initialize()`, `instructions()`, `ping()`, `listTools()`, `batch([{ tool, args }])` (≤ 20), `rpc(method, params)`.

## Errors

Transport and protocol failures throw `AlgoHashError` with `code`, `httpStatus`, `rpcCode`,
`retryAfterSec`, `data` and `retryable`. See [errors](errors.md).
