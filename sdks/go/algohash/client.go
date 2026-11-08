// Package algohash is a typed client for the AlgoHash Studio, Team and Open API MCP servers.
//
// Standard library only. Tool-level failures and "ask the user" states come back as a
// *ToolResult (check Status); only transport and protocol failures return an error.
package algohash

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Params are tool arguments. Typed wrappers add the "action" field for you.
type Params map[string]any

// Status values of a ToolResult.
const (
	StatusOK                = "ok"
	StatusNeedsConfirmation = "needs_confirmation"
	StatusNeedsPermission   = "needs_permission"
	StatusNeedsStoryboard   = "needs_storyboard"
	StatusNeedsCast         = "needs_cast"
	// StatusAwaitingApproval: the account owner has not decided yet on AlgoHash. Nothing ran.
	// Wait again (studio_confirm / team_confirm "wait"), then repeat with the same token.
	StatusAwaitingApproval = "awaiting_approval"
	StatusDeclined         = "declined"
	StatusError            = "error"
)

// MaxBatch is the server's batch limit.
const MaxBatch = 20

var askCodes = map[string]string{
	"needs_confirmation": StatusNeedsConfirmation,
	"needs_permission":   StatusNeedsPermission,
	"needs_storyboard":   StatusNeedsStoryboard,
	"needs_cast":         StatusNeedsCast,
	"cast_pending":       StatusNeedsCast,
	"needs_cast_roles":   StatusNeedsCast,
	"awaiting_approval":  StatusAwaitingApproval,
}

var (
	errRe   = regexp.MustCompile(`^ERROR:\s*([a-z][a-z0-9_]*)(\s*(—|-|:)|$)`)
	askRe   = regexp.MustCompile(`^(needs_[a-z_]+|awaiting_approval)\b`)
	retryRe = regexp.MustCompile(`retry_after_sec=(\d+)`)
)

// Error is a transport / protocol failure, or the error returned by ToolResult.Unwrap.
type Error struct {
	Code          string
	Message       string
	HTTPStatus    int
	RPCCode       int
	RetryAfterSec float64
	Data          any
}

func (e *Error) Error() string { return fmt.Sprintf("algohash: %s: %s", e.Code, e.Message) }

// Retryable reports whether retrying cannot cause a second charge.
func (e *Error) Retryable() bool { return e.Code == "rate_limited" }

// ToolResult is the parsed result of tools/call.
type ToolResult struct {
	Status          string
	Data            any
	Content         []map[string]any
	Text            string
	IsError         bool
	Code            string
	Message         string
	ConfirmToken    string
	PermissionToken string
	FeeHWT          float64
	Summary         string
	// Approval is "user" (only the account owner can approve, on ApproveURL) or "agent".
	Approval string
	// ApproveURL is the AlgoHash page where the user approves (http(s) only).
	ApproveURL      string
	RetryAfterSec   float64
	Next            any
	UntrustedFields []string
	Local           bool
	Raw             map[string]any
}

// OK reports whether the call succeeded.
func (r *ToolResult) OK() bool { return r.Status == StatusOK }

// DataMap returns Data as a map (nil if it is not an object).
func (r *ToolResult) DataMap() map[string]any { m, _ := r.Data.(map[string]any); return m }

// Unwrap returns Data, or an *Error unless the call succeeded.
func (r *ToolResult) Unwrap() (any, error) {
	if r.Status == StatusOK {
		return r.Data, nil
	}
	code := r.Code
	if code == "" {
		code = r.Status
	}
	msg := r.Message
	if msg == "" {
		msg = r.Text
	}
	return nil, &Error{Code: code, Message: msg, RetryAfterSec: r.RetryAfterSec, Data: r.Data}
}

func str(m map[string]any, k string) string { s, _ := m[k].(string); return s }

