# Go SDK

`github.com/Algohash-inc/algohash-mcp-sdk/sdks/go/algohash` — Go 1.21+, standard library only.

```bash
go get github.com/Algohash-inc/algohash-mcp-sdk/sdks/go
```

## Clients

```go
import "github.com/Algohash-inc/algohash-mcp-sdk/sdks/go/algohash"

s := algohash.NewStudio(os.Getenv("ALGOHASH_STUDIO_KEY"), algohash.WithKeyScopes("read", "edit"))
if err := s.Err(); err != nil { log.Fatal(err) }   // bad key / insecure endpoint
t := algohash.NewTeam(os.Getenv("ALGOHASH_TEAM_KEY"))
o := algohash.NewOpen(os.Getenv("ALGOHASH_OPEN_KEY"))
```

Options: `WithEndpoint`, `WithKeyScopes`, `WithHTTPClient` (redirects are still refused),
`WithRetryRateLimited`, `WithMaxResponseBytes`, `WithHeader` (cannot override `Authorization`).

## Calling actions

```go
r, err := s.Core.ListAssets(ctx, algohash.Params{"pillar": "avatars"})
r, err  = s.Create.Storyboard(ctx, algohash.Params{"args": map[string]any{"prompt": "…"}})
r, err  = t.Core.Overview(ctx, nil)
r, err  = o.Quote(ctx, algohash.Params{"op": "…"})
r, err  = s.Call(ctx, "studio_create", algohash.Params{"action": "storyboard"})   // raw
```

`err` is non-nil only for transport/protocol failures (`*algohash.Error`). Tool outcomes are in
`r.Status` (`algohash.StatusOK`, `StatusNeedsConfirmation`, …), `r.Code`, `r.Message`, `r.Data`,
`r.DataMap()`, `r.ConfirmToken`, `r.FeeHWT`, `r.Next`. `r.Unwrap()` returns an error unless ok.

## Approvals

```go
approve := func(ctx context.Context, q algohash.ApprovalRequest) (bool, error) {
	if q.Approval == "user" { // the owner approves on AlgoHash; true = wait for that decision
		fmt.Println("Approve here:", q.ApproveURL)
	}
	return askHuman(fmt.Sprintf("Spend %.0f HWT on %s.%s?", q.FeeHWT, q.Tool, q.Action)), nil
}
s := algohash.NewStudio(key, algohash.WithMaxWaitSec(300)) // default 300
r, err := s.CallWithApproval(ctx, "studio", algohash.Params{"action": "generate_image", "prompt": "…"}, approve)
// r.Status: StatusOK | StatusDeclined | StatusAwaitingApproval (r.ApproveURL, r.ConfirmToken) | …
// Studio in MCP-Apps hosts: s.CallWithApproval(ctx, tool, args, s.CardApprover(approve))
```

See [Approvals](approvals.md#the-sdk-helper) for what `true` means.

## Permissions

```go
s.RequiredScopes("studio", "generate_image")             // [spend]
s.CanCall("studio", "generate_image", []string{"read"})  // false
allowed, denied := s.AllowedActions([]string{"read", "edit"})
```

## Other methods

`Initialize`, `Instructions`, `ListTools`, `Batch` (≤ 20), `RPC`. A `*Client` is safe for concurrent use.
Printing a client with any `fmt` verb shows `key=[redacted]`.
