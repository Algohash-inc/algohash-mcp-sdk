// Paid: estimate -> generate (asks a human first) -> download links.
package main

import (
	"context"

	"github.com/Algohash-inc/algohash-mcp-sdk/samples/go/internal/env"
	"github.com/Algohash-inc/algohash-mcp-sdk/sdks/go/algohash"
)

func main() {
	ctx := context.Background()
	s := env.Studio()
	r, err := s.Core.EstimateCost(ctx, algohash.Params{"cost_kind": "image", "image_resolution": "1K"})
	env.Show("estimate", r, err)
	r, err = s.CallWithApproval(ctx, "studio", algohash.Params{"action": "generate_image",
		"prompt": "a lighthouse at dawn, watercolor", "ratio": "16:9", "image_resolution": "1K"}, env.AskHuman)
	env.Show("generate_image", r, err)
	if !r.OK() {
		return
	}
	if id, _ := r.DataMap()["job_id"].(string); id != "" {
		o, err := s.Outputs.Get(ctx, algohash.Params{"args": map[string]any{"job_id": id, "wait_sec": 20}})
		env.Show("outputs", o, err)
	}
}
