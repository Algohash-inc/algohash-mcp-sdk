# Terminal login

Sign a terminal in to AlgoHash with your phone. There is no key to copy: you check a short code,
approve with Face ID in AlgoHash, and the CLI stores the login for you.

```bash
npx @algohash/mcp login
```

Terminal login covers the **Studio MCP** (`/mcp/studio`) and **Team MCP** (`/mcp/team`) servers.
One login gives the terminal one key for each server. Static `smk_` / `tmk_` keys and the OAuth
connector flow for Claude and ChatGPT keep working as before; terminal login is a third way, for
terminals and scripts.

## What you see

In the terminal:

1. A QR code and the link `https://console.algohash.ai/mcp/device`. Open it on your phone.
2. An 8-letter code in a box (`XXXX-XXXX`, letters only).
3. "Approve with Face ID in AlgoHash", then a live status line with the time left (10 minutes).

On the phone, after you sign in to AlgoHash if needed:

- The page **Let this terminal sign in?** with the code to match, the app, the machine name
  (marked "not verified"), where the request came from (country and masked address), the servers
  and your account.
- Switches: **Read** (always on), **Edit** (on), **Spend HWT** (off).
- **Approve with Face ID** or **Deny**.

When you approve, the terminal shows the account (masked), the servers, the access you gave and
where the login is saved: macOS Keychain, the system keyring, or
`~/.config/algohash/credentials.json` (mode `0600`).

## Spending

Spending is off after login, even if your static keys can spend. Turn it on for one terminal in
AlgoHash: **MCP Hub → Connected terminals** (Face ID). Every charge still waits for a quote and an
approval, as described in [approvals.md](approvals.md).

## Commands

| Command | What it does |
|---|---|
| `algohash login` | Sign this terminal in |
| `algohash status` | Show the login (`--json` for scripts) |
| `algohash logout` | Sign out and revoke this terminal's keys |
| `algohash token <studio\|team>` | Print a fresh access token. Only when piped, or with `--show` |
| `algohash headers <studio\|team>` | Print `{"Authorization":"Bearer …"}` for an MCP client's headers helper |

Without a global install, put `npx @algohash/mcp` in front of each command.

Login flags: `--servers studio,team`, `--no-qr`, `--no-wait`, `--timeout <sec>`,
`--store auto|keychain|secret-service|file`.

Environment: `ALGOHASH_BASE_URL`, `ALGOHASH_CONFIG_DIR`, `ALGOHASH_CREDENTIALS_FILE`, `NO_COLOR`,
`ALGOHASH_ASCII=1`, `CI`.

Exit codes: `0` signed in, `1` error, `2` `--no-wait`, `3` denied, `4` expired, `130` Ctrl-C.

## Using the login from code

Access tokens last 24 hours. The CLI refreshes them for you when you call `algohash token` or
`algohash headers`. A login lasts 60 days from the last use.

```bash
export ALGOHASH_STUDIO_KEY="$(npx @algohash/mcp token studio)"
```

## Disconnect a terminal

In AlgoHash: **MCP Hub → Connected terminals**. One tap revokes that terminal's keys for both
servers. `algohash logout` does the same from the terminal.

## Errors

| Message | Meaning |
|---|---|
| `authorization_pending` | Still waiting for the phone |
| `slow_down` | Polling too fast, or too many logins from one address. Wait and retry |
| `access_denied` | The owner denied the login, or the account has too many connected terminals |
| `expired_token` | The 10 minutes ran out. Run `algohash login` again |
| `invalid_grant` | The code was used or is unknown, or this terminal was disconnected |
| `invalid_target` | Unknown name in `--servers` |
| this server does not offer terminal login | The server answered 404 for the login endpoints |
| refusing to print a token to the terminal | `token` on a terminal without `--show` |
| not signed in; run: algohash login | No saved login |

On the phone you can see: code not found or expired, too many tries (10 per account per 10
minutes), Face ID cancelled or not verified, and "Add Face ID (a passkey) in Settings → Security
first".
