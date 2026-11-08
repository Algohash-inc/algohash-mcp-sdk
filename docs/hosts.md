# Connecting MCP hosts

You do not need the SDK to use the servers from an AI app. Point the app at the endpoint.

Studio: `https://console.algohash.ai/mcp/studio` · Team: `https://console.algohash.ai/mcp/team` ·
Open API: `https://console.algohash.ai/open/v1/mcp`

Hosts marked **cards** render Studio's interactive cards (storyboard player, character picker, quote
approval, library). Others get the same results as text and links.

## Claude (web, desktop, mobile) — cards

Settings → Connectors → **Add custom connector** → paste the URL → **Connect** → sign in and choose the
scopes. Leave **spend** off unless you want Claude to start paid jobs; each paid job still shows a quote
card. Add it on web or desktop first; it then also works on mobile.

## ChatGPT — cards

Settings → Apps & Connectors → Advanced settings → **Developer mode** on → **Create** → MCP server URL =
the URL above, Authentication = **OAuth** → sign in and approve. In a chat, pick the app from the **+** menu.

## VS Code (GitHub Copilot Chat) — cards

`.vscode/mcp.json` — the key is prompted for and stored by VS Code, never written to the file:

```json
{
  "inputs": [{ "type": "promptString", "id": "studio-key", "description": "Studio MCP key", "password": true }],
  "servers": {
    "studio": { "type": "http", "url": "https://console.algohash.ai/mcp/studio",
      "headers": { "Authorization": "Bearer ${input:studio-key}" } }
  }
}
```

## Claude Code — text

Project file `.mcp.json` (Claude Code expands `${VAR}` from your environment, so the key is not stored):

```json
{ "mcpServers": { "algohash-studio": { "type": "http", "url": "https://console.algohash.ai/mcp/studio",
  "headers": { "Authorization": "Bearer ${ALGOHASH_STUDIO_KEY}" } } } }
```

Avoid `claude mcp add --header "Authorization: Bearer $KEY"`: the shell expands the key and Claude Code
writes the literal value into its config file.

## OpenAI Codex (CLI / IDE) — text

`~/.codex/config.toml`, key in an environment variable:

```toml
[mcp_servers.studio]
url = "https://console.algohash.ai/mcp/studio"
bearer_token_env_var = "ALGOHASH_STUDIO_KEY"
```

## Any other MCP client

Streamable HTTP, stateless, `POST` to the URL. Auth: OAuth 2.1 (discovery at
`https://console.algohash.ai/.well-known/oauth-protected-resource/mcp/studio`) or a static
`Authorization: Bearer smk_…` header. Ready-made configs are in [`samples/hosts/`](../samples/hosts/).

Agent skills that teach a model the rules are served live:
`https://console.algohash.ai/mcp/studio/skill.md` and `https://console.algohash.ai/mcp/team/skill.md`.
