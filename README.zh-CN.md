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
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge" alt="版本 0.1.0">
  <img src="https://img.shields.io/badge/MCP_tools-33-purple?style=for-the-badge" alt="33 个 MCP 工具">
  <img src="https://img.shields.io/badge/actions-399-green?style=for-the-badge" alt="399 个 action">
  <img src="https://img.shields.io/badge/runtime_deps-0-brightgreen?style=for-the-badge" alt="零运行时依赖">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT 许可证"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Node_18+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/MCP-2024--11--05_→_2025--11--25-6E56CF?style=flat-square" alt="MCP 协议版本">
</p>

<p align="center">
  <b>用任何语言、任何 Agent、任何 AI 应用，在 AlgoHash 上构建你的产品。</b>
</p>

<p align="center">
  AlgoHash <a href="https://modelcontextprotocol.io">Model Context Protocol</a> 服务器的官方开源 SDK。<br>
  生成图片与视频、编排分镜、管理你的 AI 团队、调用 Open API，<br>
  提供 <b>TypeScript</b>、<b>Python</b> 和 <b>Go</b> 三种带类型的客户端，全部由同一份开放规范生成。
</p>

<p align="center">
  <a href="https://console.algohash.ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg">
      <img src="assets/hero.svg" alt="AlgoHash MCP SDK：一套带类型的客户端，用 TypeScript、Python 和 Go 对接 Studio、Team 与 Open API MCP 服务器" width="800">
    </picture>
  </a>
</p>

<p align="center">
  <a href="#-快速开始"><b>快速开始</b></a> ·
  <a href="docs/overview.md"><b>文档</b></a> ·
  <a href="docs/reference/"><b>工具参考</b></a> ·
  <a href="samples/"><b>示例</b></a> ·
  <a href="docs/security.md"><b>安全</b></a> ·
  <a href="CHANGELOG.md"><b>更新日志</b></a>
</p>

---

## ✨ 为什么选择 AlgoHash MCP SDK

- **🔗 一个 SDK，三个服务器** - Studio、Team 和 Open API 共用同一种客户端形态、同一种结果类型和同一套错误模型
- **🛡️ 默认安全** - 付费和对外发布的 Studio、Team 步骤，必须由你在 AlgoHash 上批准后才会执行；你的 Agent 无法自行批准自己的花费
- **🧬 带类型，自动生成** - 399 个 action，每一个都直接依据开放规范封装并写好文档，SDK 永远不会与服务器脱节
- **🪶 零依赖** - 只用平台自带的 `fetch`、`urllib` 和 `net/http`，没有额外依赖需要审计、锁定或打补丁
- **🧪 没有密钥也能体验** - 本地 mock 服务器可以运行所有示例和测试，无需账号，也不产生任何花费

## 🚀 快速开始

### 1. 安装

```bash
npm install @algohash/mcp                                  # TypeScript / JavaScript
pip install algohash-mcp                                   # Python
go get github.com/Algohash-inc/algohash-mcp-sdk/sdks/go      # Go
```

### 2. 获取密钥

在 **Studio → MCP → Keys**（或 **Team → MCP → Keys & scopes**，或 Open API 密钥页面）创建一个密钥，
然后把它放进环境变量中。切勿硬编码。

```bash
export ALGOHASH_STUDIO_KEY="smk_..."
```

### 3. 发起第一次调用

```ts
import { StudioClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY!, keyScopes: ["read", "edit"] });
const assets = await studio.core.listAssets({ pillar: "avatars" });
console.log(assets.status, assets.data);
```

还没有密钥？运行 `node tools/mock-server.mjs` 并设置 `ALGOHASH_MOCK=1`，所有示例都能离线运行。

## 🧩 你可以构建什么

| 服务器 | 端点 | 可以构建的东西 | 密钥 |
|----------|----------|----------|----------|
| **🎬 Studio** | `https://console.algohash.ai/mcp/studio` | 把一份简报变成分镜、再生成成片的 Agent · 素材库浏览器 · 定时社交媒体发布器 | `smk_…` 或 OAuth |
| **🤝 Team** | `https://console.algohash.ai/mcp/team` | 根据简报起草队友的团队构建器 · 给小组分派任务的部署机器人 · 进化循环 | `tmk_…` 或 OAuth |
| **⚡ Open API** | `https://console.algohash.ai/open/v1/mcp` | 价格小组件 · 带报价的批量生成器 · 余额监控 | Open API 密钥 |

每个密钥都只绑定**一个账号：你自己的**。任何参数都无法触及其他账号，无论客户端怎么做，服务器都会强制保证这一点。

## 🔍 查看密钥能做什么

规范中的每个 action 都声明了所需的 scope。把密钥交给 Agent 之前，先扫描一遍：

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

每个客户端都内置了同样的检查：`canCall`、`allowedActions` 和 `requiredScopes` 会在超出 scope 的调用离开你的机器之前就将其拒绝。

## 💳 付费调用如何运作

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

对外公开的步骤（发帖、发布）遵循同样的流程，只是使用 `needs_permission` 和 `permission_token`。具有破坏性的步骤会以 `confirm_required` 拒绝，除非你传入 `confirm: true`。

