# Authentication

Every request carries one credential in the `Authorization` header:

```
Authorization: Bearer <key or access token>
```

Never put a key in a URL, a query string, a log line or a commit. Keys in URLs end up in access logs,
`Referer` headers and browser history.

## Static keys

| Server | Prefix | Where to create it | Default scopes |
|---|---|---|---|
| Studio | `smk_` | Studio → **MCP Access** | `read` + `edit` + `spend` |
| Team | `tmk_` | Team → **MCP** → **Keys & scopes** | `read` + `edit` |
| Open API | — | Studio → **Developer** → **API keys** (enabled per account by a workspace administrator) | none (monthly cap) |

On the same page you can rename a key, change its scopes, set its daily cap, see its recent calls,
regenerate it and revoke it. A revoked key stops working immediately.

**Pick scopes before you paste the key anywhere.** Turn `spend` off for read-only agents; turn
`publish` on only for an integration that must post to social accounts. See [permissions](permissions.md).

## OAuth 2.1

Studio and Team also act as OAuth 2.1 protected resources, for hosts that sign users in (claude.ai,
ChatGPT and other connector directories). The host discovers everything from:

```
https://console.algohash.ai/.well-known/oauth-protected-resource/mcp/studio
https://console.algohash.ai/.well-known/oauth-protected-resource/mcp/team
```

A `401` response carries a `WWW-Authenticate: Bearer resource_metadata="…"` header pointing at the same
document. The user signs in, picks the scopes on the consent screen, and the host receives an access
token. Pass it to the SDK as `accessToken` (TS), `access_token` (Python) or as the key argument (Go).

Team OAuth needs a client on MCP protocol `2025-06-18` or later; older clients use a static `tmk_` key.

OAuth connections are listed next to static keys and can be revoked the same way.

## Storing keys

- Read keys from the environment or a secret manager. The samples read `ALGOHASH_STUDIO_KEY`,
  `ALGOHASH_TEAM_KEY` and `ALGOHASH_OPEN_KEY`.
- In MCP host configs, use the host's secret input (`${input:…}` in VS Code, an environment variable
  in Codex) instead of pasting the key into a file you might commit.
- One key per integration. When one leaks, you revoke one key, not all of them.
- Rotate with **Regenerate**: the old value stops working the moment the new one is shown.

## What a key can and cannot do

A key is bound to exactly one account. The server derives the account from the key and ignores any
account or user identifier a client sends. There is no argument in any tool that addresses another
account.
