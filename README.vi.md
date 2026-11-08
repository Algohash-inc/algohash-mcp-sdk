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
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge" alt="Phiên bản 0.1.0">
  <img src="https://img.shields.io/badge/MCP_tools-33-purple?style=for-the-badge" alt="33 công cụ MCP">
  <img src="https://img.shields.io/badge/actions-399-green?style=for-the-badge" alt="399 action">
  <img src="https://img.shields.io/badge/runtime_deps-0-brightgreen?style=for-the-badge" alt="Không có phụ thuộc runtime">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="Giấy phép MIT"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Node_18+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/MCP-2024--11--05_→_2025--11--25-6E56CF?style=flat-square" alt="Các phiên bản giao thức MCP">
</p>

<p align="center">
  <b>Xây dựng trên AlgoHash bằng mọi ngôn ngữ, mọi agent và mọi ứng dụng AI.</b>
</p>

<p align="center">
  SDK mã nguồn mở chính thức cho các máy chủ <a href="https://modelcontextprotocol.io">Model Context Protocol</a> của AlgoHash.<br>
  Tạo ảnh và video, chạy storyboard, quản lý đội AI của bạn và gọi Open API,<br>
  với các client có kiểu dữ liệu cho <b>TypeScript</b>, <b>Python</b> và <b>Go</b>, tất cả đều được sinh ra từ một đặc tả mở duy nhất.
</p>

<p align="center">
  <a href="https://console.algohash.ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg">
      <img src="assets/hero.svg" alt="AlgoHash MCP SDK: một client có kiểu dữ liệu duy nhất bằng TypeScript, Python và Go cho các máy chủ MCP Studio, Team và Open API" width="800">
    </picture>
  </a>
</p>

<p align="center">
  <a href="#-bắt-đầu-nhanh"><b>Bắt đầu nhanh</b></a> ·
  <a href="docs/overview.md"><b>Tài liệu</b></a> ·
  <a href="docs/reference/"><b>Tham chiếu công cụ</b></a> ·
  <a href="samples/"><b>Mẫu</b></a> ·
  <a href="docs/security.md"><b>Bảo mật</b></a> ·
  <a href="CHANGELOG.md"><b>Nhật ký thay đổi</b></a>
</p>

---

## ✨ Vì sao chọn AlgoHash MCP SDK

- **🔗 Một SDK, ba máy chủ** - Studio, Team và Open API dùng chung một dạng client, một kiểu kết quả và một mô hình lỗi
- **🛡️ An toàn theo mặc định** - các bước tốn phí và các bước công khai của Studio và Team chỉ chạy sau khi bạn duyệt trên AlgoHash; agent của bạn không thể tự duyệt khoản chi của chính nó
- **🧬 Có kiểu dữ liệu và được sinh tự động** - 399 action, mỗi action đều được bọc và ghi tài liệu trực tiếp từ đặc tả mở, nên SDK không bao giờ lệch so với máy chủ
- **🪶 Không phụ thuộc thư viện ngoài** - chỉ dùng `fetch`, `urllib` và `net/http` có sẵn của nền tảng; không có gì thêm để kiểm toán, ghim phiên bản hay vá lỗi
- **🧪 Dùng thử không cần khóa** - một máy chủ mock cục bộ chạy được mọi mẫu và bài kiểm thử mà không cần tài khoản, không tốn phí

## 🚀 Bắt đầu nhanh

### 1. Cài đặt

```bash
npm install @algohash/mcp                                  # TypeScript / JavaScript
pip install algohash-mcp                                   # Python
go get github.com/Algohash-inc/algohash-mcp-sdk/sdks/go      # Go
```

### 2. Lấy khóa

Tạo khóa trong **Studio → MCP → Keys** (hoặc **Team → MCP → Keys & scopes**, hoặc trang khóa Open API),
rồi lưu vào một biến môi trường. Tuyệt đối không viết cứng khóa vào mã.

```bash
export ALGOHASH_STUDIO_KEY="smk_..."
```

### 3. Thực hiện lời gọi đầu tiên

```ts
import { StudioClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY!, keyScopes: ["read", "edit"] });
const assets = await studio.core.listAssets({ pillar: "avatars" });
console.log(assets.status, assets.data);
```

Chưa có khóa? Hãy chạy `node tools/mock-server.mjs` và đặt `ALGOHASH_MOCK=1`. Mọi mẫu đều chạy được khi ngoại tuyến.

## 🧩 Bạn có thể xây dựng gì

