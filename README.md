<p align="center">
  <a href="https://console.algohash.ai"><img src="assets/cover.jpg" alt="AlgoHash MCP SDK: build on AlgoHash from any language, any agent, any AI app. TypeScript, Python and Go." width="100%"></a>
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> |
  <a href="README.zh-TW.md">🇹🇼 繁體中文</a> |
  <a href="README.zh-CN.md">🇨🇳 简体中文</a> |
  <a href="README.ja.md">🇯🇵 日本語</a> |
  <a href="README.ko.md">🇰🇷 한국어</a> |
  <a href="README.es.md">🇪🇸 Español</a> |
  <a href="README.vi.md">🇻🇳 Tiếng Việt</a> |
  <a href="README.id.md">🇮🇩 Bahasa Indonesia</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge" alt="Version 0.1.0">
  <img src="https://img.shields.io/badge/MCP_tools-33-purple?style=for-the-badge" alt="33 MCP tools">
  <img src="https://img.shields.io/badge/actions-399-green?style=for-the-badge" alt="399 actions">
  <img src="https://img.shields.io/badge/runtime_deps-0-brightgreen?style=for-the-badge" alt="Zero runtime dependencies">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Node_18+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/MCP-2024--11--05_→_2025--11--25-6E56CF?style=flat-square" alt="MCP protocol versions">
</p>

<p align="center">
  <b>Build on AlgoHash from any language, any agent, any AI app.</b>
</p>

<p align="center">
  The official open-source SDK for the AlgoHash <a href="https://modelcontextprotocol.io">Model Context Protocol</a> servers.<br>
  Generate images and video, run storyboards, manage your AI team and call the Open API,<br>
  with typed clients for <b>TypeScript</b>, <b>Python</b> and <b>Go</b>, all generated from one open spec.
</p>

<p align="center">
  <a href="https://console.algohash.ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg">
      <img src="assets/hero.svg" alt="AlgoHash MCP SDK: one typed client in TypeScript, Python and Go for the Studio, Team and Open API MCP servers" width="800">
    </picture>
  </a>
</p>

<p align="center">
  <a href="#-quick-start"><b>Quick Start</b></a> ·
  <a href="docs/overview.md"><b>Docs</b></a> ·
  <a href="docs/reference/"><b>Tool Reference</b></a> ·
  <a href="samples/"><b>Samples</b></a> ·
  <a href="docs/security.md"><b>Security</b></a> ·
  <a href="CHANGELOG.md"><b>Changelog</b></a>
</p>

---

## ✨ Why AlgoHash MCP SDK

- **🔗 One SDK, three servers** - Studio, Team and Open API share one client shape, one result type and one error model
- **🛡️ Safe by default** - paid and public Studio and Team steps wait for you to approve them on AlgoHash; your agent cannot approve its own spending
- **🧬 Typed and generated** - 399 actions, each wrapped and documented straight from the open spec, so the SDK never drifts from the servers
- **🪶 Zero dependencies** - platform `fetch`, `urllib` and `net/http` only; nothing extra to audit, pin or patch
- **🧪 Try it without a key** - a local mock server runs every sample and test with no account and no spend

## 🚀 Quick Start

### 1. Install

```bash
npm install @algohash/mcp                                  # TypeScript / JavaScript
pip install algohash-mcp                                   # Python
go get github.com/Algohash-inc/algohash-mcp-sdk/sdks/go      # Go
```

### 2. Get a key

Create one in **Studio → MCP → Keys** (or **Team → MCP → Keys & scopes**, or the Open API key page),
then keep it in an environment variable. Never hard-code it.

```bash
export ALGOHASH_STUDIO_KEY="smk_..."
```

### 3. Make your first call

```ts
import { StudioClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY!, keyScopes: ["read", "edit"] });
const assets = await studio.core.listAssets({ pillar: "avatars" });
console.log(assets.status, assets.data);
```

No key yet? Run `node tools/mock-server.mjs` and set `ALGOHASH_MOCK=1`. Every sample works offline.

## 🧩 What You Can Build

| Server | Endpoint | Build Things Like | Key |
|----------|----------|----------|----------|
| **🎬 Studio** | `https://console.algohash.ai/mcp/studio` | An agent that turns a brief into a storyboard, then a finished video · a library browser · a scheduled social publisher | `smk_…` or OAuth |
| **🤝 Team** | `https://console.algohash.ai/mcp/team` | A team builder that drafts teammates from a brief · a deploy bot that assigns work to a group · an evolution loop | `tmk_…` or OAuth |
| **⚡ Open API** | `https://console.algohash.ai/open/v1/mcp` | A pricing widget · a batch generator with quotes · a balance monitor | Open API key |

