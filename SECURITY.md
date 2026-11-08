# Security policy

## Reporting a vulnerability

Please report privately. Do not open a public issue, pull request or discussion.

- GitHub: **Security → Report a vulnerability** on this repository (private advisory), or
- Email: **security@algohash.ai**

Include what you found, how to reproduce it, and what an attacker could do with it. We acknowledge
reports within 3 business days and keep you updated until it is fixed. Please give us a reasonable
time to fix before you disclose publicly.

## Scope

In scope:

- The SDKs in this repository (`sdks/typescript`, `sdks/python`, `sdks/go`): for example a key leaking
  into a log, an error, a redirect or a serialized object; TLS or endpoint checks that can be bypassed;
  an SDK path that approves a paid or public step without the caller's approver.
- The public MCP endpoints described here (`/mcp/studio`, `/mcp/team`, `/open/v1/mcp`): for example
  reaching another account's data, spending without the `spend` scope, publishing without `publish`,
  reusing an approval token for different arguments, or bypassing the daily cap.

Out of scope: volumetric denial of service, rate-limit tuning, social engineering, issues that need a
key you were not given, and findings from automated scanners without a working impact.

Never test against accounts that are not yours. Use the bundled mock server
(`node tools/mock-server.mjs`) or your own account with a key that has no `spend` scope.

## If your key leaked

Revoke it now: Studio → MCP → Keys (or Team → MCP → Keys & scopes, or the Open API key page). Revocation
takes effect on the next request. Then check the account's activity for jobs you did not start.

## Supported versions

Only the latest minor release of each SDK receives security fixes.