| Máy chủ | Endpoint | Có thể xây dựng những thứ như | Khóa |
|----------|----------|----------|----------|
| **🎬 Studio** | `https://console.algohash.ai/mcp/studio` | Một agent biến bản brief thành storyboard rồi thành video hoàn chỉnh · một trình duyệt thư viện · một công cụ đăng mạng xã hội theo lịch | `smk_…` hoặc OAuth |
| **🤝 Team** | `https://console.algohash.ai/mcp/team` | Một công cụ dựng đội tự soạn đồng đội từ bản brief · một bot triển khai giao việc cho cả nhóm · một vòng lặp tiến hóa | `tmk_…` hoặc OAuth |
| **⚡ Open API** | `https://console.algohash.ai/open/v1/mcp` | Một widget báo giá · một trình tạo hàng loạt có báo giá · một công cụ theo dõi số dư | Khóa Open API |

Mỗi khóa gắn với **đúng một tài khoản: của bạn**. Không tham số nào có thể chạm tới tài khoản khác, và máy chủ
đảm bảo điều đó dù client làm gì đi nữa.

## 🔍 Xem một khóa làm được gì

Mỗi action trong đặc tả đều khai báo các scope mà nó cần. Hãy quét khóa trước khi giao cho agent:

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

Cơ chế kiểm tra này được tích hợp sẵn trong mọi client: `canCall`, `allowedActions` và `requiredScopes` sẽ từ chối
lời gọi vượt phạm vi ngay trước khi nó rời khỏi máy của bạn.

## 💳 Một lời gọi tốn phí hoạt động thế nào

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

Các bước công khai (đăng bài, xuất bản) đi theo cùng vòng lặp này với `needs_permission` và một
`permission_token`. Các bước có tính phá hủy bị từ chối với `confirm_required` trừ khi bạn truyền `confirm: true`.

## 🧭 Studio, Team và Open API

### 🟣 Studio

- Tài khoản Studio của bạn: thư viện, ảnh, video, storyboard, trình chỉnh sửa, kết quả đầu ra, bài đăng mạng xã hội
- Các scope `read`, `edit`, `spend`, `publish`; khóa mới mặc định có `read` + `edit` + `spend`
- Storyboard trước: mọi video đều bắt đầu từ một storyboard mà bạn đã duyệt
- 22 công cụ · 329 action

### 🟢 Team

- Đội AI của bạn: đồng đội, nhóm, blueprint, skill, triển khai, tiến hóa
- Các scope `read`, `edit`, `spend`; khóa mới mặc định có `read` + `edit`
- Luôn hỏi trước khi chi tiền, xóa, áp dụng bản nháp hoặc mở một công cụ rủi ro
- `client_ref` giúp các lời gọi tạo mới có thể thử lại an toàn; bản nháp mang theo một `rev`
- 6 công cụ · 70 action

### 🟠 Open API

- Danh mục model, báo giá, gửi tác vụ, số dư
- Không có scope; khóa có hạn mức hằng tháng
- Báo giá trước, sau đó tạo, rồi thăm dò `job_status`
- 5 công cụ

## 📦 Tính năng

- **Wrapper được sinh tự động** - mỗi action một phương thức ở cả ba ngôn ngữ, kèm scope và flag trong chú thích tài liệu
- **Kiểm tra scope cục bộ trước khi gửi** - lời gọi vượt phạm vi thất bại ngay với `scope_denied` và không bao giờ ra mạng
- **Trợ giúp duyệt yêu cầu** - `callWithApproval` chuyển mọi báo giá và yêu cầu cấp quyền cho người duyệt của bạn, và không bao giờ tự duyệt
- **Lớp truyền tải được gia cố** - chỉ HTTPS (trừ `localhost`), không chuyển hướng, giới hạn kích thước phản hồi, khóa không bao giờ bị in ra hay tuần tự hóa
- **Gửi theo lô và thử lại** - tối đa 20 lời gọi mỗi lô; `rate_limited` được thử lại theo `retry_after_sec` của máy chủ, tối đa 30 giây
- **Kết quả có kiểu dữ liệu** - một `ToolResult` duy nhất cho dữ liệu, yêu cầu duyệt và lỗi, kèm gợi ý `next` từ máy chủ
- **Máy chủ mock và bộ quét** - mock ngoại tuyến, bộ quét quyền, bộ sinh mã và bộ quét rò rỉ trong `tools/`
- **Tài liệu tham chiếu được sinh tự động** - mọi công cụ, action, scope và flag tại [docs/reference](docs/reference/)

## 🔌 Kết nối một ứng dụng AI

Không cần viết mã. Chỉ cần trỏ ứng dụng tới URL máy chủ rồi đăng nhập.

| Host | Cách làm |
|----------|----------|
| **Claude** (web, desktop, mobile) | Settings → Connectors → Add custom connector → dán URL → đăng nhập |
| **ChatGPT** | Settings → Apps & Connectors → Developer mode → Create → URL + OAuth |
| **VS Code** | [`samples/hosts/vscode/mcp.json`](samples/hosts/vscode/mcp.json) (khóa được hỏi khi dùng, không bao giờ lưu trong tệp) |
| **Claude Code** | [`samples/hosts/claude-code/.mcp.json`](samples/hosts/claude-code/.mcp.json) (khóa lấy từ `${ALGOHASH_STUDIO_KEY}`) |
| **OpenAI Codex** | [`samples/hosts/codex/config.toml`](samples/hosts/codex/config.toml) (`bearer_token_env_var`) |

