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
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge" alt="バージョン 0.1.0">
  <img src="https://img.shields.io/badge/MCP_tools-33-purple?style=for-the-badge" alt="33 個の MCP ツール">
  <img src="https://img.shields.io/badge/actions-399-green?style=for-the-badge" alt="399 個のアクション">
  <img src="https://img.shields.io/badge/runtime_deps-0-brightgreen?style=for-the-badge" alt="ランタイム依存ゼロ">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT ライセンス"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Node_18+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/MCP-2024--11--05_→_2025--11--25-6E56CF?style=flat-square" alt="MCP プロトコルバージョン">
</p>

<p align="center">
  <b>どの言語からでも、どのエージェントからでも、どの AI アプリからでも、AlgoHash の上で開発できます。</b>
</p>

<p align="center">
  AlgoHash の <a href="https://modelcontextprotocol.io">Model Context Protocol</a> サーバー向け公式オープンソース SDK です。<br>
  画像や動画の生成、ストーリーボードの作成、AI チームの管理、Open API の呼び出しが行えます。<br>
  <b>TypeScript</b>、<b>Python</b>、<b>Go</b> 向けの型付きクライアントを、すべて 1 つのオープンな仕様から生成しています。
</p>

<p align="center">
  <a href="https://console.algohash.ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg">
      <img src="assets/hero.svg" alt="AlgoHash MCP SDK: TypeScript、Python、Go の 1 つの型付きクライアントで Studio、Team、Open API の MCP サーバーに接続" width="800">
    </picture>
  </a>
</p>

<p align="center">
  <a href="#-クイックスタート"><b>クイックスタート</b></a> ·
  <a href="docs/overview.md"><b>ドキュメント</b></a> ·
  <a href="docs/reference/"><b>ツールリファレンス</b></a> ·
  <a href="samples/"><b>サンプル</b></a> ·
  <a href="docs/security.md"><b>セキュリティ</b></a> ·
  <a href="CHANGELOG.md"><b>変更履歴</b></a>
</p>

---

## ✨ AlgoHash MCP SDK を選ぶ理由

- **🔗 1 つの SDK で 3 つのサーバー** - Studio、Team、Open API が、同じクライアントの形、同じ結果型、同じエラーモデルを共有します
- **🛡️ デフォルトで安全** - 有料または公開を伴う Studio と Team のステップは、AlgoHash 上であなたが承認するまで実行されません。エージェントが自分の支出を自分で承認することはできません
- **🧬 型付き・自動生成** - 399 個のアクションを、オープンな仕様からそのままラップしてドキュメント化しているため、SDK がサーバーとずれることはありません
- **🪶 依存ゼロ** - プラットフォーム標準の `fetch`、`urllib`、`net/http` だけを使用します。監査やバージョン固定、パッチ適用の対象が増えることはありません
- **🧪 キーなしで試せる** - ローカルのモックサーバーで、アカウントも支出もなしにすべてのサンプルとテストを実行できます

## 🚀 クイックスタート

### 1. インストール

```bash
npm install @algohash/mcp                                  # TypeScript / JavaScript
pip install algohash-mcp                                   # Python
go get github.com/Algohash-inc/algohash-mcp-sdk/sdks/go      # Go
```

### 2. キーを取得する

**Studio → MCP → Keys**（または **Team → MCP → Keys & scopes**、あるいは Open API のキーページ）でキーを作成し、
環境変数に保存します。コードに直接書き込まないでください。

```bash
export ALGOHASH_STUDIO_KEY="smk_..."
```

### 3. 最初の呼び出しを行う

```ts
import { StudioClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY!, keyScopes: ["read", "edit"] });
const assets = await studio.core.listAssets({ pillar: "avatars" });
console.log(assets.status, assets.data);
```

まだキーがない場合は、`node tools/mock-server.mjs` を実行して `ALGOHASH_MOCK=1` を設定してください。すべてのサンプルがオフラインで動作します。

## 🧩 作れるもの

