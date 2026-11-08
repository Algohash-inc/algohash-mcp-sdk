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
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge" alt="버전 0.1.0">
  <img src="https://img.shields.io/badge/MCP_tools-33-purple?style=for-the-badge" alt="MCP 도구 33개">
  <img src="https://img.shields.io/badge/actions-399-green?style=for-the-badge" alt="액션 399개">
  <img src="https://img.shields.io/badge/runtime_deps-0-brightgreen?style=for-the-badge" alt="런타임 의존성 없음">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT 라이선스"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Node_18+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/MCP-2024--11--05_→_2025--11--25-6E56CF?style=flat-square" alt="MCP 프로토콜 버전">
</p>

<p align="center">
  <b>어떤 언어로든, 어떤 에이전트로든, 어떤 AI 앱에서든 AlgoHash 위에 만들어 보세요.</b>
</p>

<p align="center">
  AlgoHash <a href="https://modelcontextprotocol.io">Model Context Protocol</a> 서버를 위한 공식 오픈 소스 SDK입니다.<br>
  이미지와 영상을 생성하고, 스토리보드를 진행하고, AI 팀을 관리하고, Open API를 호출할 수 있습니다.<br>
  <b>TypeScript</b>, <b>Python</b>, <b>Go</b>용 타입 클라이언트를 모두 하나의 공개 스펙에서 생성했습니다.
</p>

<p align="center">
  <a href="https://console.algohash.ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg">
      <img src="assets/hero.svg" alt="AlgoHash MCP SDK: TypeScript, Python, Go로 Studio, Team, Open API MCP 서버에 연결하는 하나의 타입 클라이언트" width="800">
    </picture>
  </a>
</p>

<p align="center">
  <a href="#-빠른-시작"><b>빠른 시작</b></a> ·
  <a href="docs/overview.md"><b>문서</b></a> ·
  <a href="docs/reference/"><b>도구 레퍼런스</b></a> ·
  <a href="samples/"><b>샘플</b></a> ·
  <a href="docs/security.md"><b>보안</b></a> ·
  <a href="CHANGELOG.md"><b>변경 내역</b></a>
</p>

---

## ✨ AlgoHash MCP SDK를 선택하는 이유

- **🔗 하나의 SDK, 세 개의 서버** - Studio, Team, Open API가 같은 클라이언트 형태, 같은 결과 타입, 같은 오류 모델을 공유합니다
- **🛡️ 기본값이 안전합니다** - 유료 단계와 공개 단계의 Studio, Team 작업은 AlgoHash에서 직접 승인해야 실행됩니다. 에이전트가 자신의 지출을 스스로 승인할 수는 없습니다
- **🧬 타입 지원, 자동 생성** - 399개 액션을 공개 스펙에서 곧바로 래핑하고 문서화했기 때문에 SDK가 서버와 어긋나지 않습니다
- **🪶 의존성 제로** - 플랫폼 기본 `fetch`, `urllib`, `net/http`만 사용합니다. 따로 점검하거나 버전을 고정하거나 패치할 대상이 없습니다
- **🧪 키 없이 체험 가능** - 로컬 목(mock) 서버로 계정도 지출도 없이 모든 샘플과 테스트를 실행할 수 있습니다

## 🚀 빠른 시작

### 1. 설치

```bash
npm install @algohash/mcp                                  # TypeScript / JavaScript
pip install algohash-mcp                                   # Python
go get github.com/Algohash-inc/algohash-mcp-sdk/sdks/go      # Go
```

### 2. 키 발급받기

**Studio → MCP → Keys**(또는 **Team → MCP → Keys & scopes**, 혹은 Open API 키 페이지)에서 키를 만든 다음
환경 변수에 보관하세요. 코드에 직접 적지 마세요.

```bash
export ALGOHASH_STUDIO_KEY="smk_..."
```

### 3. 첫 번째 호출 해보기

```ts
import { StudioClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY!, keyScopes: ["read", "edit"] });
const assets = await studio.core.listAssets({ pillar: "avatars" });
console.log(assets.status, assets.data);
```

아직 키가 없나요? `node tools/mock-server.mjs`를 실행하고 `ALGOHASH_MOCK=1`을 설정하세요. 모든 샘플이 오프라인에서 동작합니다.

## 🧩 무엇을 만들 수 있나요

| 서버 | 엔드포인트 | 만들 수 있는 것 | 키 |
|----------|----------|----------|----------|
| **🎬 Studio** | `https://console.algohash.ai/mcp/studio` | 브리프를 스토리보드로, 다시 완성된 영상으로 만드는 에이전트 · 라이브러리 브라우저 · 예약 소셜 게시기 | `smk_…` 또는 OAuth |
| **🤝 Team** | `https://console.algohash.ai/mcp/team` | 브리프로 팀원 초안을 작성하는 팀 빌더 · 그룹에 작업을 배정하는 배포 봇 · 진화 루프 | `tmk_…` 또는 OAuth |
| **⚡ Open API** | `https://console.algohash.ai/open/v1/mcp` | 가격 위젯 · 견적을 포함한 일괄 생성기 · 잔액 모니터 | Open API 키 |

