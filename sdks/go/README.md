# algohash (Go)

Typed client for the AlgoHash Studio, Team and Open API MCP servers. Go 1.21+, standard library only.

```bash
go get github.com/Algohash-inc/algohash-mcp-sdk/sdks/go
```

```go
s := algohash.NewStudio(os.Getenv("ALGOHASH_STUDIO_KEY"), algohash.WithKeyScopes("read", "edit"))
if err := s.Err(); err != nil { log.Fatal(err) }
r, err := s.Core.ListAssets(ctx, algohash.Params{"pillar": "avatars"})
```

Paid and public steps return an approval request. `CallWithApproval` asks your `Approver` and never
approves on its own. By default one tap on the approval card (or a yes in chat) approves. When the key owner turns on
"Only I can approve paid and risky steps", only they can approve, on the AlgoHash link the request
carries, and the helper waits for that decision.
Clients are safe for concurrent use. Keys are never printed (`%v`, `%#v`, `%s`).

Docs: [SDK guide](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/sdk-go.md) · [permissions](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/permissions.md) ·
[approvals](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/approvals.md) · [security](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/security.md) · [tool reference](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/reference/)

License: MIT
