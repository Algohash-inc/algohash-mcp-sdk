# Changelog

All notable changes are listed here. Versions follow [Semantic Versioning](https://semver.org).

## 0.1.0 — unreleased

First public release.

- Interface spec for the Studio (22 tools), Team (6 tools) and Open API (5 tools) MCP servers, with
  per-action scopes and flags.
- TypeScript, Python and Go clients with generated per-tool wrappers, local scope preflight
  (`canCall`, `allowedActions`), batch calls, and `callWithApproval` for the approval protocol.
- Hardened transport: HTTPS only (except `localhost`), no redirects, response size cap, keys never
  printed or serialized.
- Local mock server, permissions scanner, code generator and leak scanner.
- Docs, generated tool reference, samples in all three languages, MCP host configs.
- README in 8 languages. Approval docs cover owner approval on AlgoHash (`approve_url`,
  `awaiting_approval`, the "Only I can approve paid and risky steps" key setting).
- Owner approval in all three SDKs: `ApprovalRequest` carries `approval` ("user" | "agent") and
  `approveUrl`; for "user" the helper waits with `studio_confirm.wait` / `team_confirm.wait`
  (`maxWaitSec`, default 300) and returns `awaiting_approval` on timeout. Approval links on another
  origin are dropped. New status `awaiting_approval`. Team spec adds `team_confirm.wait` (70 actions).
- Mock server: owner-approval flow with an approve page (`MOCK_APPROVE_VIA_PAGE=1`,
  `MOCK_DECLINE=1`, `*_agentapproval` keys).