모든 키는 **하나의 계정, 바로 당신의 계정**에 묶여 있습니다. 어떤 인자를 넘겨도 다른 계정에 접근할 수 없으며, 클라이언트가 어떻게 동작하든 서버가 이를 강제합니다.

## 🔍 키로 할 수 있는 일 확인하기

스펙의 모든 액션에는 필요한 스코프가 선언되어 있습니다. 키를 에이전트에게 넘기기 전에 먼저 스캔해 보세요.

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

같은 검사가 모든 클라이언트에 내장되어 있습니다. `canCall`, `allowedActions`, `requiredScopes`가 스코프를 벗어난 호출을 사용자의 컴퓨터를 떠나기 전에 거부합니다.

## 💳 유료 호출의 동작 방식

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

공개 단계(게시, 퍼블리시)도 `needs_permission`과 `permission_token`을 사용해 같은 흐름으로 진행됩니다. 파괴적인 단계는 `confirm: true`를 전달하지 않으면 `confirm_required`로 거부됩니다.

## 🧭 Studio, Team, Open API 비교

### 🟣 Studio

- 내 Studio 계정: 라이브러리, 이미지, 영상, 스토리보드, 에디터, 결과물, 소셜 게시물
- 스코프는 `read`, `edit`, `spend`, `publish`이며, 새 키의 기본값은 `read` + `edit` + `spend`입니다
- 스토리보드 우선: 모든 영상은 사용자가 승인한 스토리보드에서 시작합니다
- 도구 22개 · 액션 329개

### 🟢 Team

- 내 AI 팀: 팀원, 그룹, 블루프린트, 스킬, 배포, 진화
- 스코프는 `read`, `edit`, `spend`이며, 새 키의 기본값은 `read` + `edit`입니다
- 지출, 삭제, 초안 적용, 위험한 도구 활성화 전에는 항상 먼저 물어봅니다
- `client_ref`로 생성 호출을 안전하게 재시도할 수 있으며, 초안에는 `rev`가 붙습니다
- 도구 6개 · 액션 70개

### 🟠 Open API

- 모델 카탈로그, 견적, 작업 제출, 잔액
- 스코프는 없으며, 키마다 월간 한도가 있습니다
- 먼저 견적을 받고, 생성한 다음, `job_status`를 폴링합니다
- 도구 5개

## 📦 기능

- **자동 생성된 래퍼** - 세 언어 모두 액션마다 메서드를 하나씩 제공하며, 스코프와 플래그가 문서 주석에 적혀 있습니다
- **로컬 스코프 사전 검사** - 스코프를 벗어난 호출은 `scope_denied`로 즉시 실패하며 네트워크에 도달하지 않습니다
- **승인 헬퍼** - `callWithApproval`은 모든 견적과 권한 요청을 사용자의 승인자에게 넘기며, 스스로 승인하지 않습니다
- **강화된 전송 계층** - HTTPS만 허용(`localhost` 제외), 리다이렉트 없음, 응답 크기 제한, 키는 출력도 직렬화도 되지 않습니다
- **배치와 재시도** - 배치당 최대 20개 호출, `rate_limited`는 서버가 알려 준 `retry_after_sec`만큼 기다려 재시도하며 최대 30초로 제한됩니다
- **타입이 있는 결과** - 데이터, 승인, 오류를 하나의 `ToolResult`로 표현하고, 서버가 보내는 `next` 힌트도 함께 제공합니다
- **목 서버와 스캐너** - 오프라인 목 서버, 권한 스캐너, 코드 생성기, 유출 스캐너가 `tools/`에 있습니다
- **자동 생성된 레퍼런스** - 모든 도구, 액션, 스코프, 플래그를 [docs/reference](docs/reference/)에서 확인할 수 있습니다

## 🔌 AI 앱 연결하기

코드가 필요 없습니다. 앱에 서버 URL을 지정하고 로그인하면 됩니다.

| 호스트 | 방법 |
|----------|----------|
| **Claude** (웹, 데스크톱, 모바일) | Settings → Connectors → Add custom connector → URL 붙여넣기 → 로그인 |
| **ChatGPT** | Settings → Apps & Connectors → Developer mode → Create → URL + OAuth |
| **VS Code** | [`samples/hosts/vscode/mcp.json`](samples/hosts/vscode/mcp.json) (키는 실행 시 입력받으며 파일에 저장되지 않음) |
| **Claude Code** | [`samples/hosts/claude-code/.mcp.json`](samples/hosts/claude-code/.mcp.json) (키는 `${ALGOHASH_STUDIO_KEY}`에서 읽음) |
| **OpenAI Codex** | [`samples/hosts/codex/config.toml`](samples/hosts/codex/config.toml) (`bearer_token_env_var`) |