Every key is bound to **one account: yours**. No argument can reach another account, and the server
enforces that whatever the client does.

## 🔍 See What a Key Can Do

Every action in the spec declares the scopes it needs. Scan a key before you hand it to an agent:

```
+------------------------------------------------------------------------------+
|  KEY: Studio, scopes [read, edit]           271 allowed  ·  58 denied        |
+------------------------------------------------------------------------------+
|                                                                              |
|  ALLOWED (sample)                                                            |
|     studio.list_assets ............ read      browse your library            |
|     studio_create.storyboard ...... edit      plan a storyboard (free)       |
|     studio_storyboard.approve ..... edit      approve a drawn storyboard     |
|                                                                              |
|  DENIED: needs spend                                                         |
|     studio.generate_image ......... spend     paid image generation          |
|     studio_create.storyboard_draw . spend     draw storyboard frames         |
|                                                                              |
|  DENIED: needs publish                                                       |
|     studio.ig_publish_now ......... publish   posts publicly                 |
|                                                                              |
|  NOTE                                                                        |
|     motion_create, motion_direct_reply: free with some arguments, paid       |
|     with others. The paid path is refused without `spend`.                   |
|                                                                              |
+------------------------------------------------------------------------------+
```

```bash
node tools/permissions.mjs studio read,edit            # this table, per tool
node tools/permissions.mjs studio read,edit --denied   # only what the key cannot do
```

The same check is built into every client: `canCall`, `allowedActions` and `requiredScopes` refuse an
out-of-scope call before it leaves your machine.

## 💳 How a Paid Call Works

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CALL                                                        │
│     studio.generate_image { prompt, ratio }                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. LOCAL PREFLIGHT (SDK)                                       │
│     • Key has `spend`?  No → scope_denied, nothing is sent      │
│     • HTTPS endpoint, no redirect, key in header only           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. SERVER QUOTES: needs_confirmation (not an error)            │
│     • fee_hwt + summary + single-use confirm_token              │
│     • MCP Apps hosts show a card: Approve / Decline             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. THE USER APPROVES                                           │
│     • one tap on Approve, or a yes in chat. Nothing charged yet │
│     • page-approval keys: only the owner, on approve_url        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. SAME CALL + confirm_token → job starts, cost charged once   │
└─────────────────────────────────────────────────────────────────┘
```

Public steps (posting, publishing) follow the same loop with `needs_permission` and a
`permission_token`. Destructive steps are refused with `confirm_required` unless you pass `confirm: true`.

## 🧭 Studio vs. Team vs. Open API

### 🟣 Studio

- Your Studio account: library, images, video, storyboards, editor, outputs, social posts
- Scopes `read`, `edit`, `spend`, `publish`; new keys default to `read` + `edit` + `spend`
- Storyboard first: every video starts from a storyboard you approved
- 22 tools · 329 actions

### 🟢 Team

- Your AI team: teammates, groups, blueprints, skills, deploys, evolution
- Scopes `read`, `edit`, `spend`; new keys default to `read` + `edit`
- Always asks before spending, deleting, applying a draft or opening a risky tool
- `client_ref` makes create calls safe to retry; drafts carry a `rev`
- 6 tools · 70 actions

### 🟠 Open API

- Model catalog, quotes, job submission, balance
- No scopes; a monthly cap on the key
- Quote first, then generate, then poll `job_status`
- 5 tools

## 📦 Features

- **Generated wrappers** - one method per action in all three languages, with scopes and flags in the doc comments
- **Local scope preflight** - out-of-scope calls fail fast with `scope_denied` and never reach the network
- **Approval helpers** - `callWithApproval` hands every quote and permission request to your approver and never approves on its own
- **Hardened transport** - HTTPS only (except `localhost`), no redirects, response size cap, keys never printed or serialized
- **Batching and retries** - up to 20 calls per batch; `rate_limited` is retried with the server's `retry_after_sec`, capped at 30 seconds
- **Typed results** - one `ToolResult` for data, approvals and errors, plus `next` hints from the server
- **Mock server and scanners** - offline mock, permission scanner, code generator and leak scanner in `tools/`
- **Generated reference** - every tool, action, scope and flag in [docs/reference](docs/reference/)

## 🔌 Connect an AI App

No code needed. Point the app at a server URL and sign in.

| Host | How |
|----------|----------|
| **Claude** (web, desktop, mobile) | Settings → Connectors → Add custom connector → paste the URL → sign in |
| **ChatGPT** | Settings → Apps & Connectors → Developer mode → Create → URL + OAuth |
| **VS Code** | [`samples/hosts/vscode/mcp.json`](samples/hosts/vscode/mcp.json) (key prompted, never stored in the file) |
| **Claude Code** | [`samples/hosts/claude-code/.mcp.json`](samples/hosts/claude-code/.mcp.json) (key from `${ALGOHASH_STUDIO_KEY}`) |
| **OpenAI Codex** | [`samples/hosts/codex/config.toml`](samples/hosts/codex/config.toml) (`bearer_token_env_var`) |

Step-by-step guides for every host: [docs/hosts.md](docs/hosts.md).

## 💻 SDK Usage

### TypeScript

```ts
import { StudioClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY!, keyScopes: ["read", "edit", "spend"] });