## 🧭 Studio、Team 与 Open API 的区别

### 🟣 Studio

- 你的 Studio 账号：素材库、图片、视频、分镜、编辑器、成品、社交帖子
- Scope 有 `read`、`edit`、`spend`、`publish`；新建密钥默认为 `read` + `edit` + `spend`
- 分镜优先：每一支视频都从你批准过的分镜开始
- 22 个工具 · 329 个 action

### 🟢 Team

- 你的 AI 团队：队友、小组、蓝图、技能、部署、进化
- Scope 有 `read`、`edit`、`spend`；新建密钥默认为 `read` + `edit`
- 凡是花费、删除、套用草稿或开启高风险工具，一律先询问你
- `client_ref` 让创建类调用可以安全重试；草稿带有 `rev`
- 6 个工具 · 70 个 action

### 🟠 Open API

- 模型目录、报价、任务提交、余额
- 没有 scope；密钥带有月度上限
- 先报价，再生成，然后轮询 `job_status`
- 5 个工具

## 📦 功能特性

- **自动生成的封装** - 三种语言中每个 action 对应一个方法，scope 和标志写在文档注释里
- **本地 scope 预检** - 超出 scope 的调用会以 `scope_denied` 快速失败，根本不会发到网络上
- **审批辅助函数** - `callWithApproval` 会把每一份报价和权限请求交给你的审批者，绝不会自行批准
- **加固的传输层** - 仅限 HTTPS（`localhost` 除外），不跟随重定向，限制响应大小，密钥绝不打印或序列化
- **批处理与重试** - 每批最多 20 个调用；`rate_limited` 会按服务器返回的 `retry_after_sec` 重试，上限 30 秒
- **带类型的结果** - 数据、审批和错误统一用一个 `ToolResult` 表示，并附带服务器给出的 `next` 提示
- **Mock 服务器与扫描器** - `tools/` 中提供离线 mock、权限扫描器、代码生成器和泄漏扫描器
- **自动生成的参考文档** - 每个工具、action、scope 和标志都收录在 [docs/reference](docs/reference/)

## 🔌 连接 AI 应用

无需写代码。把应用指向服务器 URL，然后登录即可。

| 宿主 | 方式 |
|----------|----------|
| **Claude**（网页、桌面、移动端） | Settings → Connectors → Add custom connector → 粘贴 URL → 登录 |
| **ChatGPT** | Settings → Apps & Connectors → Developer mode → Create → URL + OAuth |
| **VS Code** | [`samples/hosts/vscode/mcp.json`](samples/hosts/vscode/mcp.json)（运行时提示输入密钥，绝不存入文件） |
| **Claude Code** | [`samples/hosts/claude-code/.mcp.json`](samples/hosts/claude-code/.mcp.json)（密钥取自 `${ALGOHASH_STUDIO_KEY}`） |
| **OpenAI Codex** | [`samples/hosts/codex/config.toml`](samples/hosts/codex/config.toml)（`bearer_token_env_var`） |

各宿主的分步指南：[docs/hosts.md](docs/hosts.md)。

## 💻 SDK 用法

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

### 示例提示词

服务器连接到你的 AI 应用后，直接开口问就行：

```
给我看看我 Studio 素材库里的角色。
为一个咖啡品牌规划一段 20 秒的分镜，先把报价给我看，再开始绘制。
根据这份简报组建一个三人研究团队，先让我审阅草稿。
在 Open API 上生成一张 1K 图片大概要多少钱？
```

### 示例代码

```bash
node tools/mock-server.mjs                                    # terminal 1: 127.0.0.1:8787
```

```bash
ALGOHASH_MOCK=1 node samples/typescript/03-generate-image.mjs # terminal 2
```

| 示例 | TypeScript | Python | Go |
|----------|----------|----------|----------|
| **这个密钥能做什么？** | `01-permissions.mjs` | `01_permissions.py` | `cmd/permissions` |
| **浏览素材库** | `02-library.mjs` | `02_library.py` | |
| **生成图片（付费）** | `03-generate-image.mjs` | `03_generate_image.py` | `cmd/generate-image` |
| **先分镜，再成片** | `04-storyboard-video.mjs` | `04_storyboard_video.py` | |
| **Team：部署任务** | `05-team-deploy.mjs` | `05_team_deploy.py` | `cmd/team-deploy` |
| **Open API：报价 → 生成** | `06-open-quote.mjs` | `06_open_quote.py` | `cmd/open-quote` |
| **为你自己的 Agent 提供工具** | `07-agent-context.mjs` | | |

在任何付费或对外公开的步骤之前，示例都会在终端里询问你。没有终端时，则一律拒绝。

## 📚 文档

