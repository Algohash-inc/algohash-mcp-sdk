package algohash

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

var base string

func TestMain(m *testing.M) {
	root, _ := filepath.Abs("../../..")
	cmd := exec.Command("node", filepath.Join(root, "tools/mock-server.mjs"))
	cmd.Env = append(os.Environ(), "PORT=0")
	out, _ := cmd.StdoutPipe()
	if err := cmd.Start(); err != nil {
		fmt.Println("node not available:", err)
		os.Exit(1)
	}
	line, _ := bufio.NewReader(out).ReadString('\n')
	base = regexp.MustCompile(`http://[\d.]+:\d+`).FindString(line)
	code := m.Run()
	_ = cmd.Process.Kill()
	if pageCmd != nil && pageCmd.Process != nil {
		_ = pageCmd.Process.Kill()
	}
	os.Exit(code)
}

const testKey = "smk_mock_secret_value_do_not_print"

func studio(key string, opts ...Option) *StudioClient {
	return NewStudio(key, append([]Option{WithEndpoint(base + "/mcp/studio")}, opts...)...)
}

func TestInitializeAndList(t *testing.T) {
	ctx := context.Background()
	s := studio("smk_mock_read")
	r, err := s.Initialize(ctx)
	if err != nil || r["protocolVersion"] != "2025-11-25" {
		t.Fatalf("init: %v %v", r, err)
	}
	tools, err := s.ListTools(ctx)
	if err != nil || len(tools) != 22 {
		t.Fatalf("tools: %d %v", len(tools), err)
	}
}

func TestReadAndScope(t *testing.T) {
	ctx := context.Background()
	r, err := studio("smk_mock_read").Core.ListAssets(ctx, Params{"pillar": "avatars"})
	if err != nil || !r.OK() {
		t.Fatalf("read: %+v %v", r, err)
	}
	r, _ = studio("smk_mock_read").Create.Storyboard(ctx, Params{})
	if r.Code != "scope_denied" || r.Local {
		t.Fatalf("scope: %s local=%v", r.Code, r.Local)
	}
	r, _ = studio("smk_mock_read", WithKeyScopes("read")).Create.StoryboardDraw(ctx, Params{"version": "v1"})
	if r.Code != "scope_denied" || !r.Local {
		t.Fatalf("preflight: %s local=%v", r.Code, r.Local)
	}
	allowed, denied := studio("smk_mock_read").AllowedActions([]string{"read"})
	if len(allowed)+len(denied) != 329 {
		t.Fatalf("matrix %d", len(allowed)+len(denied))
	}
}

func TestApproval(t *testing.T) {
	ctx := context.Background()
	s := studio("smk_mock_read_edit_spend")
	r, _ := s.Create.StoryboardDraw(ctx, Params{"version": "v1"})
	if r.Status != StatusNeedsConfirmation || r.ConfirmToken == "" || r.FeeHWT != 120 {
		t.Fatalf("quote: %+v", r.Status)
	}
	var kinds []string
	r, err := s.CallWithApproval(ctx, "studio_create", Params{"action": "storyboard_draw", "version": "v2"},
		func(_ context.Context, q ApprovalRequest) (bool, error) {
			kinds = append(kinds, q.Kind)
			return true, nil
		})
	if err != nil || !r.OK() || len(kinds) != 1 {
		t.Fatalf("yes: %v %v %v", r.Status, err, kinds)
	}
	r, _ = s.CallWithApproval(ctx, "studio_create", Params{"action": "storyboard_draw", "version": "v3"},
		func(context.Context, ApprovalRequest) (bool, error) { return false, nil })
	if r.Status != StatusDeclined {
		t.Fatalf("no: %v", r.Status)
	}
	r, _ = s.CallWithApproval(ctx, "studio_create", Params{"action": "storyboard_draw", "version": "v4"}, s.CardApprover())
	if !r.OK() {
		t.Fatalf("card: %v", r.Status)
	}
	kinds = nil
	r, _ = studio("smk_mock_all").CallWithApproval(ctx, "studio", Params{"action": "blog_generate", "topic": "x", "confirm": true},
		func(_ context.Context, q ApprovalRequest) (bool, error) {
			kinds = append(kinds, q.Kind)
			return true, nil
		})
	if !r.OK() || strings.Join(kinds, ",") != "permission,confirmation" {
		t.Fatalf("perm+quote: %v %v", r.Status, kinds)
	}
	if _, err := s.CallWithApproval(ctx, "studio", Params{}, nil); err == nil {
		t.Fatal("nil approver accepted")
	}
}

func TestRateLimitAndBadKey(t *testing.T) {
	ctx := context.Background()
	r, _ := studio("smk_mock_read_ratelimited", WithRetryRateLimited(1)).Core.ListAssets(ctx, nil)
	if r.Code != "rate_limited" || r.RetryAfterSec != 1 {
		t.Fatalf("rl: %v %v", r.Code, r.RetryAfterSec)
	}
	_, err := studio("nope").ListTools(ctx)
	if e, ok := err.(*Error); !ok || e.Code != "invalid_api_key" {
		t.Fatalf("bad key: %v", err)
	}
}