// Free read.
const assets = await studio.core.listAssets({ pillar: "avatars" });

// Paid step: the server answers needs_confirmation with a price and a single-use token.
// callWithApproval hands it to YOUR approver; it never approves on its own.
const r = await studio.callWithApproval(
  "studio_create",
  { action: "storyboard_draw", version: "v_123" },
  { approve: async (q) => askHuman(`Spend ${q.feeHwt} HWT on ${q.tool}.${q.action}? ${q.approveUrl ?? ""}`) },
);
console.log(r.status, r.data);   // "ok" | "declined" | "awaiting_approval" | "error" | …
```

### Python

```python
import os
from algohash_mcp import StudioClient

studio = StudioClient(os.environ["ALGOHASH_STUDIO_KEY"], key_scopes=["read", "edit", "spend"])
r = studio.call_with_approval("studio_create", {"action": "storyboard_draw", "version": "v_123"},
                              approve=lambda q: ask_human(f"Spend {q.fee_hwt} HWT? {q.approve_url or ''}"))
```

### Go

```go
s := algohash.NewStudio(os.Getenv("ALGOHASH_STUDIO_KEY"), algohash.WithKeyScopes("read", "edit", "spend"))
r, err := s.CallWithApproval(ctx, "studio_create", algohash.Params{"action": "storyboard_draw", "version": "v_123"}, askHuman)
```

### Example Prompts

Once a server is connected to your AI app, just ask:

```
Show me the characters in my Studio library.
Plan a 20-second storyboard for a coffee brand, then show me the quote before drawing it.
Build a three-person research team from this brief and let me review the draft first.
How much would a 1K image cost on the Open API?
```

### Samples

```bash
node tools/mock-server.mjs                                    # terminal 1: 127.0.0.1:8787
```

```bash
ALGOHASH_MOCK=1 node samples/typescript/03-generate-image.mjs # terminal 2
```

| Sample | TypeScript | Python | Go |
|----------|----------|----------|----------|
| **What can this key do?** | `01-permissions.mjs` | `01_permissions.py` | `cmd/permissions` |
| **Browse the library** | `02-library.mjs` | `02_library.py` | |
| **Generate an image (paid)** | `03-generate-image.mjs` | `03_generate_image.py` | `cmd/generate-image` |
| **Storyboard, then video** | `04-storyboard-video.mjs` | `04_storyboard_video.py` | |
| **Team: deploy work** | `05-team-deploy.mjs` | `05_team_deploy.py` | `cmd/team-deploy` |
| **Open API: quote → generate** | `06-open-quote.mjs` | `06_open_quote.py` | `cmd/open-quote` |
| **Tools for your own agent** | `07-agent-context.mjs` | | |

Samples ask you in the terminal before any paid or public step. With no terminal, they decline.

## 📚 Documentation

| Topic | What You Will Learn |
|----------|----------|
| [Overview](docs/overview.md) | Servers, tools and actions, HWT, results, `next` hints |
| [Authentication](docs/authentication.md) | Static keys, OAuth 2.1, rotation, storage |
| [Permissions](docs/permissions.md) | Scopes, least privilege, scanning a key · [full matrix](docs/reference/permissions.md) |
| [Approvals](docs/approvals.md) | `needs_confirmation`, `needs_permission`, `needs_storyboard`, `needs_cast` |
| [Protocol](docs/protocol.md) | Transport, versions, batching, result shapes |
| [Errors and limits](docs/errors.md) | Every error code, what to retry and what never to retry |
| [Security](docs/security.md) | Threat model for integrators: keys, prompt injection, spend control |
| [Connecting MCP hosts](docs/hosts.md) | Claude, ChatGPT, VS Code, Claude Code, Codex, any client |
| **Guides** | [Studio](docs/guides/studio.md) · [Team](docs/guides/team.md) · [Open API](docs/guides/open.md) |
| **SDKs** | [TypeScript](docs/sdk-typescript.md) · [Python](docs/sdk-python.md) · [Go](docs/sdk-go.md) |
| **Reference** | [Studio](docs/reference/studio.md) · [Team](docs/reference/team.md) · [Open API](docs/reference/open.md) (generated) |

## 🔐 Security

**Nothing is charged until you approve.** A paid or public step first comes back as a quote. One tap on
**Approve** in the card runs it (hosts without cards: say yes in chat). For keys that need more, turn on
**Only I can approve paid and risky steps**: those steps then return an `approve_url`, only you can
approve them on AlgoHash while signed in, and a "yes" typed in chat does not count.

- **Least privilege** - give each integration the fewest scopes it needs. `spend` and `publish` are separate grants, and `spend` does not imply `edit`
- **Hard limits** - scopes, the daily cap (MCP keys) or monthly cap (Open API keys), and revocation hold even if an agent is prompt-injected
- **Keys stay secret** - sent only in the `Authorization` header over HTTPS, never printed, never followed across a redirect

> With one-tap approval, a prompt-injected agent could approve a step itself. Turn on **Only I can approve paid and risky steps** for any key whose agent reads content you do not control.
> Without it, approvals stop mistakes, not a compromised agent. Read [docs/security.md](docs/security.md) first.

Found a vulnerability? Report it privately, as described in [SECURITY.md](SECURITY.md).

## 🤝 Contributing

Contributions are welcome. This repository is the **interface only**: tools, arguments, scopes, the
approval protocol and error codes. It contains no server code, and the server is the authority for everything.

```
spec/                 The interface: studio.json, team.json, open.json (+ i18n summaries)
sdks/typescript/      @algohash/mcp
sdks/python/          algohash-mcp
sdks/go/              github.com/Algohash-inc/algohash-mcp-sdk/sdks/go
docs/                 Guides + generated reference
samples/              TypeScript, Python, Go samples + MCP host configs
tools/                codegen · mock-server · permissions · leak-scan · readme-check
```

```bash
# 1. The spec is the source of truth. Regenerate wrappers and reference:
node tools/codegen.mjs