모든 호스트의 단계별 가이드: [docs/hosts.md](docs/hosts.md).

## 💻 SDK 사용법

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

### 프롬프트 예시

서버를 AI 앱에 연결했다면 이렇게 말해 보세요.

```
내 Studio 라이브러리에 있는 캐릭터를 보여줘.
커피 브랜드용 20초 스토리보드를 기획하고, 그리기 전에 견적을 먼저 보여줘.
이 브리프로 3인 리서치 팀을 만들어 줘. 초안은 먼저 내가 검토할게.
Open API에서 1K 이미지 한 장을 생성하면 비용이 얼마나 들어?
```

### 샘플

```bash
node tools/mock-server.mjs                                    # terminal 1: 127.0.0.1:8787
```

```bash
ALGOHASH_MOCK=1 node samples/typescript/03-generate-image.mjs # terminal 2
```

| 샘플 | TypeScript | Python | Go |
|----------|----------|----------|----------|
| **이 키로 무엇을 할 수 있나요?** | `01-permissions.mjs` | `01_permissions.py` | `cmd/permissions` |
| **라이브러리 둘러보기** | `02-library.mjs` | `02_library.py` | |
| **이미지 생성하기 (유료)** | `03-generate-image.mjs` | `03_generate_image.py` | `cmd/generate-image` |
| **스토리보드에서 영상으로** | `04-storyboard-video.mjs` | `04_storyboard_video.py` | |
| **Team: 작업 배포하기** | `05-team-deploy.mjs` | `05_team_deploy.py` | `cmd/team-deploy` |
| **Open API: 견적 → 생성** | `06-open-quote.mjs` | `06_open_quote.py` | `cmd/open-quote` |
| **내 에이전트를 위한 도구** | `07-agent-context.mjs` | | |

샘플은 유료 단계나 공개 단계 전에 터미널에서 먼저 물어봅니다. 터미널이 없으면 거절합니다.

## 📚 문서

| 주제 | 배울 수 있는 내용 |
|----------|----------|
| [개요](docs/overview.md) | 서버, 도구와 액션, HWT, 결과, `next` 힌트 |
| [인증](docs/authentication.md) | 정적 키, OAuth 2.1, 교체, 보관 |
| [권한](docs/permissions.md) | 스코프, 최소 권한, 키 스캔 · [전체 매트릭스](docs/reference/permissions.md) |
| [승인](docs/approvals.md) | `needs_confirmation`, `needs_permission`, `needs_storyboard`, `needs_cast` |
| [프로토콜](docs/protocol.md) | 전송, 버전, 배치, 결과 형식 |
| [오류와 제한](docs/errors.md) | 모든 오류 코드, 재시도해도 되는 것과 절대 재시도하면 안 되는 것 |
| [보안](docs/security.md) | 통합 개발자를 위한 위협 모델: 키, 프롬프트 인젝션, 지출 통제 |
| [MCP 호스트 연결](docs/hosts.md) | Claude, ChatGPT, VS Code, Claude Code, Codex, 그 밖의 모든 클라이언트 |
| **가이드** | [Studio](docs/guides/studio.md) · [Team](docs/guides/team.md) · [Open API](docs/guides/open.md) |
| **SDK** | [TypeScript](docs/sdk-typescript.md) · [Python](docs/sdk-python.md) · [Go](docs/sdk-go.md) |
| **레퍼런스** | [Studio](docs/reference/studio.md) · [Team](docs/reference/team.md) · [Open API](docs/reference/open.md) (자동 생성) |

## 🔐 보안

**승인하기 전에는 요금이 부과되지 않습니다.** 유료 단계나 공개 단계는 먼저 견적을 반환하고, 카드에서 **승인**을 한 번 누르면 실행됩니다(카드를 표시하지 못하는 호스트에서는 채팅에서 "예"라고 답하면 됩니다). 더 엄격하게 관리할 키에는 **유료·고위험 단계는 나만 승인할 수 있음**을 켜세요. 그러면 해당 단계는 `approve_url`을 반환하고, AlgoHash에 로그인한 당신만 승인할 수 있으며, 채팅에 입력한 "예"는 승인으로 인정되지 않습니다.

