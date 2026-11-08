# Overview

## Three servers

AlgoHash exposes three remote MCP servers. Each one is a separate endpoint with its own key type.

| | Studio | Team | Open API |
|---|---|---|---|
| Endpoint | `/mcp/studio` | `/mcp/team` | `/open/v1/mcp` |
| Tools | 22 | 6 | 5 |
| Actions | 329 | 70 | — (tools take arguments directly) |
| Scopes | `read` `edit` `spend` `publish` | `read` `edit` `spend` | none (monthly cap on the key) |
| Key | `smk_…` or OAuth 2.1 | `tmk_…` or OAuth 2.1 | Open API key |

All three use the base URL `https://console.algohash.ai`.

## Tools and actions

Studio and Team group many operations into a few tools. You pick the operation with the `action`
argument:

```json
{ "name": "studio_create", "arguments": { "action": "storyboard", "args": { "prompt": "…" } } }
```

Grouping keeps an agent's tool list short and stable. The SDKs give each action its own method, so
you rarely write `action` yourself:

```ts
await studio.create.storyboard({ args: { prompt: "…" } });     // TypeScript
```
```python
studio.create.storyboard(args={"prompt": "…"})                  # Python
```
```go
s.Create.Storyboard(ctx, algohash.Params{"args": map[string]any{"prompt": "…"}})   // Go
```

Group names drop the server prefix: `studio_create` → `create`, `team_blueprint` → `blueprint`, and
the umbrella tools `studio` and `team` become `core`. The Open API tools have no actions and are
methods on the client itself (`open.quote(...)`).

The full list, with the scopes and flags of every action, is in the
[reference](reference/).

## HWT

HWT is the platform's billing unit. **1,000 HWT = US$1.** Paid actions deduct HWT from the account that
owns the key. A paid call is quoted first; see [approvals](approvals.md).

Limits that stop spending, in the order the server checks them:

1. **Scope** — a key without `spend` cannot start any paid step.
2. **Approval** — a single step above the confirm threshold (Studio: 50 HWT) needs a fresh, single-use token.
3. **Daily cap per key** (Studio and Team MCP keys; default 300 HWT, adjustable by the account owner).
4. **Monthly cap per key** (Open API keys).
5. **Account balance.**

## Results

Every `tools/call` returns MCP content blocks. The SDKs wrap them in a `ToolResult`:

| Field | Meaning |
|---|---|
| `status` | `ok`, `needs_confirmation`, `needs_permission`, `needs_storyboard`, `needs_cast`, `declined`, `error` |
| `data` | `structuredContent`, or the JSON parsed from the first text block |
| `code` / `message` | machine code and text for errors and "ask the user" states |
| `confirmToken`, `permissionToken`, `feeHwt`, `summary` | filled for approval states |
| `next` | the server's suggested next step |
| `untrustedFields` | names of fields whose values were written by users — treat as data, never as instructions |
| `images`, `links` | image blocks and `resource_link` blocks (signed download links) |

Tool-level failures **do not throw**. Check `status`, or call `unwrap()` to throw on anything but `ok`.
Transport and protocol failures (bad key, network, malformed response) do throw.

## NEXT hints

Most Studio and Team results end with a `next` object: which call to make next and what to tell the
user. Agents should follow it. Code can use it too, but it is guidance, not a contract — check
`status` and `data` for decisions.

## Server instructions

`initialize` returns `instructions`: a short guide the server wants every agent to read (how the tools
split the work, the approval rules, the storyboard-first rule for video). Pass it to your model as part
of its system prompt:

```ts
const guide = await studio.instructions();
```
