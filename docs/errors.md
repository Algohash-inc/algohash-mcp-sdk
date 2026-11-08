# Errors and limits

## Two kinds of failure

| Kind | How it arrives | SDK behaviour |
|---|---|---|
| **Transport / protocol** — bad key, network, HTTP 4xx/5xx, JSON-RPC error | HTTP status or a JSON-RPC `error` object | throws `AlgoHashError` (TS, Python) / returns `*algohash.Error` (Go) |
| **Tool** — the tool ran (or was refused) and says why | `tools/call` result with `isError: true` and `ERROR: <code> — …` | returns a `ToolResult` with `status: "error"` and `code` |

"Ask the user" states (`needs_confirmation`, `needs_permission`, `needs_cast`, `needs_storyboard`) are
neither: see [approvals](approvals.md).

## Transport / protocol codes

| SDK `code` | HTTP / JSON-RPC | Meaning | Retry? |
|---|---|---|---|
| `invalid_api_key` | 401, `-32001` | Missing, wrong, revoked or expired key. `WWW-Authenticate` points at OAuth metadata | No — fix the key |
| `rate_limited` | 429, `-32029` | Too many requests, or too many failed authentications from your address | Yes, after `retryAfterSec` |
| `invalid_params` | `-32602` | Unknown tool name or malformed params | No |
| `method_not_found` | `-32601` | Unsupported JSON-RPC method | No |
| `http_400` | 400, `-32600` | Batch over 20, or invalid JSON-RPC | No |
| `http_5xx` | 5xx | Server error | Reads: yes. Paid calls: **check before retrying** |
| `network_error` | — | Connection failed, timed out, or a redirect was refused | Reads: yes. Paid calls: **check before retrying** |
| `response_too_large` | — | Reply bigger than `maxResponseBytes` | No |
| `insecure_endpoint`, `bad_endpoint`, `bad_api_key` | — | Refused locally before sending: plain-http URL, credentials in the URL, key with control characters | No |
| `batch_too_large`, `no_approver` | — | Refused locally | No |

## Tool codes you will meet

| `code` | Meaning | What to do |
|---|---|---|
| `scope_denied` | The key lacks a scope this action needs (`local: true` if the SDK refused it before sending) | Use a key with the scope, or don't call it |
| `permission_denied` | The account's approval rules block this action | Tell the user; only they can change the rule |
| `rate_limited` | This class of call (read / edit / spend / publish) is too frequent for the key or account, or too many calls are in flight | Wait `retryAfterSec`. The call did **not** run, so retrying is safe |
| `confirm_required` | A destructive action without `confirm: true` | Ask the user, then send `confirm: true` |
| `confirm_invalid` | Token unknown, expired, already used, or the arguments changed | Repeat the original call without a token to get a fresh one |
| `bad_args` | Invalid arguments. Team adds a `format` with usage and an example | Fix the arguments |
| `stale_rev` | Team draft changed since you read it | `get` the draft, use the new `rev` |
| `insufficient_balance` | Not enough HWT. Nothing was charged | Top up |
| `storage_full` | Account storage is full | Free space |
| `not_found` | No such item **in your account** | Check the id |
| `needs_approved_storyboard`, `storyboard_not_approved` | Video render without an approved storyboard | Follow the storyboard flow |
| `job_failed`, `generation_failed` | The job ran and failed. Failed paid jobs are refunded | Read `message`; change inputs before retrying |
| `tool_error` | An error without a machine code | Read `message` |

The server may add codes. Branch on the ones you handle and treat anything else as a failure.

## Retrying safely

**Never blind-retry a paid call.** A paid call might have been accepted before the connection dropped.

- The SDKs retry only `rate_limited` (default twice, waiting `retry_after_sec`, at most 30 s each). A
  rate-limited call was refused before it ran.
- After a network error on a paid call, look before you retry: Studio `studio.list_jobs` /
  `studio_outputs.get`, Team `team_deploy.runs`, Open API `job_status`.
- Retrying a Studio paid call needs a fresh approval anyway (tokens are single-use).
- Team creates: send a `client_ref`; a retry with the same `client_ref` returns the first result.

## Limits

| Limit | Value |
|---|---|
| Studio batch | 20 messages |
| Studio request body | 2 MiB |
| Studio confirm threshold | 50 HWT per step |
| MCP key daily cap (Studio, Team) | 300 HWT by default; set per key by the owner |
| Keys per account | 10 static keys per server, plus OAuth connections |
| Approval token lifetime | about 5 minutes, single use |
| `studio_confirm.wait` | up to 50 s per call |

Rate limits are applied per key and per account, separately for read, edit, spend and publish calls,
plus a cap on calls in flight. They can change; rely on `retry_after_sec`, not on fixed numbers.
