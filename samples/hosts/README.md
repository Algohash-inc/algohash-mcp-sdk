# MCP host configs

Copy-ready configs. None of them contains a key: each one reads the key from a prompt or an
environment variable at run time. Do not paste a key into these files, and do not commit a file that
has one.

| Host | File | Where it goes | How the key gets in |
|---|---|---|---|
| VS Code (Copilot Chat) | [`vscode/mcp.json`](vscode/mcp.json) | `.vscode/mcp.json` in your project | VS Code prompts once and stores it in its secret storage |
| Claude Code | [`claude-code/.mcp.json`](claude-code/.mcp.json) | project root | `${ALGOHASH_STUDIO_KEY}` / `${ALGOHASH_TEAM_KEY}` expanded from your shell environment |
| OpenAI Codex | [`codex/config.toml`](codex/config.toml) | append to `~/.codex/config.toml` | `bearer_token_env_var` |

Claude (web/desktop/mobile) and ChatGPT use OAuth: add the URL as a custom connector and sign in.
No file is needed. See [docs/hosts.md](../../docs/hosts.md).

Prefer OAuth where the host supports it. A static key works in every host but lives as long as you
let it: give it the fewest scopes the job needs and revoke it when you stop using it.
