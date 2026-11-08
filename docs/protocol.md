# Protocol

## Transport

- **Studio, Team:** MCP Streamable HTTP, stateless. One `POST` endpoint, JSON-RPC 2.0, `application/json`
  responses. No session id, no server-to-client notifications, no SSE stream is required (the SDKs
  still accept a `text/event-stream` reply).
- **Open API:** JSON-RPC 2.0 over `POST`.

Request headers the SDKs send:

```
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer <key>
MCP-Protocol-Version: <negotiated version>      (after initialize)
```

Request body limit: 2 MiB (Studio). Responses can be larger (an MCP-Apps resource is a few hundred KB);
the SDKs cap responses at 32 MiB by default.

## Versions

Studio and Team accept `2024-11-05`, `2025-03-26`, `2025-06-18` and `2025-11-25`. An unknown version gets
the newest. The SDKs ask for `2025-11-25`.

`structuredContent` and `resource_link` blocks are only sent to clients on `2025-06-18` or later. Older
clients get the same information as text.

## Methods

| Method | Studio | Team | Open API |
|---|---|---|---|
| `initialize` | ✓ (returns `instructions`) | ✓ | ✓ (no key needed) |
| `notifications/initialized` | ✓ | ✓ | ✓ |
| `ping` | ✓ | ✓ | — |
| `tools/list` | ✓ | ✓ | ✓ |
| `tools/call` | ✓ | ✓ | ✓ |
| `resources/list`, `resources/read` | ✓ (MCP-Apps cards) | — | — |

## Batching

Studio accepts a JSON array of up to **20** messages in one request; each is rate-limited on its own and
the replies come back as an array. The SDKs refuse bigger batches locally.

```ts
const [a, b] = await studio.batch([
  { tool: "studio", args: { action: "list_assets" } },
  { tool: "studio_outputs", args: { action: "get", args: { output_ids: ["o_1"] } } },
]);
```

Do not batch paid calls: each one returns its own `needs_confirmation`.

## Tool results

```json
{
  "content": [
    { "type": "text", "text": "{…json…}" },
    { "type": "image", "data": "<base64>", "mimeType": "image/jpeg" },
    { "type": "resource_link", "uri": "https://…signed…", "name": "out.mp4", "mimeType": "video/mp4" },
    { "type": "text", "text": "NEXT: …" }
  ],
  "structuredContent": { "ok": true, "…": "…", "next": { "…": "…" } },
  "isError": false
}
```

- `structuredContent` is the authoritative result when present.
- Errors: `isError: true`, and the first text block starts with `ERROR: <code> — <message>`.
- "Ask the user" states: `isError: false`, `structuredContent.ok === false`, `structuredContent.error`
  is `needs_confirmation` / `needs_permission` / `needs_cast`.
- `resource_link` URLs are signed and expire. Download them; do not store them as permanent links.

## Idempotency

- Team calls that create something accept `client_ref` (any string). Repeating the call with the same
  `client_ref` within 10 minutes returns the first result (`replayed: true`) instead of creating twice.
- Team drafts carry a revision `rev`; edits must send the latest `rev` or get `stale_rev`.
- Open API: byte-identical submissions within 15 s collapse into one job (same `job_id`).