Hướng dẫn từng bước cho mọi host: [docs/hosts.md](docs/hosts.md).

## 💻 Cách dùng SDK

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

### Prompt mẫu

Khi một máy chủ đã được kết nối với ứng dụng AI của bạn, chỉ cần hỏi:

```
Cho tôi xem các nhân vật trong thư viện Studio của tôi.
Lên kế hoạch storyboard 20 giây cho một thương hiệu cà phê, rồi cho tôi xem báo giá trước khi vẽ.
Dựng một đội nghiên cứu ba người từ bản brief này và để tôi xem bản nháp trước.
Một ảnh 1K trên Open API có giá bao nhiêu?
```

### Mẫu

```bash
node tools/mock-server.mjs                                    # terminal 1: 127.0.0.1:8787
```

```bash
ALGOHASH_MOCK=1 node samples/typescript/03-generate-image.mjs # terminal 2
```

| Mẫu | TypeScript | Python | Go |
|----------|----------|----------|----------|
| **Khóa này làm được gì?** | `01-permissions.mjs` | `01_permissions.py` | `cmd/permissions` |
| **Duyệt thư viện** | `02-library.mjs` | `02_library.py` | |
| **Tạo một ảnh (tốn phí)** | `03-generate-image.mjs` | `03_generate_image.py` | `cmd/generate-image` |
| **Storyboard rồi đến video** | `04-storyboard-video.mjs` | `04_storyboard_video.py` | |
| **Team: triển khai công việc** | `05-team-deploy.mjs` | `05_team_deploy.py` | `cmd/team-deploy` |
| **Open API: báo giá → tạo** | `06-open-quote.mjs` | `06_open_quote.py` | `cmd/open-quote` |
| **Công cụ cho agent của riêng bạn** | `07-agent-context.mjs` | | |

Các mẫu sẽ hỏi bạn ngay trong terminal trước mọi bước tốn phí hoặc công khai. Nếu không có terminal, chúng sẽ từ chối.

## 📚 Tài liệu

| Chủ đề | Bạn sẽ học được gì |
|----------|----------|
| [Overview](docs/overview.md) | Máy chủ, công cụ và action, HWT, kết quả, gợi ý `next` |
| [Authentication](docs/authentication.md) | Khóa tĩnh, OAuth 2.1, xoay vòng, lưu trữ |
| [Permissions](docs/permissions.md) | Scope, đặc quyền tối thiểu, quét một khóa · [ma trận đầy đủ](docs/reference/permissions.md) |
| [Approvals](docs/approvals.md) | `needs_confirmation`, `needs_permission`, `needs_storyboard`, `needs_cast` |
| [Protocol](docs/protocol.md) | Truyền tải, phiên bản, gửi theo lô, dạng kết quả |
| [Errors and limits](docs/errors.md) | Mọi mã lỗi, lỗi nào nên thử lại và lỗi nào tuyệt đối không |
| [Security](docs/security.md) | Mô hình mối đe dọa cho người tích hợp: khóa, prompt injection, kiểm soát chi tiêu |
| [Connecting MCP hosts](docs/hosts.md) | Claude, ChatGPT, VS Code, Claude Code, Codex, mọi client |
| **Hướng dẫn** | [Studio](docs/guides/studio.md) · [Team](docs/guides/team.md) · [Open API](docs/guides/open.md) |
| **SDK** | [TypeScript](docs/sdk-typescript.md) · [Python](docs/sdk-python.md) · [Go](docs/sdk-go.md) |
| **Tham chiếu** | [Studio](docs/reference/studio.md) · [Team](docs/reference/team.md) · [Open API](docs/reference/open.md) (được sinh tự động) |

## 🔐 Bảo mật

**Không bị tính phí cho đến khi bạn duyệt.** Một bước tốn phí hoặc công khai trước hết trả về một báo giá; chạm một lần vào **Duyệt**
trên thẻ là chạy (host không có thẻ: trả lời «đồng ý» trong khung chat). Với những khóa cần chặt chẽ hơn, hãy bật
**Chỉ tôi mới duyệt được các bước tốn phí và rủi ro**: các bước đó sẽ trả về một `approve_url`, chỉ bạn mới duyệt được
trên AlgoHash khi đã đăng nhập, và một lời «đồng ý» gõ trong khung chat không được tính.