func parseResult(raw map[string]any, local, declined bool) *ToolResult {
	r := &ToolResult{Raw: raw, Local: local}
	if c, ok := raw["content"].([]any); ok {
		for _, x := range c {
			if m, ok := x.(map[string]any); ok {
				r.Content = append(r.Content, m)
			}
		}
	}
	var texts []string
	for _, c := range r.Content {
		if c["type"] == "text" {
			if t, ok := c["text"].(string); ok {
				texts = append(texts, t)
			}
		}
	}
	r.Text = strings.Join(texts, "\n")
	r.IsError, _ = raw["isError"].(bool)
	r.Data = raw["structuredContent"]
	if r.Data == nil && len(texts) > 0 {
		var v any
		if json.Unmarshal([]byte(texts[0]), &v) == nil {
			r.Data = v
		}
	}
	d, _ := r.Data.(map[string]any)
	if d == nil {
		d = map[string]any{}
	}
	if e := str(d, "error"); e != "" && (d["ok"] == false || r.IsError) {
		r.Code = e
	}
	if r.Code == "" && len(texts) > 0 {
		if m := errRe.FindStringSubmatch(texts[0]); m != nil {
			r.Code = m[1]
		} else if m := askRe.FindStringSubmatch(texts[0]); m != nil {
			r.Code = m[1]
		} else if r.IsError {
			r.Code = "tool_error"
		}
	}
	r.Message = str(d, "message")
	if r.Message == "" && r.Code != "" && len(texts) > 0 {
		r.Message = texts[0]
	}
	r.ConfirmToken = str(d, "confirm_token")
	r.PermissionToken = str(d, "permission_token")
	r.FeeHWT, _ = d["fee_hwt"].(float64)
	r.Summary = str(d, "summary")
	if a := str(d, "approval"); a == "user" || a == "agent" {
		r.Approval = a
	}
	if u := str(d, "approve_url"); strings.HasPrefix(u, "https://") || strings.HasPrefix(u, "http://") {
		r.ApproveURL = u
	}
	if meta, ok := raw["_meta"].(map[string]any); ok {
		r.RetryAfterSec, _ = meta["retry_after_sec"].(float64)
	}
	if r.RetryAfterSec == 0 {
		r.RetryAfterSec, _ = d["retry_after_sec"].(float64)
	}
	if r.RetryAfterSec == 0 {
		if m := retryRe.FindStringSubmatch(r.Text); m != nil {
			r.RetryAfterSec, _ = strconv.ParseFloat(m[1], 64)
		}
	}
	r.Next = d["next"]
	if r.Next == nil {
		for _, t := range texts {
			if strings.HasPrefix(t, "NEXT") {
				r.Next = t
				break
			}
		}
	}
	if uf, ok := d["untrusted_fields"].([]any); ok {
		for _, x := range uf {
			if s, ok := x.(string); ok {
				r.UntrustedFields = append(r.UntrustedFields, s)
			}
		}
	}
	switch {
	case declined:
		r.Status = StatusDeclined
	case askCodes[r.Code] != "":
		r.Status = askCodes[r.Code]
	case r.Code != "" || r.IsError:
		r.Status = StatusError
	default:
		r.Status = StatusOK
	}
	return r
}

// Option configures a Client.
type Option func(*Client)

// WithEndpoint overrides the MCP endpoint (e.g. the local mock server).
func WithEndpoint(u string) Option { return func(c *Client) { c.endpoint = u } }

// WithKeyScopes declares the key's scopes; calls that need more are refused locally.
func WithKeyScopes(s ...string) Option { return func(c *Client) { c.keyScopes = s } }

// WithHTTPClient sets the HTTP client. Redirects are still refused.
func WithHTTPClient(h *http.Client) Option { return func(c *Client) { c.http = h } }

// WithRetryRateLimited sets how many times a rate_limited answer is waited out and retried (default 2).
func WithRetryRateLimited(n int) Option { return func(c *Client) { c.retry = n } }

// WithMaxResponseBytes caps the response body size (default 32 MiB).
func WithMaxResponseBytes(n int64) Option { return func(c *Client) { c.maxBytes = n } }

// WithMaxWaitSec sets how long CallWithApproval waits for the user to decide on AlgoHash
// (approval "user"). Default 300 seconds; tokens live about 5 minutes. On timeout the result has
// Status "awaiting_approval".
func WithMaxWaitSec(sec int) Option {
	return func(c *Client) {
		if sec > 0 {
			c.maxWait = time.Duration(sec) * time.Second
		}
	}
}

// WithHeader adds a request header. Authorization cannot be overridden.
func WithHeader(k, v string) Option { return func(c *Client) { c.headers[k] = v } }

