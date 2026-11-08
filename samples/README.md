# Samples

Every sample runs against the bundled mock server, so you can try them without a key or any spend.

```bash
node tools/mock-server.mjs            # terminal 1: listens on 127.0.0.1:8787
```

```bash
ALGOHASH_MOCK=1 node samples/typescript/03-generate-image.mjs     # terminal 2
```

Against the real servers, set the key for the server you use and leave `ALGOHASH_MOCK` unset:

| Variable | Used by |
|---|---|
| `ALGOHASH_STUDIO_KEY` | Studio samples (`smk_…`) |
| `ALGOHASH_TEAM_KEY` | Team samples (`tmk_…`) |
| `ALGOHASH_OPEN_KEY` | Open API samples |
| `ALGOHASH_STUDIO_SCOPES`, `ALGOHASH_TEAM_SCOPES` | Optional, e.g. `read,edit`. Lets the SDK refuse out-of-scope calls before they leave your machine |

## Approvals in samples

Paid and public steps come back as approval requests. The samples ask you in the terminal and continue
only if you type `y`. When there is no terminal (CI, a pipe), they decline, and nothing is charged.

`ALGOHASH_MOCK_AUTO_APPROVE=1` approves automatically. It only works together with `ALGOHASH_MOCK=1`,
so it can never approve a real charge.

## Index

| What | TypeScript | Python | Go |
|---|---|---|---|
| What can this key do? | `01-permissions.mjs` | `01_permissions.py` | `go run ./cmd/permissions` |
| Browse the library (free) | `02-library.mjs` | `02_library.py` | |
| Generate an image (paid, approval) | `03-generate-image.mjs` | `03_generate_image.py` | `go run ./cmd/generate-image` |
| Storyboard first, then video | `04-storyboard-video.mjs` | `04_storyboard_video.py` | |
| Team: deploy work to a group | `05-team-deploy.mjs` | `05_team_deploy.py` | `go run ./cmd/team-deploy` |
| Open API: quote, generate, poll | `06-open-quote.mjs` | `06_open_quote.py` | `go run ./cmd/open-quote` |
| Feed tools to your own LLM agent | `07-agent-context.mjs` | | |

Go samples run from `samples/go` (`cd samples/go && ALGOHASH_MOCK=1 go run ./cmd/permissions`).
They use the local SDK through a `replace` directive.

MCP host configs (VS Code, Claude Code, Codex) are in [`hosts/`](hosts/).