| サーバー | エンドポイント | 作れるものの例 | キー |
|----------|----------|----------|----------|
| **🎬 Studio** | `https://console.algohash.ai/mcp/studio` | ブリーフからストーリーボードを作り、完成動画まで仕上げるエージェント · ライブラリブラウザ · スケジュール投稿に対応した SNS パブリッシャー | `smk_…` または OAuth |
| **🤝 Team** | `https://console.algohash.ai/mcp/team` | ブリーフからチームメイトの案を作成するチームビルダー · グループに作業を割り当てるデプロイボット · 進化ループ | `tmk_…` または OAuth |
| **⚡ Open API** | `https://console.algohash.ai/open/v1/mcp` | 料金ウィジェット · 見積もり付きのバッチジェネレーター · 残高モニター | Open API キー |

すべてのキーは**ひとつのアカウント、つまりあなたのアカウント**に紐づきます。どんな引数を渡しても他のアカウントには届きません。クライアントがどう動いても、サーバー側でそれを強制します。

## 🔍 キーでできることを確認する

仕様上のすべてのアクションには、必要なスコープが宣言されています。キーをエージェントに渡す前にスキャンしましょう。

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

同じチェックはすべてのクライアントに組み込まれています。`canCall`、`allowedActions`、`requiredScopes` が、スコープ外の呼び出しをお使いのマシンから送信される前に拒否します。

## 💳 有料呼び出しの仕組み

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

公開を伴うステップ（投稿や公開）も、`needs_permission` と `permission_token` を使って同じ流れで進みます。破壊的なステップは、`confirm: true` を渡さない限り `confirm_required` で拒否されます。

## 🧭 Studio・Team・Open API の違い

### 🟣 Studio

- あなたの Studio アカウント: ライブラリ、画像、動画、ストーリーボード、エディタ、出力、SNS 投稿
- スコープは `read`、`edit`、`spend`、`publish`。新しいキーのデフォルトは `read` + `edit` + `spend` です
- ストーリーボードが先: すべての動画は、あなたが承認したストーリーボードから始まります
- 22 ツール · 329 アクション

### 🟢 Team

- あなたの AI チーム: チームメイト、グループ、ブループリント、スキル、デプロイ、進化
- スコープは `read`、`edit`、`spend`。新しいキーのデフォルトは `read` + `edit` です
- 支出、削除、下書きの適用、リスクのあるツールの有効化の前には、必ず確認を求めます
- `client_ref` により、作成系の呼び出しを安全に再試行できます。下書きには `rev` が付きます
- 6 ツール · 70 アクション

### 🟠 Open API

- モデルカタログ、見積もり、ジョブの送信、残高
- スコープはありません。キーごとに月間上限があります
- まず見積もり、次に生成、そして `job_status` をポーリングします
- 5 ツール

## 📦 機能

- **自動生成されたラッパー** - 3 言語すべてで、アクションごとに 1 つのメソッドを提供し、スコープとフラグを ドキュメントコメントに記載しています
- **ローカルでのスコープ事前チェック** - スコープ外の呼び出しは `scope_denied` ですぐに失敗し、ネットワークには出ません
- **承認ヘルパー** - `callWithApproval` はすべての見積もりと権限リクエストをあなたの承認者に渡し、自分で承認することはありません
- **堅牢なトランスポート** - HTTPS のみ（`localhost` を除く）、リダイレクトなし、レスポンスサイズの上限あり、キーは出力もシリアライズもされません
- **バッチ処理とリトライ** - 1 バッチあたり最大 20 回の呼び出し。`rate_limited` はサーバーが返す `retry_after_sec` に従って再試行し、上限は 30 秒です
- **型付きの結果** - データ、承認、エラーを 1 つの `ToolResult` で表現し、サーバーからの `next` ヒントも付きます
- **モックサーバーとスキャナー** - オフラインのモック、権限スキャナー、コードジェネレーター、リークスキャナーを `tools/` に用意しています
- **自動生成されたリファレンス** - すべてのツール、アクション、スコープ、フラグを [docs/reference](docs/reference/) に収録しています

## 🔌 AI アプリに接続する

コードは不要です。アプリにサーバーの URL を指定して、サインインするだけです。