// Client talks to one MCP endpoint. Use NewStudio, NewTeam or NewOpen.
type Client struct {
	server     string
	endpoint   string
	token      string
	keyScopes  []string
	scopes     map[string][]string
	http       *http.Client
	retry      int
	maxBytes   int64
	headers    map[string]string
	protocol   string
	mu         sync.Mutex
	seq        int
	initResult map[string]any
	negotiated string
	buildErr   error
	maxWait    time.Duration
}

// String redacts the key so a client can be logged safely.
func (c *Client) String() string {
	return fmt.Sprintf("algohash.Client(%s, %s, key=[redacted])", c.server, c.endpoint)
}

// GoString redacts the key for %#v.
func (c *Client) GoString() string { return c.String() }

// Format redacts the key for every fmt verb (%v, %+v, %#v, %s).
func (c *Client) Format(f fmt.State, _ rune) { _, _ = io.WriteString(f, c.String()) }

func newClient(server, endpoint, token string, scopes map[string][]string, opts ...Option) *Client {
	c := &Client{server: server, endpoint: endpoint, token: token, scopes: scopes, retry: 2,
		maxBytes: 32 << 20, headers: map[string]string{}, protocol: "2025-11-25", maxWait: 300 * time.Second}
	for _, o := range opts {
		o(c)
	}
	if c.http == nil {
		c.http = &http.Client{Timeout: 120 * time.Second}
	}
	// Never follow redirects: a redirect could carry the Authorization header to another host.
	h := *c.http
	h.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	c.http = &h
	if token == "" {
		c.buildErr = &Error{Code: "missing_api_key", Message: "api key is required"}
	} else if strings.ContainsAny(token, "\r\n\x00") || len(token) > 4096 {
		c.buildErr = &Error{Code: "bad_api_key", Message: "api key contains invalid characters"}
	} else if err := CheckEndpoint(c.endpoint); err != nil {
		c.buildErr = err
	}
	return c
}

// CheckEndpoint returns an error unless the URL is https, or plain http on a loopback address.
func CheckEndpoint(endpoint string) error {
	u, err := url.Parse(endpoint)
	if err != nil {
		return &Error{Code: "bad_endpoint", Message: "endpoint is not a valid URL"}
	}
	if u.User != nil {
		return &Error{Code: "bad_endpoint", Message: "endpoint must not contain credentials"}
	}
	switch {
	case u.Scheme == "https" && u.Host != "":
		return nil
	case u.Scheme == "http" && (u.Hostname() == "localhost" || u.Hostname() == "127.0.0.1" || u.Hostname() == "::1"):
		return nil
	}
	return &Error{Code: "insecure_endpoint", Message: "refusing to send a key over plain http (only https, or http://localhost for testing)"}
}

// Err reports a configuration error (bad key, insecure endpoint). Calls also return it.
func (c *Client) Err() error { return c.buildErr }

