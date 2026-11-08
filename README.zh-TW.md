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
  <img src="https://img.shields.io/badge/MCP_tools-33-purple?style=for-the-badge" alt="33 個 MCP 工具">
  <img src="https://img.shields.io/badge/actions-399-green?style=for-the-badge" alt="399 個 action">
  <img src="https://img.shields.io/badge/runtime_deps-0-brightgreen?style=for-the-badge" alt="零執行期相依套件">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT 授權"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Node_18+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/MCP-2024--11--05_→_2025--11--25-6E56CF?style=flat-square" alt="MCP 協定版本">
</p>

<p align="center">
  <b>用任何語言、任何 agent、任何 AI app，在 AlgoHash 上打造你的產品。</b>
</p>

<p align="center">
  AlgoHash <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server 的官方開源 SDK。<br>
  生成圖片與影片、跑分鏡、管理你的 AI 團隊、呼叫 Open API，<br>
  提供 <b>TypeScript</b>、<b>Python</b>、<b>Go</b> 型別化 client，全部由同一份開放規格產生。
</p>

<p align="center">
  <a href="https://console.algohash.ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg">
      <img src="assets/hero.svg" alt="AlgoHash MCP SDK：用 TypeScript、Python、Go 同一套型別化 client 操作 Studio、Team、Open API 三個 MCP server" width="800">
    </picture>
  </a>
</p>

<p align="center">
  <a href="#-快速開始"><b>快速開始</b></a> ·
  <a href="docs/overview.md"><b>文件</b></a> ·
  <a href="docs/reference/"><b>工具參考</b></a> ·
  <a href="samples/"><b>範例</b></a> ·
  <a href="docs/security.md"><b>安全</b></a> ·
  <a href="CHANGELOG.md"><b>更新紀錄</b></a>
</p>

---

## ✨ 為什麼選 AlgoHash MCP SDK

- **🔗 一套 SDK，三個 server** - Studio、Team、Open API 共用同一種 client、同一種結果型別、同一套錯誤模型
- **🛡️ 預設就安全** - Studio 和 Team 的付費與公開步驟，要等你在 AlgoHash 上親自批准；agent 無法批准自己的花費
- **🧬 型別化、自動產生** - 399 個 action 全部直接由開放規格包裝並產生文件，SDK 永遠不會和 server 脫節
- **🪶 零相依套件** - 只用平台內建的 `fetch`、`urllib`、`net/http`；沒有額外的東西要稽核、鎖版本或打補丁
- **🧪 沒有 key 也能試** - 本機 mock server 讓每個範例和測試都能跑，不用帳戶、不花一毛錢

## 🚀 快速開始

### 1. 安裝

```bash
npm install @algohash/mcp                                  # TypeScript / JavaScript
pip install algohash-mcp                                   # Python
go get github.com/Algohash-inc/algohash-mcp-sdk/sdks/go      # Go
```

### 2. 取得 key

到 **Studio → MCP → Keys**（或 **Team → MCP → Keys & scopes**，或 Open API key 頁面）建立一把 key，
存在環境變數裡。絕對不要寫死在程式碼中。

```bash
export ALGOHASH_STUDIO_KEY="smk_..."
```

### 3. 送出第一個呼叫

```ts
import { StudioClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY!, keyScopes: ["read", "edit"] });
const assets = await studio.core.listAssets({ pillar: "avatars" });
console.log(assets.status, assets.data);
```

還沒有 key？執行 `node tools/mock-server.mjs`，再設定 `ALGOHASH_MOCK=1`。每個範例都能離線跑。

## 🧩 你可以做出什麼

| Server | Endpoint | 可以打造的東西 | Key |
|----------|----------|----------|----------|
| **🎬 Studio** | `https://console.algohash.ai/mcp/studio` | 把一段簡介變成分鏡、再變成完整影片的 agent · 素材庫瀏覽器 · 排程社群發佈工具 | `smk_…` 或 OAuth |
| **🤝 Team** | `https://console.algohash.ai/mcp/team` | 依簡介起草隊友的團隊建構器 · 把工作派給群組的派工機器人 · 進化迴圈 | `tmk_…` 或 OAuth |
| **⚡ Open API** | `https://console.algohash.ai/open/v1/mcp` | 價格試算元件 · 附報價的批次生成器 · 餘額監控 | Open API key |

每把 key 只綁定**一個帳戶：你的帳戶**。任何參數都碰不到別的帳戶，不管 client 怎麼做，server 都會強制執行。

## 🔍 看清楚 key 能做什麼

規格裡每個 action 都標明了需要的 scope。把 key 交給 agent 之前，先掃描一次：

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

每個 client 都內建同樣的檢查：`canCall`、`allowedActions`、`requiredScopes` 會在請求離開你的電腦之前，就擋下超出 scope 的呼叫。

## 💳 付費呼叫怎麼運作

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

公開步驟（發文、發佈）走同樣的流程，只是換成 `needs_permission` 和 `permission_token`。破壞性步驟沒帶
`confirm: true` 會被拒絕，回傳 `confirm_required`。

