// Team: overview, then deploy work to a group (always needs approval).
package main

import (
	"context"
	"time"

	"github.com/Algohash-inc/algohash-mcp-sdk/samples/go/internal/env"
	"github.com/Algohash-inc/algohash-mcp-sdk/sdks/go/algohash"
)

func main() {
	ctx := context.Background()
	t := env.Team()
	r, err := t.Core.Overview(ctx, nil)
	env.Show("overview", r, err)
	r, err = t.CallWithApproval(ctx, "team_deploy", algohash.Params{"action": "deploy", "room_id": 1,
		"brief": "Weekly competitor brief, five bullets", "client_ref": "sample-" + time.Now().Format("2006-01-02")}, env.AskHuman)
	env.Show("deploy", r, err)
}