- **Đặc quyền tối thiểu** - chỉ cấp cho mỗi tích hợp những scope ít nhất mà nó cần. `spend` và `publish` là hai quyền riêng biệt, và `spend` không bao hàm `edit`
- **Giới hạn cứng** - scope, hạn mức theo ngày (khóa MCP) hoặc theo tháng (khóa Open API) và việc thu hồi vẫn có hiệu lực ngay cả khi agent bị prompt injection
- **Khóa luôn được giữ bí mật** - chỉ gửi trong header `Authorization` qua HTTPS, không bao giờ in ra, không bao giờ đi theo một lần chuyển hướng

> Với duyệt một chạm, một agent bị prompt injection có thể tự duyệt một bước. Hãy bật **Chỉ tôi mới duyệt được các bước tốn phí và rủi ro** cho mọi khóa có agent đọc nội dung mà bạn không kiểm soát.
> Nếu không bật, việc duyệt chỉ giúp ngăn sai sót, chứ không chặn được một agent bị chiếm quyền. Hãy đọc [docs/security.md](docs/security.md) trước.

Phát hiện lỗ hổng bảo mật? Hãy báo riêng tư theo hướng dẫn trong [SECURITY.md](SECURITY.md).

## 🤝 Đóng góp

Chúng tôi hoan nghênh mọi đóng góp. Kho mã này **chỉ chứa phần giao diện**: công cụ, tham số, scope, giao thức
duyệt và mã lỗi. Nó không chứa mã máy chủ, và máy chủ là nơi có thẩm quyền quyết định mọi thứ.

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

Hãy đọc [CONTRIBUTING.md](CONTRIBUTING.md) trước khi mở pull request. CI chạy đúng các bước này và mọi
mẫu trên máy chủ mock.

## 🛠 Khắc phục sự cố

### `scope_denied`

Khóa thiếu một scope mà action cần. Kiểm tra bằng `node tools/permissions.mjs studio <các scope của bạn>`,
rồi thêm scope trong Studio → MCP → Keys (hoặc Team → MCP → Keys & scopes). Đừng thử lại khi chưa thay đổi gì.

### `needs_confirmation` / `needs_permission`

Đây không phải lỗi. Hãy hiển thị cho người dùng giá và phần tóm tắt (host có thẻ sẽ hiện thẻ). Khi họ duyệt
(một chạm, hoặc «đồng ý» trong chat; với khóa duyệt qua trang, trên trang `approve_url`), hãy lặp lại
**đúng lời gọi đó** kèm token. Token chỉ dùng một lần, gắn với các tham số và hết hạn sau khoảng
5 phút. Đã đổi một tham số? Hãy xin duyệt lại.

### `awaiting_approval`

Chỉ với khóa duyệt qua trang: bạn đã thử lại trước khi chủ sở hữu duyệt trên AlgoHash. Không có gì được chạy và không bị tính phí. Hãy chờ bằng
`studio_confirm.wait` (hoặc `team_confirm.wait`), rồi thử lại với cùng token.

### `insecure_endpoint` / `bad_endpoint`

SDK từ chối `http://` (trừ `localhost`) và các URL chứa thông tin xác thực. Hãy dùng endpoint
`https://`. Không bao giờ lấy endpoint từ đầu vào không đáng tin.

### `rate_limited`

Hãy chờ `retry_after_sec` giây. Các SDK tự động thử lại trường hợp này, tối đa 30 giây.

### `stale_rev` (Team)

Có người đã đổi bản nháp. Hãy gọi `team_blueprint.get` để lấy `rev` mới nhất, rồi thử lại với nó.

### Khóa bị lộ

Hãy thu hồi ngay trong ứng dụng. Khóa sẽ ngừng hoạt động từ yêu cầu tiếp theo. Sau đó hãy kiểm tra hoạt động tài khoản của bạn.

## 💬 Cộng đồng và hỗ trợ

- **Câu hỏi và lỗi** - mở một issue trên kho mã này
- **Báo cáo bảo mật** - không bao giờ đăng công khai; làm theo [SECURITY.md](SECURITY.md)
- **Có gì thay đổi** - [CHANGELOG.md](CHANGELOG.md)
- **Hoạt động với** - Claude (web, desktop, mobile) · ChatGPT · VS Code (GitHub Copilot Chat) · Claude Code · OpenAI Codex · mọi client MCP hỗ trợ Streamable HTTP

---

## 📄 Giấy phép

Phát hành theo [Giấy phép MIT](LICENSE). Bản quyền © 2026 AlgoHash Inc.

<p align="center">
  <a href="https://console.algohash.ai"><img src="assets/algohash-icon.png" alt="AlgoHash" width="40" height="40"></a><br>
  <sub>Được xây dựng bởi <a href="https://console.algohash.ai">AlgoHash</a> · Nếu SDK này giúp ích cho bạn, hãy tặng kho mã một ⭐</sub>
</p>