## 🧭 Studio vs. Team vs. Open API

### 🟣 Studio

- 你的 Studio 帳戶：素材庫、圖片、影片、分鏡、剪輯台、成品、社群貼文
- Scope：`read`、`edit`、`spend`、`publish`；新 key 預設 `read` + `edit` + `spend`
- 分鏡優先：每支影片都從你批准過的分鏡開始
- 22 個工具 · 329 個 action

### 🟢 Team

- 你的 AI 團隊：隊友、群組、藍圖、技能、派工、進化
- Scope：`read`、`edit`、`spend`；新 key 預設 `read` + `edit`
- 花錢、刪除、套用草稿、開啟高風險工具之前，一定先問
- `client_ref` 讓建立類呼叫可以安全重試；草稿帶有 `rev`
- 6 個工具 · 70 個 action

### 🟠 Open API

- 模型目錄、報價、提交工作、餘額
- 沒有 scope；key 有每月上限
- 先報價，再生成，再輪詢 `job_status`
- 5 個工具

## 📦 功能

- **自動產生的包裝函式** - 三種語言都是一個 action 對一個 method，scope 和旗標寫在文件註解裡
- **本機 scope 預檢** - 超出 scope 的呼叫立刻以 `scope_denied` 失敗，完全不碰網路
- **批核輔助函式** - `callWithApproval` 把每個報價和權限請求交給你的 approver，永遠不會自己批准
- **強化傳輸** - 只走 HTTPS（`localhost` 除外）、不跟隨重新導向、限制回應大小、key 永不印出或序列化
- **批次與重試** - 每批最多 20 個呼叫；`rate_limited` 依 server 的 `retry_after_sec` 自動重試，最多等 30 秒
- **型別化結果** - 資料、批核、錯誤都用同一個 `ToolResult`，另附 server 給的 `next` 提示
- **Mock server 與掃描工具** - 離線 mock、權限掃描、程式碼產生器、外洩掃描都在 `tools/`
- **自動產生的參考文件** - 每個工具、action、scope、旗標都在 [docs/reference](docs/reference/)

## 🔌 連接 AI app

不用寫程式。把 app 指向 server URL，登入就好。

| Host | 做法 |
|----------|----------|
| **Claude**（網頁、桌面、手機） | Settings → Connectors → Add custom connector → 貼上 URL → 登入 |
| **ChatGPT** | Settings → Apps & Connectors → Developer mode → Create → URL + OAuth |
| **VS Code** | [`samples/hosts/vscode/mcp.json`](samples/hosts/vscode/mcp.json)（執行時詢問 key，不寫進檔案） |
| **Claude Code** | [`samples/hosts/claude-code/.mcp.json`](samples/hosts/claude-code/.mcp.json)（key 取自 `${ALGOHASH_STUDIO_KEY}`） |
| **OpenAI Codex** | [`samples/hosts/codex/config.toml`](samples/hosts/codex/config.toml)（`bearer_token_env_var`） |

每個 host 的逐步教學：[docs/hosts.md](docs/hosts.md)。

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

### 提示範例

把 server 接上你的 AI app 之後，直接說：

```
列出我 Studio 素材庫裡的角色。
幫一個咖啡品牌規劃 20 秒的分鏡，畫之前先給我看報價。
依照這份簡介建一個三人研究團隊，讓我先看過草稿。
在 Open API 生成一張 1K 圖片要多少錢？
```

### 範例

```bash
node tools/mock-server.mjs                                    # terminal 1: 127.0.0.1:8787
```

```bash
ALGOHASH_MOCK=1 node samples/typescript/03-generate-image.mjs # terminal 2
```

| 範例 | TypeScript | Python | Go |
|----------|----------|----------|----------|
| **這把 key 能做什麼？** | `01-permissions.mjs` | `01_permissions.py` | `cmd/permissions` |
| **瀏覽素材庫** | `02-library.mjs` | `02_library.py` | |
| **生成圖片（付費）** | `03-generate-image.mjs` | `03_generate_image.py` | `cmd/generate-image` |
| **先分鏡，再出片** | `04-storyboard-video.mjs` | `04_storyboard_video.py` | |
| **Team：派工** | `05-team-deploy.mjs` | `05_team_deploy.py` | `cmd/team-deploy` |
| **Open API：報價 → 生成** | `06-open-quote.mjs` | `06_open_quote.py` | `cmd/open-quote` |
| **給你自己的 agent 用的工具** | `07-agent-context.mjs` | | |

任何付費或公開步驟之前，範例都會在終端機問你。沒有終端機時一律拒絕。

## 📚 文件