| ホスト | 手順 |
|----------|----------|
| **Claude**（Web、デスクトップ、モバイル） | Settings → Connectors → Add custom connector → URL を貼り付け → サインイン |
| **ChatGPT** | Settings → Apps & Connectors → Developer mode → Create → URL + OAuth |
| **VS Code** | [`samples/hosts/vscode/mcp.json`](samples/hosts/vscode/mcp.json)（キーは実行時に入力を求められ、ファイルには保存されません） |
| **Claude Code** | [`samples/hosts/claude-code/.mcp.json`](samples/hosts/claude-code/.mcp.json)（キーは `${ALGOHASH_STUDIO_KEY}` から取得） |
| **OpenAI Codex** | [`samples/hosts/codex/config.toml`](samples/hosts/codex/config.toml)（`bearer_token_env_var`） |

各ホストの手順書は [docs/hosts.md](docs/hosts.md) にあります。

## 💻 SDK の使い方

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

### プロンプト例

サーバーを AI アプリに接続したら、あとは話しかけるだけです。

```
Studio ライブラリにあるキャラクターを見せて。
コーヒーブランド向けの 20 秒のストーリーボードを企画して。描画の前に見積もりを見せてください。
このブリーフから 3 人のリサーチチームを作って。先に下書きを確認させて。
Open API で 1K 画像を生成すると、いくらかかる？
```

### サンプル

```bash
node tools/mock-server.mjs                                    # terminal 1: 127.0.0.1:8787
```

```bash
ALGOHASH_MOCK=1 node samples/typescript/03-generate-image.mjs # terminal 2
```

| サンプル | TypeScript | Python | Go |
|----------|----------|----------|----------|
| **このキーでできることは？** | `01-permissions.mjs` | `01_permissions.py` | `cmd/permissions` |
| **ライブラリを閲覧する** | `02-library.mjs` | `02_library.py` | |
| **画像を生成する（有料）** | `03-generate-image.mjs` | `03_generate_image.py` | `cmd/generate-image` |
| **ストーリーボードから動画へ** | `04-storyboard-video.mjs` | `04_storyboard_video.py` | |
| **Team: 作業をデプロイする** | `05-team-deploy.mjs` | `05_team_deploy.py` | `cmd/team-deploy` |
| **Open API: 見積もり → 生成** | `06-open-quote.mjs` | `06_open_quote.py` | `cmd/open-quote` |
| **自分のエージェント用のツール** | `07-agent-context.mjs` | | |

サンプルは、有料または公開を伴うステップの前に、ターミナルで確認を求めます。ターミナルがない場合は拒否します。

## 📚 ドキュメント

| トピック | 学べること |
|----------|----------|
| [概要](docs/overview.md) | サーバー、ツールとアクション、HWT、結果、`next` ヒント |
| [認証](docs/authentication.md) | 静的キー、OAuth 2.1、ローテーション、保管 |
| [権限](docs/permissions.md) | スコープ、最小権限、キーのスキャン · [全マトリクス](docs/reference/permissions.md) |
| [承認](docs/approvals.md) | `needs_confirmation`、`needs_permission`、`needs_storyboard`、`needs_cast` |
| [プロトコル](docs/protocol.md) | トランスポート、バージョン、バッチ処理、結果の形式 |
| [エラーと制限](docs/errors.md) | すべてのエラーコード、再試行してよいものと、決して再試行してはいけないもの |
| [セキュリティ](docs/security.md) | インテグレーター向けの脅威モデル: キー、プロンプトインジェクション、支出管理 |
| [MCP ホストへの接続](docs/hosts.md) | Claude、ChatGPT、VS Code、Claude Code、Codex、その他すべてのクライアント |
| **ガイド** | [Studio](docs/guides/studio.md) · [Team](docs/guides/team.md) · [Open API](docs/guides/open.md) |
| **SDK** | [TypeScript](docs/sdk-typescript.md) · [Python](docs/sdk-python.md) · [Go](docs/sdk-go.md) |
| **リファレンス** | [Studio](docs/reference/studio.md) · [Team](docs/reference/team.md) · [Open API](docs/reference/open.md)（自動生成） |

## 🔐 セキュリティ

**承認するまで課金されません。** 有料または公開を伴うステップは、まず見積もりを返します。カードの**承認**をワンタップするだけで実行されます（カードを表示できないホストでは、チャットで「はい」と答えます）。より厳しくしたいキーでは、**有料・高リスクのステップを承認できるのは自分だけ**をオンにしてください。そのステップは `approve_url` を返すようになり、AlgoHash にサインインしたあなただけが承認でき、チャットで入力した「はい」は承認として扱われません。

