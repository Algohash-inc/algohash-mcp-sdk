// What can this key do?  ALGOHASH_STUDIO_SCOPES=read,edit go run ./cmd/permissions
package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/Algohash-inc/algohash-mcp-sdk/samples/go/internal/env"
)

func main() {
	s := env.Studio()
	tools, err := s.ListTools(context.Background())
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	scopes := []string{"read", "edit", "spend"}
	if v := os.Getenv("ALGOHASH_STUDIO_SCOPES"); v != "" {
		scopes = strings.Split(v, ",")
	}
	allowed, denied := s.AllowedActions(scopes)
	fmt.Printf("%d tools; with %v: %d allowed, %d denied\n", len(tools), scopes, len(allowed), len(denied))
	fmt.Println("paid image generation allowed:", s.CanCall("studio", "generate_image", scopes))
}
