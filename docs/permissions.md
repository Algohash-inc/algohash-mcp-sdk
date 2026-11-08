# Permissions

## Scopes

| Scope | Studio | Team | Grants |
|---|---|---|---|
| `read` | ✓ | ✓ | Look at your data: lists, details, status, quotes, previews |
| `edit` | ✓ | ✓ | Change your data for free: create drafts, rename, reorder, revise, delete your own items |
| `spend` | ✓ | ✓ | Start anything that costs HWT, and grant teammates high-risk tools |
| `publish` | ✓ | — | Post or reply on connected social accounts and websites (visible to the public, cannot be taken back) |

Scopes are **independent**. `spend` does not include `edit`, and `publish` does not include either.
An action that needs two scopes lists both, and the key must have both.

The Open API server has no scopes; each key has a monthly HWT cap instead.

## Least privilege

| Integration | Give it |
|---|---|
| Dashboard, reporting, "what's in my library" bot | `read` |
| Agent that drafts storyboards, organises the library, edits projects | `read` + `edit` |
| Agent that renders images and video for a human who approves each quote | `read` + `edit` + `spend` |
| Social scheduling tool | `read` + `edit` + `publish` (add `spend` only if it also generates the media) |
| Team: builds and edits teammates and groups | `read` + `edit` |
| Team: deploys work, installs paid templates, grants high-risk tools | `read` + `edit` + `spend` |

Also lower the key's **daily cap** to what the integration really needs. The cap is the hard ceiling: a
leaked key, a looping agent or a prompt-injected agent cannot spend past it.

## Scan what a key can do

From the command line:

```bash
node tools/permissions.mjs studio read,edit
node tools/permissions.mjs studio read,edit --denied
node tools/permissions.mjs team read,edit,spend --json
```

From code, tell the SDK the key's scopes. Calls that need more are refused locally, before any request
leaves the process (`status: "error"`, `code: "scope_denied"`, `local: true`):

```ts
const studio = new StudioClient({ apiKey, keyScopes: ["read", "edit"] });
studio.canCall("studio", "generate_image");             // false
const { allowed, denied } = studio.allowedActions();    // "tool.action" lists
```
```python
studio = StudioClient(key, key_scopes=["read", "edit"])
studio.allowed_actions()["denied"]
```
```go
s := algohash.NewStudio(key, algohash.WithKeyScopes("read", "edit"))
allowed, denied := s.AllowedActions(nil)
```

The local check is a convenience. The server checks every call again and is the only authority — a
client that skips the check gets the same `scope_denied` from the server.

## Argument-dependent scopes

A few actions need more scopes for some arguments (for example, a Team teammate created with a
high-risk tool needs `edit + spend`). The SDK tables list the base scope; the server decides per call.
The list is in the [permission matrix](reference/permissions.md).

## Permission matrix

[reference/permissions.md](reference/permissions.md) — generated from `spec/`, with counts per scope set
and every exception.

## Approval rules on top of scopes

Scopes say what a key *may* do. The account owner's approval rules (Studio → Settings → Approval Rules)
can still ask before a call, or block it. Asking comes back as `needs_permission`; see
[approvals](approvals.md). Team MCP does not read those rules: it applies its own stricter rule and asks
before every spend, delete, apply, permission grant, budget raise or schedule.