- **最小権限** - 各インテグレーションには、必要最小限のスコープだけを付与してください。`spend` と `publish` は別々の権限で、`spend` は `edit` を含みません
- **厳格な上限** - スコープ、1 日の上限（MCP キー）または月間の上限（Open API キー）、そして失効は、エージェントがプロンプトインジェクションを受けても有効です
- **キーは秘密のまま** - HTTPS 経由で `Authorization` ヘッダーにのみ載せて送信し、出力せず、リダイレクト先には決して送りません

> ワンタップ承認では、プロンプトインジェクションを受けたエージェントが自分でステップを承認できてしまう可能性があります。管理できないコンテンツを読むエージェントのキーでは、**有料・高リスクのステップを承認できるのは自分だけ**をオンにしてください。
> オフのままでは、承認はミスを防ぐだけで、乗っ取られたエージェントは防げません。まず [docs/security.md](docs/security.md) をお読みください。

脆弱性を見つけましたか? [SECURITY.md](SECURITY.md) の手順に従って、非公開で報告してください。

## 🤝 コントリビューション

コントリビューションを歓迎します。このリポジトリは**インターフェースのみ**を扱います。ツール、引数、スコープ、承認プロトコル、エラーコードです。サーバーのコードは含まれておらず、あらゆる点でサーバーが正となります。

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

プルリクエストを開く前に、[CONTRIBUTING.md](CONTRIBUTING.md) をお読みください。CI は同じ手順に加えて、モックサーバーに対してすべてのサンプルを実行します。

## 🛠 トラブルシューティング

### `scope_denied`

キーに、そのアクションに必要なスコープがありません。`node tools/permissions.mjs studio <your scopes>` で確認し、
Studio → MCP → Keys（または Team → MCP → Keys & scopes）でスコープを追加してください。そのまま再試行しないでください。

### `needs_confirmation` / `needs_permission`

エラーではありません。ユーザーに料金と概要を提示してください（カード対応のホストではカードが表示されます）。ユーザーが承認したら（ワンタップ、またはチャットで「はい」。ページ承認のキーでは `approve_url` のページで承認）、トークンを付けて
**まったく同じ呼び出し**を繰り返します。トークンは 1 回限りで、引数に紐づき、約 5 分で期限切れになります。引数を変更した場合は、もう一度確認を取ってください。

### `awaiting_approval`

ページ承認のキーのみ：オーナーが AlgoHash で承認する前に再試行しました。何も実行されず、課金もされていません。
`studio_confirm.wait`（または `team_confirm.wait`）で待機してから、同じトークンで再試行してください。

### `insecure_endpoint` / `bad_endpoint`

SDK は `http://`（`localhost` を除く）と、認証情報を含む URL を拒否します。`https://`
のエンドポイントを使用してください。信頼できない入力からエンドポイントを取得してはいけません。

### `rate_limited`

`retry_after_sec` 秒待ってください。SDK は自動的に再試行し、上限は 30 秒です。

### `stale_rev` (Team)

誰かが下書きを変更しました。`team_blueprint.get` で最新の `rev` を取得し、それを付けて再試行してください。

### キーが漏えいした場合

アプリですぐに失効させてください。次のリクエストから使えなくなります。そのあと、アカウントのアクティビティを確認してください。

## 💬 コミュニティとサポート

- **質問とバグ報告** - このリポジトリで issue を作成してください
- **セキュリティ報告** - 公開の場では行わず、[SECURITY.md](SECURITY.md) に従ってください
- **更新内容** - [CHANGELOG.md](CHANGELOG.md)
- **対応環境** - Claude（Web、デスクトップ、モバイル）· ChatGPT · VS Code（GitHub Copilot Chat）· Claude Code · OpenAI Codex · Streamable HTTP に対応するすべての MCP クライアント

---

## 📄 ライセンス

[MIT License](LICENSE) の下で公開されています。Copyright © 2026 AlgoHash Inc.

<p align="center">
  <a href="https://console.algohash.ai"><img src="assets/algohash-icon.png" alt="AlgoHash" width="40" height="40"></a><br>
  <sub><a href="https://console.algohash.ai">AlgoHash</a> が開発しています · この SDK がお役に立ちましたら、リポジトリに ⭐ をお願いします</sub>
</p>