func TestTeamAndOpen(t *testing.T) {
	ctx := context.Background()
	tm := NewTeam("tmk_mock_read_edit_spend", WithEndpoint(base+"/mcp/team"))
	if r, _ := tm.Core.Overview(ctx, nil); !r.OK() {
		t.Fatal("team overview")
	}
	r, _ := tm.CallWithApproval(ctx, "team_deploy", Params{"action": "deploy", "room_id": 1},
		func(context.Context, ApprovalRequest) (bool, error) { return true, nil })
	if !r.OK() {
		t.Fatalf("team deploy %v", r.Status)
	}
	o := NewOpen("ahk_mock", WithEndpoint(base+"/open/v1/mcp"))
	q, _ := o.Quote(ctx, Params{"op": "image.sample"})
	if q.DataMap()["price_hwt"] != float64(40) {
		t.Fatalf("quote %v", q.Data)
	}
	if b, _ := o.Balance(ctx, nil); b.DataMap()["balance_hwt"] != float64(10000) {
		t.Fatal("balance")
	}
}

// ── transport safety ──────────────────────────────────────────────────────

func TestInsecureEndpointRefused(t *testing.T) {
	c := NewStudio(testKey, WithEndpoint("http://example.com/mcp/studio"))
	if e, ok := c.Err().(*Error); !ok || e.Code != "insecure_endpoint" {
		t.Fatalf("got %v", c.Err())
	}
	if _, err := c.ListTools(context.Background()); err == nil {
		t.Fatal("call went through")
	}
	if CheckEndpoint("https://u:p@console.algohash.ai/x") == nil {
		t.Fatal("credentials in URL accepted")
	}
	if NewStudio("smk_x\r\nX-Evil: 1").Err() == nil {
		t.Fatal("CRLF key accepted")
	}
}

func TestKeyNeverFormatted(t *testing.T) {
	c := NewStudio(testKey)
	for _, s := range []string{fmt.Sprint(c), fmt.Sprintf("%v %+v %#v %s", c, c, c, c), fmt.Sprintf("%+v", c.Client), fmt.Sprintf("%#v", *c)} {
		if strings.Contains(s, testKey) {
			t.Fatalf("key leaked: %s", s)
		}
	}
}

func TestRedirectNotFollowed(t *testing.T) {
	hit := false
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { hit = true }))
	defer target.Close()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL+"/steal", http.StatusTemporaryRedirect)
	}))
	defer srv.Close()
	c := NewStudio(testKey, WithEndpoint(srv.URL+"/mcp"))
	_, err := c.Initialize(context.Background())
	if e, ok := err.(*Error); !ok || e.Code != "redirect_refused" || hit {
		t.Fatalf("err=%v hit=%v", err, hit)
	}
}

func TestAuthHeaderNotOverridable(t *testing.T) {
	var seen string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25"}}`))
	}))
	defer srv.Close()
	_, _ = NewStudio(testKey, WithEndpoint(srv.URL), WithHeader("Authorization", "Bearer attacker")).Initialize(context.Background())
	if seen != "Bearer "+testKey {
		t.Fatalf("auth = %q", seen)
	}
}

func TestResponseCap(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(strings.Repeat("x", 4096))) }))
	defer srv.Close()
	_, err := NewStudio(testKey, WithEndpoint(srv.URL), WithMaxResponseBytes(1024)).Initialize(context.Background())
	if e, ok := err.(*Error); !ok || e.Code != "response_too_large" {
		t.Fatalf("got %v", err)
	}
}

func TestBatchLimit(t *testing.T) {
	_, err := studio("smk_mock_read").Batch(context.Background(), make([]BatchCall, 21))
	if e, ok := err.(*Error); !ok || e.Code != "batch_too_large" {
		t.Fatalf("got %v", err)
	}
}

func TestConcurrentUse(t *testing.T) {
	s := studio("smk_mock_read")
	done := make(chan error, 16)
	for i := 0; i < 16; i++ {
		go func() {
			r, err := s.Core.ListAssets(context.Background(), nil)
			if err == nil && !r.OK() {
				err = fmt.Errorf("status %s", r.Status)
			}
			done <- err
		}()
	}
	for i := 0; i < 16; i++ {
		if err := <-done; err != nil {
			t.Fatal(err)
		}
	}
}

func TestCallDropsForeignApproveURL(t *testing.T) {
	n := 0
	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var m map[string]any
		_ = json.NewDecoder(r.Body).Decode(&m)
		w.Header().Set("Content-Type", "application/json")
		if m["method"] != "tools/call" {
			_ = json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": m["id"], "result": map[string]any{"protocolVersion": "2025-11-25"}})
			return
		}
		u := []string{srv.URL + "/mcp/studio/approve/mca_ok", "https://evil.example/approve", strings.Replace(srv.URL, "http://", "http://user@", 1) + "/approve"}[n]
		n++
		_ = json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": m["id"], "result": map[string]any{
			"structuredContent": map[string]any{"ok": false, "error": "awaiting_approval", "approval": "user", "approve_url": u}}})
	}))
	defer srv.Close()
	c := NewStudio("smk_mock_read", WithEndpoint(srv.URL+"/mcp/studio"))
	want := []string{srv.URL + "/mcp/studio/approve/mca_ok", "", ""}
	for i, w := range want {
		r, err := c.Call(context.Background(), "studio", Params{"action": "list_assets"})
		if err != nil {
			t.Fatal(err)
		}
		if r.ApproveURL != w {
			t.Fatalf("call %d: ApproveURL = %q, want %q", i, r.ApproveURL, w)
		}
	}
}