| 主题 | 你将学到什么 |
|----------|----------|
| [概览](docs/overview.md) | 服务器、工具与 action、HWT、结果、`next` 提示 |
| [认证](docs/authentication.md) | 静态密钥、OAuth 2.1、轮换、存储 |
| [权限](docs/permissions.md) | Scope、最小权限、扫描密钥 · [完整矩阵](docs/reference/permissions.md) |
| [审批](docs/approvals.md) | `needs_confirmation`、`needs_permission`、`needs_storyboard`、`needs_cast` |
| [协议](docs/protocol.md) | 传输、版本、批处理、结果结构 |
| [错误与限制](docs/errors.md) | 所有错误码，哪些可以重试，哪些绝不能重试 |
| [安全](docs/security.md) | 面向集成方的威胁模型：密钥、提示词注入、花费控制 |
| [连接 MCP 宿主](docs/hosts.md) | Claude、ChatGPT、VS Code、Claude Code、Codex，以及任意客户端 |
| **指南** | [Studio](docs/guides/studio.md) · [Team](docs/guides/team.md) · [Open API](docs/guides/open.md) |
| **SDK** | [TypeScript](docs/sdk-typescript.md) · [Python](docs/sdk-python.md) · [Go](docs/sdk-go.md) |
| **参考** | [Studio](docs/reference/studio.md) · [Team](docs/reference/team.md) · [Open API](docs/reference/open.md)（自动生成） |

## 🔐 安全

**你批准之前不会扣费。** 付费或对外公开的步骤会先返回报价，在卡片上点一下**批准**就会执行（没有卡片的 host：在聊天里回“好”）。需要更严格的密钥，可以开启**只有我本人可以批准付费与高风险步骤**：这些步骤会改为返回 `approve_url`，只有你登录 AlgoHash 后才能批准，在聊天里敲一句“好”也不算数。

- **最小权限** - 只给每个集成它所需的最少 scope。`spend` 和 `publish` 是各自独立的授权，而且 `spend` 并不包含 `edit`
- **硬性限制** - scope、每日上限（MCP 密钥）或每月上限（Open API 密钥），以及吊销，即使 Agent 遭到提示词注入也依然有效
- **密钥保持机密** - 只通过 HTTPS 放在 `Authorization` 请求头中发送，绝不打印，绝不随重定向转发

> 一键批准时，被 prompt injection 的 Agent 有可能自己批准步骤。只要 Agent 会读到你无法控制的内容，就为它的密钥开启**只有我本人可以批准付费与高风险步骤**。
> 未开启时，审批只能防止失误，防不了被攻陷的 Agent。请先阅读 [docs/security.md](docs/security.md)。

发现漏洞？请按 [SECURITY.md](SECURITY.md) 的说明私下报告。

## 🤝 参与贡献

欢迎参与贡献。本仓库**只包含接口**：工具、参数、scope、审批协议和错误码。这里没有任何服务器代码，一切以服务器为准。

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

提交 Pull Request 之前，请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。CI 会运行同样的步骤，并针对 mock 服务器运行每一个示例。

## 🛠 故障排查

### `scope_denied`

密钥缺少该 action 所需的 scope。用 `node tools/permissions.mjs studio <your scopes>` 检查，
然后到 Studio → MCP → Keys（或 Team → MCP → Keys & scopes）添加该 scope。请勿原样重试。

### `needs_confirmation` / `needs_permission`

这不是错误。把价格和摘要展示给用户（支持卡片的 host 会直接显示卡片）。用户批准后（点一下，或在聊天里回“好”；页面批准的密钥要在 `approve_url` 页面批准），带上令牌重复
**完全相同的调用**。令牌只能使用一次，与参数绑定，约 5 分钟后过期。改了参数？那就需要重新询问。

### `awaiting_approval`

仅限页面批准的密钥：你在所有者于 AlgoHash 批准之前就重试了。没有执行任何操作，也没有扣费。用
`studio_confirm.wait`（或 `team_confirm.wait`）等待，然后带上同一个令牌重试。

### `insecure_endpoint` / `bad_endpoint`

SDK 会拒绝 `http://`（`localhost` 除外）以及包含凭据的 URL。请使用 `https://`
端点，并且绝不要从不可信的输入中获取端点。

### `rate_limited`

等待 `retry_after_sec` 秒。SDK 会自动重试，上限为 30 秒。

### `stale_rev` (Team)

有人修改了草稿。调用 `team_blueprint.get` 获取最新的 `rev`，然后带着它重试。

### 密钥泄露了

立即在应用中吊销它，下一次请求起就会失效。然后检查你的账号活动记录。

## 💬 社区与支持

- **问题与 Bug** - 在本仓库提交 issue
- **安全报告** - 切勿公开提交；请遵循 [SECURITY.md](SECURITY.md)
- **更新内容** - [CHANGELOG.md](CHANGELOG.md)
- **兼容** - Claude（网页、桌面、移动端）· ChatGPT · VS Code（GitHub Copilot Chat）· Claude Code · OpenAI Codex · 任何支持 Streamable HTTP 的 MCP 客户端

---

## 📄 许可证

基于 [MIT License](LICENSE) 发布。版权所有 © 2026 AlgoHash Inc.

<p align="center">
  <a href="https://console.algohash.ai"><img src="assets/algohash-icon.png" alt="AlgoHash" width="40" height="40"></a><br>
  <sub>由 <a href="https://console.algohash.ai">AlgoHash</a> 打造 · 如果这个 SDK 对你有帮助，欢迎给仓库点个 ⭐</sub>
</p>