# 2. Check generated files, scan for leaks, keep translations in step
node tools/codegen.mjs --check
node tools/leak-scan.mjs
node tools/readme-check.mjs

# 3. Test all three SDKs
(cd sdks/typescript && npm ci --ignore-scripts && npm test)
(cd sdks/python && python3 -m unittest discover -s tests)
(cd sdks/go && go vet ./... && go test -race ./...)
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open a pull request. CI runs the same steps and every
sample against the mock server.

## 🛠 Troubleshooting

### `scope_denied`

The key lacks a scope the action needs. Check with `node tools/permissions.mjs studio <your scopes>`,
then add the scope in Studio → MCP → Keys (or Team → MCP → Keys & scopes). Do not retry unchanged.

### `needs_confirmation` / `needs_permission`

Not errors. Show the user the price and the summary (hosts with cards show the card). Once they approve
(one tap, or yes in chat; on page-approval keys, on the `approve_url` page), repeat the
**exact same call** with the token. Tokens are single-use, bound to the arguments, and expire after about
5 minutes. Changed an argument? Ask again.

### `awaiting_approval`

Page-approval keys only: you retried before the owner approved on AlgoHash. Nothing ran and nothing was charged. Wait with
`studio_confirm.wait` (or `team_confirm.wait`), then retry with the same token.

### `insecure_endpoint` / `bad_endpoint`

The SDK refuses `http://` (except `localhost`) and URLs that contain credentials. Use the `https://`
endpoint. Never take the endpoint from untrusted input.

### `rate_limited`

Wait `retry_after_sec` seconds. The SDKs retry this automatically, capped at 30 seconds.

### `stale_rev` (Team)

Someone changed the draft. Call `team_blueprint.get` for the latest `rev`, then retry with it.

### A key leaked

Revoke it now in the app. It stops working on the next request. Then check your account activity.

## 💬 Community & Support

- **Questions and bugs** - open an issue on this repository
- **Security reports** - never in public; follow [SECURITY.md](SECURITY.md)
- **What changed** - [CHANGELOG.md](CHANGELOG.md)
- **Works with** - Claude (web, desktop, mobile) · ChatGPT · VS Code (GitHub Copilot Chat) · Claude Code · OpenAI Codex · any MCP client that speaks Streamable HTTP

---

## 📄 License

Released under the [MIT License](LICENSE). Copyright © 2026 AlgoHash Inc.

<p align="center">
  <a href="https://console.algohash.ai"><img src="assets/algohash-icon.png" alt="AlgoHash" width="40" height="40"></a><br>
  <sub>Built by <a href="https://console.algohash.ai">AlgoHash</a> · If this SDK helps you, give the repository a ⭐</sub>
</p>
