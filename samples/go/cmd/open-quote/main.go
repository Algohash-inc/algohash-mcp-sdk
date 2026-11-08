// Open API: catalog -> quote -> (ask) -> generate -> poll.
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/Algohash-inc/algohash-mcp-sdk/samples/go/internal/env"
	"github.com/Algohash-inc/algohash-mcp-sdk/sdks/go/algohash"
)

func main() {
	ctx := context.Background()
	o := env.Open()
	m, err := o.ListModels(ctx, algohash.Params{"kind": "image"})
	env.Show("models", m, err)
	models, _ := m.DataMap()["models"].([]any)
	if len(models) == 0 {
		return
	}
	op, _ := models[0].(map[string]any)["op"].(string)
	q, err := o.Quote(ctx, algohash.Params{"op": op})
	env.Show("quote", q, err)
	price, _ := q.DataMap()["price_hwt"].(float64)
	if ok, _ := env.AskHuman(ctx, algohash.ApprovalRequest{Kind: "confirmation", Tool: "generate", Action: op, FeeHWT: price}); !ok {
		return
	}
	j, err := o.Generate(ctx, algohash.Params{"op": op, "inputs": map[string]any{"prompt": "a paper boat on a pond"}})
	env.Show("generate", j, err)
	id, _ := j.DataMap()["job_id"].(string)
	for i := 0; i < 30; i++ {
		st, err := o.JobStatus(ctx, algohash.Params{"job_id": id})
		env.Show("job", st, err)
		if s, _ := st.DataMap()["status"].(string); s == "completed" || s == "failed" || s == "error" {
			fmt.Println("done")
			return
		}
		time.Sleep(2 * time.Second)
	}
}
