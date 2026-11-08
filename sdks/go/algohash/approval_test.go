package algohash

// Owner approval on AlgoHash ("Only I can approve paid and risky steps", approval "user").
// This mock runs with MOCK_APPROVE_VIA_PAGE=1: nothing is approved until the approve_url is opened.

import (
	"bufio"
	"context"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"
)

var (
	pageOnce sync.Once
	pageBase string
	pageCmd  *exec.Cmd
)

func pageMock(t *testing.T) string {
	t.Helper()
	pageOnce.Do(func() {
		root, _ := filepath.Abs("../../..")
		pageCmd = exec.Command("node", filepath.Join(root, "tools/mock-server.mjs"))
		pageCmd.Env = append(os.Environ(), "PORT=0", "MOCK_APPROVE_VIA_PAGE=1")
		out, _ := pageCmd.StdoutPipe()
		if err := pageCmd.Start(); err != nil {
			return
		}
		line, _ := bufio.NewReader(out).ReadString('\n')
		pageBase = regexp.MustCompile(`http://[\d.]+:\d+`).FindString(line)
	})
	if pageBase == "" {
		t.Fatal("page-mode mock did not start")
	}
	// TestMain kills the process when the tests finish.
	return pageBase
}

// userOpens simulates the account owner opening the approve link on AlgoHash.
func userOpens(link, decision string) {
	go func() {
		time.Sleep(300 * time.Millisecond)
		if decision != "" {
			link += "?decision=" + decision
		}
		if res, err := http.Get(link); err == nil {
			res.Body.Close()
		}
	}()
}

func TestOwnerApproval(t *testing.T) {
	ctx := context.Background()
	b := pageMock(t)
	s := NewStudio("smk_mock_read_edit_spend", WithEndpoint(b+"/mcp/studio"))

	q, _ := s.Create.StoryboardDraw(ctx, Params{"version": "g1"})
	if q.Status != StatusNeedsConfirmation || q.Approval != "user" || !strings.HasPrefix(q.ApproveURL, b+"/approve/") {
		t.Fatalf("quote: %v %q %q", q.Status, q.Approval, q.ApproveURL)
	}
	r, _ := s.Create.StoryboardDraw(ctx, Params{"version": "g1", "confirm_token": q.ConfirmToken})
	if r.Status != StatusAwaitingApproval || r.IsError || r.ApproveURL != q.ApproveURL {
		t.Fatalf("early repeat: %v isError=%v", r.Status, r.IsError)
	}
	d, _ := s.Call(ctx, "studio_confirm", Params{"action": "decide", "args": map[string]any{"confirm_token": q.ConfirmToken, "decision": "approve"}})
	if d.DataMap()["status"] != "user_required" {
		t.Fatalf("self-approve: %v", d.Data)
	}

	var seen []ApprovalRequest
	r, err := s.CallWithApproval(ctx, "studio_create", Params{"action": "storyboard_draw", "version": "g2"},
		func(_ context.Context, q ApprovalRequest) (bool, error) {
			seen = append(seen, q)
			userOpens(q.ApproveURL, "")
			return true, nil
		})
	if err != nil || !r.OK() || len(seen) != 1 || seen[0].Approval != "user" {
		t.Fatalf("owner approves: %v %v", r.Status, err)
	}

	r, _ = s.CallWithApproval(ctx, "studio_create", Params{"action": "storyboard_draw", "version": "g3"},
		func(_ context.Context, q ApprovalRequest) (bool, error) {
			userOpens(q.ApproveURL, "decline")
			return true, nil
		})
	if r.Status != StatusDeclined {
		t.Fatalf("owner declines: %v", r.Status)
	}

	short := NewStudio("smk_mock_read_edit_spend", WithEndpoint(b+"/mcp/studio"), WithMaxWaitSec(2))
	r, _ = short.CallWithApproval(ctx, "studio_create", Params{"action": "storyboard_draw", "version": "g4"},
		func(context.Context, ApprovalRequest) (bool, error) { return true, nil })
	if r.Status != StatusAwaitingApproval || r.ApproveURL == "" || r.ConfirmToken == "" {
		t.Fatalf("timeout: %v %q", r.Status, r.ApproveURL)
	}

	// Card mode: show the card, then wait for the owner.
	r, _ = s.CallWithApproval(ctx, "studio_create", Params{"action": "storyboard_draw", "version": "g5"},
		func(ctx context.Context, q ApprovalRequest) (bool, error) {
			userOpens(q.ApproveURL, "")
			return s.CardApprover()(ctx, q)
		})
	if !r.OK() {
		t.Fatalf("card: %v", r.Status)
	}

	ag := NewStudio("smk_mock_read_edit_spend_agentapproval", WithEndpoint(b+"/mcp/studio"))
	seen = nil
	r, _ = ag.CallWithApproval(ctx, "studio_create", Params{"action": "storyboard_draw", "version": "g6"},
		func(_ context.Context, q ApprovalRequest) (bool, error) { seen = append(seen, q); return true, nil })
	if !r.OK() || seen[0].Approval != "agent" || seen[0].ApproveURL != "" {
		t.Fatalf("agent key: %v %+v", r.Status, seen)
	}

	tm := NewTeam("tmk_mock_read_edit_spend", WithEndpoint(b+"/mcp/team"))
	r, _ = tm.CallWithApproval(ctx, "team_deploy", Params{"action": "deploy", "room_id": 1, "args": map[string]any{"goal": "x"}},
		func(_ context.Context, q ApprovalRequest) (bool, error) {
			userOpens(q.ApproveURL, "")
			return true, nil
		})
	if !r.OK() {
		t.Fatalf("team wait: %v", r.Status)
	}
}

func TestApproveURLSameOriginOnly(t *testing.T) {
	c := NewStudio("smk_mock_x").Client
	for _, bad := range []string{"https://approve.example.org/phish", "http://console.algohash.ai/approve/x",
		"https://user@console.algohash.ai/approve/x", "javascript:alert(1)"} {
		if got := c.sameOrigin(bad); got != "" {
			t.Fatalf("accepted %q", bad)
		}
	}
	if c.sameOrigin("https://console.algohash.ai/approve/x") == "" {
		t.Fatal("rejected own origin")
	}
}
