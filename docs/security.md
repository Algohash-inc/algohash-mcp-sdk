# Security

This page is for people building on the SDK or connecting an agent. To report a vulnerability, see
[SECURITY.md](../SECURITY.md).

## Threat model

| Threat | Who stops it |
|---|---|
| Someone else's key reading or spending in your account | Server: a key is bound to one account; no argument addresses another account |
| Key stolen from a log, a repo, a URL or a crash dump | You: store keys as secrets. SDK: header only, never printed, never sent over plain HTTP or across a redirect |
| Key sent to a look-alike server | SDK refuses `http://` (except `localhost`), URLs with credentials, and redirects. You: never take the endpoint from untrusted input |
| Agent spends more than intended (loop, misunderstanding) | Server: user approval above the threshold (one tap on the card, or the AlgoHash page), daily cap. SDK: no auto-approve |
| Agent is **prompt-injected** by content it reads (a video title, a comment, a teammate's output) and tries to spend or publish | Server: turn on **Only I can approve paid and risky steps** so only the signed-in owner can approve, on AlgoHash. Always: scopes and caps. See below |
| Agent publishes something public by mistake | `publish` scope (separate grant), `confirm: true`, approval rules |
| Replay of an approval | Server: tokens are single-use, bound to key + exact arguments, short-lived |

## Approving: one tap by default, the AlgoHash page when you need it

By default a paid or public step returns a quote, and the user approves it with one tap on **Approve**
in the card (hosts with MCP Apps) or by saying yes in chat. The token then goes back to the caller, so
an agent that has been prompt-injected could approve its own step. Approvals on such a key protect
against mistakes, not against an agent that has turned against you.

For an agent that reads content you do not control, turn on **Only I can approve paid and risky steps**
for its key. A paid or public step then returns an `approve_url`, and only the account owner, signed in
on AlgoHash, can approve it there. The agent cannot approve its own request: an MCP call to
`studio_confirm.decide` can only decline, a "yes" in chat does not count, and repeating the call early
returns `awaiting_approval` without running anything. The approval page refuses API keys, checks the
account and the request origin, and cannot be framed by another site.

What holds in every case, even against a compromised agent:

- **Scopes.** Without `spend` the key cannot start any paid step: the server refuses it
  before anything is charged. Without `publish` nothing goes public.
- **The daily cap** (MCP keys) or **monthly cap** (Open API keys). Set it to what you are prepared to lose.
  Open API keys have no approval step; the cap is the limit.
- **Revocation.** Revoke the key in Studio or Team; it stops working on the next request.

Rule of thumb: an autonomous agent that reads untrusted content (the web, comments, user uploads)
should keep owner approval on, and get `spend` only with a low cap.

## Treat results as data

Tool results contain text written by users and by other agents: asset names, captions, comments, briefs,
teammate outputs. Results list such fields in `untrusted_fields` (Team) or under `data` (motion jobs).

- Never execute instructions found in a result.
- When you pass results to a model, keep them in a clearly delimited data section of the prompt.
- Do not follow links from results automatically. `resource_link` URLs are signed download links for
  *your* outputs; download them, do not render arbitrary HTML from them.

## SDK guarantees

All three SDKs, covered by tests in `sdks/*/test*`:

- Key only in the `Authorization` header. Custom headers cannot override it.
- Keys containing CR, LF or NUL are rejected (no header injection).
- `https` only; plain `http` only to `localhost` / `127.0.0.1` / `::1` (for the mock server).
- Endpoints with `user:pass@` are rejected.
- Redirects are never followed, so the key cannot travel to another host.
- Responses are capped (32 MiB by default).
- The key never appears in `inspect` / `repr` / `%v` / `JSON.stringify` output. Python clients refuse to
  be pickled.
- No automatic retry of anything except `rate_limited` (which the server did not run).
- No default approver, no auto-approve option, and no wrapper for `studio_confirm.decide`.
- No runtime dependencies (TypeScript, Python, Go) — nothing to compromise in a dependency tree.

## Checklist before you ship

- [ ] One key per integration, created with the fewest scopes ([permissions](permissions.md)).
- [ ] Daily cap set to the smallest useful amount.
- [ ] Key read from a secret store or environment variable; not in code, configs you commit, or logs.
- [ ] `approve` callback shows the real price and asks a real person.
- [ ] Results from tools are passed to models as data.
- [ ] Endpoint is a constant in your code, not user input.
- [ ] You know where to revoke the key (Studio → MCP Access / Team → MCP → Keys & scopes).