- **최소 권한** - 각 통합에는 꼭 필요한 최소한의 스코프만 부여하세요. `spend`와 `publish`는 별개의 권한이며, `spend`는 `edit`을 포함하지 않습니다
- **강제 한도** - 스코프, 일일 한도(MCP 키) 또는 월간 한도(Open API 키), 그리고 폐기는 에이전트가 프롬프트 인젝션을 당해도 유지됩니다
- **키는 비밀로 유지** - HTTPS를 통해 `Authorization` 헤더로만 전송하고, 출력하지 않으며, 리다이렉트를 따라 전달하지도 않습니다

> 한 번 탭 승인에서는 프롬프트 인젝션을 당한 에이전트가 스스로 단계를 승인할 수 있습니다. 통제할 수 없는 콘텐츠를 읽는 에이전트의 키에는 **유료·고위험 단계는 나만 승인할 수 있음**을 켜세요.
> 꺼 두면 승인은 실수를 막아 줄 뿐, 탈취된 에이전트는 막지 못합니다. 먼저 [docs/security.md](docs/security.md)를 읽어 보세요.

취약점을 발견하셨나요? [SECURITY.md](SECURITY.md)에 안내된 대로 비공개로 제보해 주세요.

## 🤝 기여하기

기여를 환영합니다. 이 저장소는 **인터페이스만** 다룹니다. 도구, 인자, 스코프, 승인 프로토콜, 오류 코드입니다. 서버 코드는 들어 있지 않으며, 모든 것에 대해 서버가 기준입니다.

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

풀 리퀘스트를 열기 전에 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어 주세요. CI는 같은 단계를 실행하고, 모든 샘플을 목 서버를 대상으로 실행합니다.

## 🛠 문제 해결

### `scope_denied`

키에 해당 액션이 필요로 하는 스코프가 없습니다. `node tools/permissions.mjs studio <your scopes>`로 확인한 다음,
Studio → MCP → Keys(또는 Team → MCP → Keys & scopes)에서 스코프를 추가하세요. 그대로 다시 시도하지 마세요.

### `needs_confirmation` / `needs_permission`

오류가 아닙니다. 사용자에게 가격과 요약을 보여 주세요(카드를 지원하는 호스트는 카드를 바로 표시합니다). 사용자가 승인하면(한 번 탭, 또는 채팅에서 "예". 페이지 승인 키는 `approve_url` 페이지에서 승인) 토큰을 넣어
**완전히 동일한 호출**을 다시 보내세요. 토큰은 일회용이고, 인자에 묶여 있으며, 약 5분 뒤에 만료됩니다. 인자를 바꿨다면 다시 물어봐야 합니다.

### `awaiting_approval`

페이지 승인 키에만 해당: 소유자가 AlgoHash에서 승인하기 전에 재시도했습니다. 아무것도 실행되지 않았고 요금도 부과되지 않았습니다.
`studio_confirm.wait`(또는 `team_confirm.wait`)로 기다린 다음, 같은 토큰으로 다시 시도하세요.

### `insecure_endpoint` / `bad_endpoint`

SDK는 `http://`(`localhost` 제외)와 자격 증명이 포함된 URL을 거부합니다. `https://`
엔드포인트를 사용하세요. 신뢰할 수 없는 입력에서 엔드포인트를 가져오지 마세요.

### `rate_limited`

`retry_after_sec`초 동안 기다리세요. SDK가 자동으로 재시도하며 최대 30초로 제한됩니다.

### `stale_rev` (Team)

누군가 초안을 변경했습니다. `team_blueprint.get`을 호출해 최신 `rev`를 받은 다음, 그 값으로 다시 시도하세요.

### 키가 유출되었다면

앱에서 지금 바로 폐기하세요. 다음 요청부터 사용할 수 없게 됩니다. 그런 다음 계정 활동을 확인하세요.

## 💬 커뮤니티 및 지원

- **질문과 버그** - 이 저장소에 이슈를 열어 주세요
- **보안 제보** - 공개된 곳에는 올리지 말고 [SECURITY.md](SECURITY.md)를 따르세요
- **변경 사항** - [CHANGELOG.md](CHANGELOG.md)
- **호환 환경** - Claude (웹, 데스크톱, 모바일) · ChatGPT · VS Code (GitHub Copilot Chat) · Claude Code · OpenAI Codex · Streamable HTTP를 지원하는 모든 MCP 클라이언트

---

## 📄 라이선스

[MIT License](LICENSE)로 배포됩니다. Copyright © 2026 AlgoHash Inc.

<p align="center">
  <a href="https://console.algohash.ai"><img src="assets/algohash-icon.png" alt="AlgoHash" width="40" height="40"></a><br>
  <sub><a href="https://console.algohash.ai">AlgoHash</a>가 만들었습니다 · 이 SDK가 도움이 되었다면 저장소에 ⭐를 눌러 주세요</sub>
</p>
