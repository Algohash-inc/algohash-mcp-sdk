// Package env is shared setup for the Go samples.
//
//	ALGOHASH_MOCK=1          -> tools/mock-server.mjs on 127.0.0.1:8787 with mock keys
//	ALGOHASH_STUDIO_KEY etc. -> real keys (never hard-code them)
package env

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/Algohash-inc/algohash-mcp-sdk/sdks/go/algohash"
)

var Mock = os.Getenv("ALGOHASH_MOCK") == "1"

func base() string {
	if u := os.Getenv("ALGOHASH_MOCK_URL"); u != "" {
		return u
	}
	return "http://127.0.0.1:8787"
}

func key(name, mockKey string) string {
	if Mock {
		return mockKey
	}
	v := os.Getenv(name)
	if v == "" {
		fmt.Fprintf(os.Stderr, "Set %s (or ALGOHASH_MOCK=1 to use the local mock server).\n", name)
		os.Exit(2)
	}
	return v
}

func opts(path, scopesVar string) []algohash.Option {
	var o []algohash.Option
	if Mock {
		o = append(o, algohash.WithEndpoint(base()+path))
	}
	if s := os.Getenv(scopesVar); s != "" {
		o = append(o, algohash.WithKeyScopes(strings.Split(s, ",")...))
	}
	return o
}

func Studio() *algohash.StudioClient {
	c := algohash.NewStudio(key("ALGOHASH_STUDIO_KEY", "smk_mock_read_edit_spend"), opts("/mcp/studio", "ALGOHASH_STUDIO_SCOPES")...)
	must(c.Err())
	return c
}

func Team() *algohash.TeamClient {
	c := algohash.NewTeam(key("ALGOHASH_TEAM_KEY", "tmk_mock_read_edit_spend"), opts("/mcp/team", "ALGOHASH_TEAM_SCOPES")...)
	must(c.Err())
	return c
}

func Open() *algohash.OpenClient {
	c := algohash.NewOpen(key("ALGOHASH_OPEN_KEY", "ahk_mock"), opts("/open/v1/mcp", "")...)
	must(c.Err())
	return c
}

func must(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

// AskHuman returns true only for an explicit "y". Non-interactive runs are declined,
// except against the mock with ALGOHASH_MOCK_AUTO_APPROVE=1.
func AskHuman(_ context.Context, q algohash.ApprovalRequest) (bool, error) {
	text := fmt.Sprintf("Allow %s.%s? %s", q.Tool, q.Action, q.Message)
	if q.Kind == "confirmation" {
		text = fmt.Sprintf("Spend %.0f HWT on %s.%s? %s", q.FeeHWT, q.Tool, q.Action, q.Summary)
	}
	if q.Approval == "user" {
		// The owner approves on AlgoHash; "y" here only means "wait for my decision there".
		link := q.ApproveURL
		if link == "" {
			link = "open AlgoHash → approvals"
		}
		text += "\nApprove or decline on AlgoHash (signed in): " + link + "\nWait for your decision there?"
	}
	if Mock && os.Getenv("ALGOHASH_MOCK_AUTO_APPROVE") == "1" {
		fmt.Println("[mock auto-approve]", text)
		return true, nil
	}
	if fi, err := os.Stdin.Stat(); err != nil || fi.Mode()&os.ModeCharDevice == 0 {
		fmt.Println("[declined: no terminal to ask]", text)
		return false, nil
	}
	fmt.Printf("%s\n[y/N] ", text)
	line, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil && strings.TrimSpace(line) == "" {
		fmt.Println("\n[declined: no answer]")
		return false, nil
	}
	return strings.TrimSpace(strings.ToLower(line)) == "y", nil
}

// Show prints a one-line result.
func Show(label string, r *algohash.ToolResult, err error) {
	must(err)
	detail := r.Message
	if r.OK() {
		detail = fmt.Sprint(r.Data)
		if len(detail) > 300 {
			detail = detail[:300]
		}
	}
	fmt.Printf("%s: %s %s %s\n", label, r.Status, r.Code, detail)
}