func (c *Client) send(ctx context.Context, body any) (any, error) {
	if c.buildErr != nil {
		return nil, c.buildErr
	}
	b, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	for k, v := range c.headers {
		if !strings.EqualFold(k, "authorization") {
			req.Header.Set(k, v)
		}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	c.mu.Lock()
	negotiated := c.negotiated
	c.mu.Unlock()
	if negotiated != "" {
		req.Header.Set("MCP-Protocol-Version", negotiated)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	res, err := c.http.Do(req)
	if err != nil {
		return nil, &Error{Code: "network_error", Message: "request failed: " + err.Error()}
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 && res.StatusCode < 400 {
		return nil, &Error{Code: "redirect_refused", Message: "redirect refused (the key is never sent to another location)", HTTPStatus: res.StatusCode}
	}
	if res.StatusCode == http.StatusAccepted {
		return nil, nil
	}
	data, err := io.ReadAll(io.LimitReader(res.Body, c.maxBytes+1))
	if err != nil {
		return nil, &Error{Code: "network_error", Message: err.Error()}
	}
	if int64(len(data)) > c.maxBytes {
		return nil, &Error{Code: "response_too_large", Message: "response too large"}
	}
	if strings.Contains(res.Header.Get("Content-Type"), "text/event-stream") {
		var last string
		for _, block := range strings.Split(string(data), "\n\n") {
			var lines []string
			for _, l := range strings.Split(block, "\n") {
				if strings.HasPrefix(l, "data:") {
					lines = append(lines, strings.TrimSpace(l[5:]))
				}
			}
			if len(lines) > 0 {
				last = strings.Join(lines, "\n")
			}
		}
		data = []byte(last)
	}
	var out any
	if len(data) > 0 {
		_ = json.Unmarshal(data, &out)
	}
	if res.StatusCode >= 400 {
		e := &Error{HTTPStatus: res.StatusCode, Message: fmt.Sprintf("HTTP %d", res.StatusCode), Data: out}
		switch res.StatusCode {
		case 401:
			e.Code = "invalid_api_key"
		case 429:
			e.Code = "rate_limited"
		default:
			e.Code = fmt.Sprintf("http_%d", res.StatusCode)
		}
		if ra, err := strconv.ParseFloat(res.Header.Get("Retry-After"), 64); err == nil {
			e.RetryAfterSec = ra
		}
		if m, ok := out.(map[string]any); ok {
			if em, ok := m["error"].(map[string]any); ok {
				if s := str(em, "message"); s != "" {
					e.Message = s
				}
				if f, ok := em["code"].(float64); ok {
					e.RPCCode = int(f)
				}
			}
		}
		return nil, e
	}
	return out, nil
}

// RPC sends one JSON-RPC request and returns its result.
func (c *Client) RPC(ctx context.Context, method string, params any) (map[string]any, error) {
	if method != "initialize" {
		if _, err := c.Initialize(ctx); err != nil {
			return nil, err
		}
	}
	c.mu.Lock()
	c.seq++
	id := c.seq
	c.mu.Unlock()
	msg := map[string]any{"jsonrpc": "2.0", "id": id, "method": method}
	if params != nil {
		msg["params"] = params
	}
	out, err := c.send(ctx, msg)
	if err != nil {
		return nil, err
	}
	m, _ := out.(map[string]any)
	if em, ok := m["error"].(map[string]any); ok {
		code, _ := em["code"].(float64)
		e := &Error{RPCCode: int(code), Message: str(em, "message"), Data: em["data"]}
		switch int(code) {
		case -32029:
			e.Code = "rate_limited"
		case -32602:
			e.Code = "invalid_params"
		case -32601:
			e.Code = "method_not_found"
		default:
			e.Code = fmt.Sprintf("rpc_%d", int(code))
		}
		if dm, ok := em["data"].(map[string]any); ok {
			e.RetryAfterSec, _ = dm["retry_after_sec"].(float64)
		}
		return nil, e
	}
	res, _ := m["result"].(map[string]any)
	return res, nil
}

// Initialize negotiates the protocol version. Called automatically before the first request.
func (c *Client) Initialize(ctx context.Context) (map[string]any, error) {
	c.mu.Lock()
	done := c.initResult
	c.mu.Unlock()
	if done != nil {
		return done, nil
	}
	r, err := c.RPC(ctx, "initialize", map[string]any{
		"protocolVersion": c.protocol, "capabilities": map[string]any{},
		"clientInfo": map[string]any{"name": "algohash-mcp-sdk-go", "version": "0.1.0"},
	})
	if err != nil {
		return nil, err
	}
	if r == nil {
		r = map[string]any{}
	}
	c.mu.Lock()
	c.initResult = r
	c.negotiated, _ = r["protocolVersion"].(string)
	c.mu.Unlock()
	_, _ = c.send(ctx, map[string]any{"jsonrpc": "2.0", "method": "notifications/initialized"})
	return r, nil
}

// Instructions returns the server's usage instructions for agents.
func (c *Client) Instructions(ctx context.Context) (string, error) {
	r, err := c.Initialize(ctx)
	if err != nil {
		return "", err
	}
	s, _ := r["instructions"].(string)
	return s, nil
}

// ListTools returns the live tools/list.
func (c *Client) ListTools(ctx context.Context) ([]map[string]any, error) {
	r, err := c.RPC(ctx, "tools/list", nil)
	if err != nil {
		return nil, err
	}
	var out []map[string]any
	if ts, ok := r["tools"].([]any); ok {
		for _, t := range ts {
			if m, ok := t.(map[string]any); ok {
				out = append(out, m)
			}
		}
	}
	return out, nil
}

// RequiredScopes returns the base scopes for tool.action (nil if unknown).
func (c *Client) RequiredScopes(tool, action string) []string { return c.scopes[tool+"."+action] }

// CanCall reports whether scopes cover tool.action. nil scopes = the key's declared scopes.
func (c *Client) CanCall(tool, action string, scopes []string) bool {
	if scopes == nil {
		scopes = c.keyScopes
	}
	need, ok := c.scopes[tool+"."+action]
	if !ok || scopes == nil {
		return true
	}
	for _, n := range need {
		found := false
		for _, s := range scopes {
			if s == n {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// AllowedActions splits every known action into allowed and denied for a scope set.
func (c *Client) AllowedActions(scopes []string) (allowed, denied []string) {
	if scopes == nil {
		scopes = []string{}
	}
	for k := range c.scopes {
		i := strings.LastIndex(k, ".")
		if c.CanCall(k[:i], k[i+1:], scopes) {
			allowed = append(allowed, k)
		} else {
			denied = append(denied, k)
		}
	}
	return
}

// Call invokes a tool. Only rate_limited is ever retried (the server did not run the call).
func (c *Client) Call(ctx context.Context, tool string, args Params) (*ToolResult, error) {
	if args == nil {
		args = Params{}
	}
	action, _ := args["action"].(string)
	if action != "" && !c.CanCall(tool, action, nil) {
		need := c.RequiredScopes(tool, action)
		return parseResult(map[string]any{"isError": true,
			"content":           []any{map[string]any{"type": "text", "text": "ERROR: scope_denied — " + tool + "." + action + " needs [" + strings.Join(need, " + ") + "]"}},
			"structuredContent": map[string]any{"ok": false, "error": "scope_denied"}}, true, false), nil
	}
	tries := c.retry
	for {
		res, err := c.RPC(ctx, "tools/call", map[string]any{"name": tool, "arguments": args})
		var ae *Error
		if err != nil && errors.As(err, &ae) && ae.Code == "rate_limited" && tries > 0 {
			tries--
			if werr := wait(ctx, ae.RetryAfterSec); werr != nil {
				return nil, werr
			}
			continue
		}
		if err != nil {
			return nil, err
		}
		if res == nil {
			res = map[string]any{}
		}
		r := parseResult(res, false, false)
		r.ApproveURL = c.sameOrigin(r.ApproveURL)
		if r.Code == "rate_limited" && tries > 0 {
			tries--
			if werr := wait(ctx, r.RetryAfterSec); werr != nil {
				return nil, werr
			}
			continue
		}
		return r, nil
	}
}

func wait(ctx context.Context, sec float64) error {
	if sec <= 0 {
		sec = 2
	}
	if sec > 30 {
		sec = 30
	}
	t := time.NewTimer(time.Duration(sec * float64(time.Second)))
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}

// CallAction invokes tool with {action, ...p}.
func (c *Client) CallAction(ctx context.Context, tool, action string, p Params) (*ToolResult, error) {
	args := Params{}
	for k, v := range p {
		args[k] = v
	}
	args["action"] = action
	return c.Call(ctx, tool, args)
}

// BatchCall is one entry of a batch.
type BatchCall struct {
	Tool string
	Args Params
}

// Batch sends up to MaxBatch tool calls in one HTTP request. Results keep the input order.
func (c *Client) Batch(ctx context.Context, calls []BatchCall) ([]*ToolResult, error) {
	if len(calls) > MaxBatch {
		return nil, &Error{Code: "batch_too_large", Message: fmt.Sprintf("batch limit is %d calls", MaxBatch)}
	}
	if _, err := c.Initialize(ctx); err != nil {
		return nil, err
	}
	c.mu.Lock()
	base := c.seq
	c.seq += len(calls)
	c.mu.Unlock()
	msgs := make([]any, len(calls))
	for i, bc := range calls {
		a := bc.Args
		if a == nil {
			a = Params{}
		}
		msgs[i] = map[string]any{"jsonrpc": "2.0", "id": base + i + 1, "method": "tools/call", "params": map[string]any{"name": bc.Tool, "arguments": a}}
	}
	out, err := c.send(ctx, msgs)
	if err != nil {
		return nil, err
	}
	byID := map[int]map[string]any{}
	if arr, ok := out.([]any); ok {
		for _, x := range arr {
			if m, ok := x.(map[string]any); ok {
				if f, ok := m["id"].(float64); ok {
					byID[int(f)] = m
				}
			}
		}
	}
	res := make([]*ToolResult, len(calls))
	for i := range calls {
		m := byID[base+i+1]
		if em, ok := m["error"].(map[string]any); ok {
			res[i] = parseResult(map[string]any{"isError": true, "content": []any{map[string]any{"type": "text", "text": "ERROR: rpc_error — " + str(em, "message")}}}, false, false)
			continue
		}
		r, _ := m["result"].(map[string]any)
		if r == nil {
			r = map[string]any{"isError": true, "content": []any{map[string]any{"type": "text", "text": "ERROR: no_response"}}}
		}
		res[i] = parseResult(r, false, false)
		res[i].ApproveURL = c.sameOrigin(res[i].ApproveURL)
	}
	return res, nil
}

// ApprovalRequest describes a step that needs a human yes.
//
// Approval says who may approve:
//   - "user" (when the key owner turned on page approval): only the account owner can approve, on ApproveURL on
//     AlgoHash while signed in. Show the user that link. A "yes" in your app approves nothing;
//     returning true only means "wait for the user on AlgoHash".
//   - "agent" (default; the key setting "Only I can approve paid and risky steps" is off): returning true
//     approves directly, so return true only when a human agreed.
//
// ApproveURL is set only when the link is on the endpoint's own origin.
type ApprovalRequest struct {
	Kind       string // "confirmation" | "permission"
	Tool       string
	Action     string
	Args       Params
	Token      string
	FeeHWT     float64
	Summary    string
	Message    string
	Approval   string // "user" | "agent"
	ApproveURL string
	Result     *ToolResult

	flags *approvalFlags
}

type approvalFlags struct{ waitOnServer bool }

// Approver returns true only when a human agreed (approval "agent"), or, for approval "user",
// after it has shown the user ApproveURL and they want to go ahead. Return false to cancel.
type Approver func(ctx context.Context, req ApprovalRequest) (bool, error)

// CallWithApproval calls a tool and walks needs_permission / needs_confirmation.
// With approval "user" it then waits (WithMaxWaitSec, default 300 s) for the owner to decide on
// AlgoHash. Tokens are single-use and bound to the exact arguments. A "no" returns Status
// "declined"; no decision in time returns Status "awaiting_approval" with the token and link.
func (c *Client) CallWithApproval(ctx context.Context, tool string, args Params, approve Approver) (*ToolResult, error) {
	if approve == nil {
		return nil, &Error{Code: "no_approver", Message: "CallWithApproval needs an Approver"}
	}
	action, _ := args["action"].(string)
	extra := Params{}
	var pending *ApprovalRequest
	const maxRounds = 3
	for round := 0; round <= maxRounds; round++ {
		a := Params{}
		for k, v := range args {
			a[k] = v
		}
		for k, v := range extra {
			a[k] = v
		}
		r, err := c.Call(ctx, tool, a)
		if err != nil {
			return nil, err
		}
		if r.Status == StatusAwaitingApproval && pending != nil && round < maxRounds {
			// The repeat arrived before the owner decided. Wait, then repeat.
			w, err := c.waitDecision(ctx, *pending)
			if err != nil || w != nil {
				return w, err
			}
			continue
		}
		if (r.Status != StatusNeedsConfirmation && r.Status != StatusNeedsPermission) || round == maxRounds {
			return r, nil
		}
		kind, token := "confirmation", r.ConfirmToken
		if r.Status == StatusNeedsPermission {
			kind, token = "permission", r.PermissionToken
		}
		if token == "" {
			return r, nil
		}
		approval := "agent"
		if r.Approval == "user" {
			approval = "user"
		}
		req := ApprovalRequest{Kind: kind, Tool: tool, Action: action, Args: args, Token: token,
			FeeHWT: r.FeeHWT, Summary: r.Summary, Message: r.Message, Approval: approval,
			ApproveURL: c.sameOrigin(r.ApproveURL), Result: r, flags: &approvalFlags{}}
		yes, err := approve(ctx, req)
		if err != nil {
			return nil, err
		}
		if !yes {
			return parseResult(r.Raw, false, true), nil
		}
		if approval == "user" || req.flags.waitOnServer {
			w, err := c.waitDecision(ctx, req)
			if err != nil || w != nil {
				return w, err
			}
		}
		pending = &req
		if kind == "confirmation" {
			extra = Params{"confirm_token": token}
		} else {
			extra = Params{"permission_token": token}
		}
	}
	return nil, &Error{Code: "approval_loop", Message: "approval loop exhausted"}
}

// sameOrigin only hands the approver an approval link on the endpoint's own origin.
func (c *Client) sameOrigin(link string) string {
	if link == "" {
		return ""
	}
	a, err1 := url.Parse(link)
	b, err2 := url.Parse(c.endpoint)
	if err1 != nil || err2 != nil || a.User != nil || (a.Scheme != "https" && a.Scheme != "http") {
		return ""
	}
	if !strings.EqualFold(a.Scheme, b.Scheme) || !strings.EqualFold(a.Host, b.Host) {
		return ""
	}
	return link
}

// waitDecision waits on studio_confirm / team_confirm "wait". It returns (nil, nil) when the
// user approved, or the result to hand back (declined, expired, awaiting_approval).
func (c *Client) waitDecision(ctx context.Context, req ApprovalRequest) (*ToolResult, error) {
	field := "confirm_token"
	if req.Kind == "permission" {
		field = "permission_token"
	}
	deadline := time.Now().Add(c.maxWait)
	for time.Now().Before(deadline) {
		sec := int(time.Until(deadline).Seconds() + 0.999)
		if sec < 5 {
			sec = 5
		}
		if sec > 50 {
			sec = 50
		}
		started := time.Now()
		var w *ToolResult
		var err error
		if c.server == "team" {
			w, err = c.Call(ctx, "team_confirm", Params{"action": "wait", "confirm_token": req.Token, "timeout_sec": sec})
		} else {
			w, err = c.Call(ctx, "studio_confirm", Params{"action": "wait", "args": map[string]any{field: req.Token, "timeout_sec": sec}})
		}
		if err != nil {
			return nil, err
		}
		d := w.DataMap()
		switch str(d, "status") {
		case "decided", "used":
			if str(d, "decision") == "approved" {
				return nil, nil
			}
			return parseResult(req.Result.Raw, false, true), nil
		case "open":
		default:
			if !w.OK() {
				return w, nil
			}
			msg := "The approval request expired or is gone. Make the call again for a new one."
			return parseResult(map[string]any{"isError": true,
				"content":           []any{map[string]any{"type": "text", "text": "ERROR: approval_expired — " + msg}},
				"structuredContent": map[string]any{"ok": false, "error": "approval_expired", "message": msg, "status": str(d, "status")}}, false, false), nil
		}
		// The live server long-polls; never spin if a wait comes back early.
		if time.Since(started) < time.Second {
			if err := wait(ctx, 1); err != nil {
				return nil, err
			}
		}
	}
	sc := map[string]any{"ok": false, "error": "awaiting_approval", "approval": req.Approval, field: req.Token,
		"message": "The user has not decided yet. Wait again, then repeat the call with the same token."}
	if req.ApproveURL != "" {
		sc["approve_url"] = req.ApproveURL
	}
	return parseResult(map[string]any{"isError": false,
		"content":           []any{map[string]any{"type": "text", "text": "awaiting_approval — the user has not decided yet."}},
		"structuredContent": sc}, false, false), nil
}

// CardApprover (Studio only) shows the approval card with studio_confirm.show. CallWithApproval
// then waits for the user's decision with studio_confirm.wait. Use it in MCP-Apps hosts that
// render the card. If the card cannot be shown, fallback (may be nil) is asked instead.
func (c *Client) CardApprover(fallback ...Approver) Approver {
	return func(ctx context.Context, req ApprovalRequest) (bool, error) {
		field := "confirm_token"
		if req.Kind == "permission" {
			field = "permission_token"
		}
		summary := req.Summary
		if summary == "" {
			summary = req.Message
		}
		if summary == "" {
			summary = req.Tool + "." + req.Action
		}
		shown, err := c.Call(ctx, "studio_confirm", Params{"action": "show", "args": map[string]any{field: req.Token, "summary": summary}})
		if err != nil {
			return false, err
		}
		if !shown.OK() {
			if len(fallback) > 0 && fallback[0] != nil {
				return fallback[0](ctx, req)
			}
			return false, nil
		}
		if req.flags != nil {
			req.flags.waitOnServer = true
		}
		return true, nil
	}
}