| 主題 | 你會學到 |
|----------|----------|
| [總覽](docs/overview.md) | Server、工具與 action、HWT、結果、`next` 提示 |
| [驗證](docs/authentication.md) | 靜態 key、OAuth 2.1、輪替、保存 |
| [權限](docs/permissions.md) | Scope、最小權限、掃描 key · [完整對照表](docs/reference/permissions.md) |
| [批核](docs/approvals.md) | `needs_confirmation`、`needs_permission`、`needs_storyboard`、`needs_cast` |
| [協定](docs/protocol.md) | 傳輸、版本、批次、結果格式 |
| [錯誤與限制](docs/errors.md) | 每個錯誤碼、哪些可以重試、哪些絕不重試 |
| [安全](docs/security.md) | 整合者的威脅模型：key、prompt injection、花費控制 |
| [連接 MCP host](docs/hosts.md) | Claude、ChatGPT、VS Code、Claude Code、Codex、任何 client |
| **指南** | [Studio](docs/guides/studio.md) · [Team](docs/guides/team.md) · [Open API](docs/guides/open.md) |
| **SDK** | [TypeScript](docs/sdk-typescript.md) · [Python](docs/sdk-python.md) · [Go](docs/sdk-go.md) |
| **參考** | [Studio](docs/reference/studio.md) · [Team](docs/reference/team.md) · [Open API](docs/reference/open.md)（自動產生） |

## 🔐 安全

**你批准之前不會扣費。** 付費或公開步驟會先回傳報價，在卡片上按一下**批准**就會執行（沒有卡片的 host：在對話裡回「好」）。
需要更嚴格的 key，可以開啟 **只有我本人可以批准付費與高風險步驟**：這些步驟會改為回傳 `approve_url`，只有你登入 AlgoHash 才能批准，在對話裡打「好」也不算。

- **最小權限** - 每個整合只給它需要的最少 scope。`spend` 和 `publish` 分開授權，`spend` 不包含 `edit`
- **硬性上限** - scope、每日上限（MCP key）或每月上限（Open API key）、撤銷 key，即使 agent 被 prompt injection 也照樣有效
- **Key 不外流** - 只放在 HTTPS 的 `Authorization` header，永不印出，也不會跟著重新導向送出

> 一鍵批准時，被 prompt injection 的 agent 有可能自己批准步驟。只要 agent 會讀到你無法控制的內容，就為它的 key 開啟 **只有我本人可以批准付費與高風險步驟**。
> 沒開啟時，批核只能防止失誤，擋不住被入侵的 agent。請先讀 [docs/security.md](docs/security.md)。

發現漏洞？請依 [SECURITY.md](SECURITY.md) 私下回報。

## 🤝 參與貢獻

歡迎貢獻。這個 repository **只有介面**：工具、參數、scope、批核協定和錯誤碼。裡面沒有任何 server
程式碼，一切以 server 為準。

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

開 pull request 之前請先讀 [CONTRIBUTING.md](CONTRIBUTING.md)。CI 會跑同樣的步驟，並對 mock server 跑每個範例。

## 🛠 疑難排解

### `scope_denied`

Key 缺少這個 action 需要的 scope。用 `node tools/permissions.mjs studio <你的 scopes>` 檢查，再到
Studio → MCP → Keys（或 Team → MCP → Keys & scopes）加上 scope。不要原封不動重試。

### `needs_confirmation` / `needs_permission`

這些不是錯誤。把價格和摘要給使用者看（支援卡片的 host 會直接顯示卡片）。對方批准之後（按一下，或在對話裡回「好」；頁面批准的 key 要在 `approve_url` 頁批准），帶著 token 重送**完全相同的呼叫**。
Token 只能用一次、綁定參數，大約 5 分鐘後失效。改了參數？就要重新問。

### `awaiting_approval`

只限頁面批准的 key：你在擁有者於 AlgoHash 批准之前就重試了。什麼都沒執行，也沒扣費。用 `studio_confirm.wait`（或 `team_confirm.wait`）
等待，再帶同一個 token 重試。

### `insecure_endpoint` / `bad_endpoint`

SDK 拒絕 `http://`（`localhost` 除外）和含帳密的 URL。請用 `https://` endpoint。絕對不要從不受信任的輸入取得 endpoint。

### `rate_limited`

等 `retry_after_sec` 秒。SDK 會自動重試，最多等 30 秒。

### `stale_rev`（Team）

有人改過草稿。呼叫 `team_blueprint.get` 取得最新 `rev`，再帶著它重試。

### Key 外洩了

立刻在 app 裡撤銷。下一個請求起就失效。然後檢查帳戶的活動紀錄。

## 💬 社群與支援

- **問題與 bug** - 在這個 repository 開 issue
- **安全回報** - 絕不公開；請依 [SECURITY.md](SECURITY.md)
- **更新內容** - [CHANGELOG.md](CHANGELOG.md)
- **相容的 host** - Claude（網頁、桌面、手機）· ChatGPT · VS Code（GitHub Copilot Chat）· Claude Code · OpenAI Codex · 任何支援 Streamable HTTP 的 MCP client

---

## 📄 授權

以 [MIT 授權](LICENSE) 釋出。Copyright © 2026 AlgoHash Inc.

<p align="center">
  <a href="https://console.algohash.ai"><img src="assets/algohash-icon.png" alt="AlgoHash" width="40" height="40"></a><br>
  <sub>由 <a href="https://console.algohash.ai">AlgoHash</a> 打造 · 如果這個 SDK 對你有幫助，請幫 repository 點一顆 ⭐</sub>
</p>
