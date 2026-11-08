"""Core MCP client: transport, result parsing, scope preflight, approval loop.

Standard library only (urllib). Python 3.9+.
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

__all__ = ["AlgoHashError", "ToolResult", "ApprovalRequest", "McpClient", "assert_safe_endpoint"]

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
MAX_BATCH = 20


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Never follow redirects: a redirect could carry the Authorization header to another host."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D401
        raise urllib.error.HTTPError(req.full_url, code, "redirect refused", headers, fp)


_OPENER = urllib.request.build_opener(_NoRedirect)

_ASK = {
    "needs_confirmation": "needs_confirmation",
    "needs_permission": "needs_permission",
    "needs_storyboard": "needs_storyboard",
    "needs_cast": "needs_cast",
    "cast_pending": "needs_cast",
    "needs_cast_roles": "needs_cast",
    "awaiting_approval": "awaiting_approval",
}
_ERR_RE = re.compile(r"^ERROR:\s*([a-z][a-z0-9_]*)(?=\s*(?:—|-|:|$))")
_ASK_RE = re.compile(r"^(needs_[a-z_]+|awaiting_approval)\b")
_RETRY_RE = re.compile(r"retry_after_sec=(\d+)")


def assert_safe_endpoint(endpoint: str) -> None:
    """Raise unless the endpoint is https, or plain http on a loopback address (mock / dev only)."""
    u = urllib.parse.urlsplit(endpoint)
    if u.username or u.password:
        raise AlgoHashError("endpoint must not contain credentials", code="bad_endpoint")
    if u.scheme == "https" and u.hostname:
        return
    if u.scheme == "http" and (u.hostname or "") in _LOCAL_HOSTS:
        return
    raise AlgoHashError("refusing to send a key over plain http (only https, or http://localhost for testing)", code="insecure_endpoint")


class AlgoHashError(Exception):
    """Transport / protocol failure, or ToolResult.unwrap() on a non-ok result."""

    def __init__(self, message: str, *, code: str, http_status: Optional[int] = None,
                 rpc_code: Optional[int] = None, retry_after_sec: Optional[float] = None, data: Any = None) -> None:
        super().__init__(message)
        self.code = code
        self.http_status = http_status
        self.rpc_code = rpc_code
        self.retry_after_sec = retry_after_sec
        self.data = data

    @property
    def retryable(self) -> bool:
        """Safe to retry without risking a second charge."""
        return self.code == "rate_limited"


def _seconds(v: Optional[str]) -> Optional[float]:
    """Retry-After as seconds; None when missing or not a number (an HTTP date is ignored)."""
    try:
        return float(v) if v else None
    except ValueError:
        return None


class ToolResult:
    """Result of tools/call. Check ``status`` — tool-level failures do not raise."""

    def __init__(self, raw: Mapping[str, Any], *, local: bool = False, declined: bool = False) -> None:
        self.raw = raw
        self.local = local
        self.content: List[Dict[str, Any]] = list(raw.get("content") or [])
        texts = [c["text"] for c in self.content if c.get("type") == "text" and isinstance(c.get("text"), str)]
        self.text = "\n".join(texts)
        self.is_error = bool(raw.get("isError"))
        data = raw.get("structuredContent")
        if data is None and texts:
            try:
                data = json.loads(texts[0])
            except ValueError:
                data = None
        self.data = data
        d = data if isinstance(data, dict) else {}
        code = None
        if isinstance(d.get("error"), str) and (d.get("ok") is False or self.is_error):
            code = d["error"]
        if not code and texts:
            m = _ERR_RE.match(texts[0]) or _ASK_RE.match(texts[0])
            if m:
                code = m.group(1)
            elif self.is_error:
                code = "tool_error"
        self.code: Optional[str] = code
        self.message: Optional[str] = d.get("message") if isinstance(d.get("message"), str) else (texts[0] if code and texts else None)
        self.confirm_token: Optional[str] = d.get("confirm_token") if isinstance(d.get("confirm_token"), str) else None
        self.permission_token: Optional[str] = d.get("permission_token") if isinstance(d.get("permission_token"), str) else None
        self.fee_hwt: Optional[float] = d.get("fee_hwt") if isinstance(d.get("fee_hwt"), (int, float)) else None
        self.summary: Optional[str] = d.get("summary") if isinstance(d.get("summary"), str) else None
        # "user": only the account owner can approve, on approve_url. "agent": the agent may pass on a yes.
        self.approval: Optional[str] = d.get("approval") if d.get("approval") in ("user", "agent") else None
        au = d.get("approve_url")
        # AlgoHash page where the user approves (needs_confirmation, needs_permission, awaiting_approval).
        self.approve_url: Optional[str] = au if isinstance(au, str) and re.match(r"^https?://", au) else None
        ra = (raw.get("_meta") or {}).get("retry_after_sec", d.get("retry_after_sec"))
        if ra is None:
            m = _RETRY_RE.search(self.text)
            ra = m.group(1) if m else None
        self.retry_after_sec: Optional[float] = float(ra) if ra is not None else None
        self.next = d.get("next") or next((t for t in texts if t.startswith("NEXT")), None)
        uf = d.get("untrusted_fields")
        self.untrusted_fields: Optional[List[str]] = list(uf) if isinstance(uf, list) else None
        if declined:
            self.status = "declined"
        elif code and code in _ASK:
            self.status = _ASK[code]
        elif code or self.is_error:
            self.status = "error"
        else:
            self.status = "ok"

    @property
    def ok(self) -> bool:
        return self.status == "ok"

    @property
    def images(self) -> List[Dict[str, Any]]:
        return [c for c in self.content if c.get("type") == "image"]

    @property
    def links(self) -> List[Dict[str, Any]]:
        return [c for c in self.content if c.get("type") == "resource_link"]

    def unwrap(self) -> Any:
        """Return ``data`` or raise AlgoHashError."""
        if self.status == "ok":
            return self.data
        raise AlgoHashError(self.message or self.text or self.status, code=self.code or self.status,
                            retry_after_sec=self.retry_after_sec, data=self.data)

    def __repr__(self) -> str:
        return f"ToolResult(status={self.status!r}, code={self.code!r})"


class ApprovalRequest:
    """One approval step, handed to your approver.

    ``approval`` says who may approve:

    * ``"user"`` (when the key owner turned on page approval): only the account owner can approve, on ``approve_url``
      on AlgoHash while signed in. Show the user that link. A "yes" in your app does not approve
      anything; returning True only means "wait for the user on AlgoHash".
    * ``"agent"`` (default; the key setting "Only I can approve paid and risky steps" is off): returning True
      approves directly, so return True only when a human agreed.

    ``approve_url`` is set only when the link is on the endpoint's own origin.
    """

    def __init__(self, *, kind: str, tool: str, action: str, args: Dict[str, Any], token: str,
                 fee_hwt: Optional[float], summary: Optional[str], message: Optional[str], result: ToolResult,
                 approval: str = "agent", approve_url: Optional[str] = None) -> None:
        self.kind = kind            # "confirmation" | "permission"
        self.tool = tool
        self.action = action
        self.args = args
        self.token = token
        self.fee_hwt = fee_hwt
        self.summary = summary
        self.message = message
        self.result = result
        self.approval = approval    # "user" | "agent"
        self.approve_url = approve_url


# Return True only if a human agreed (approval "agent"), or, for approval "user", after you have
# shown them approve_url and they want to go ahead. Return False to cancel.
Approver = Callable[[ApprovalRequest], bool]


class McpClient:
    """Generic client for one AlgoHash MCP endpoint. Use StudioClient / TeamClient / OpenClient."""

    def __init__(self, *, server: str, endpoint: str, api_key: Optional[str] = None, access_token: Optional[str] = None,
                 key_scopes: Optional[Sequence[str]] = None, protocol_version: str = "2025-11-25",
                 client_info: Optional[Dict[str, str]] = None, timeout: float = 120.0, retry_rate_limited: int = 2,
                 headers: Optional[Dict[str, str]] = None, action_scopes: Optional[Mapping[str, Tuple[str, ...]]] = None,
                 max_response_bytes: int = 32 * 1024 * 1024) -> None:
        if not api_key and not access_token:
            raise AlgoHashError("api_key or access_token is required", code="missing_api_key")
        tok = str(access_token or api_key)
        if any(c in tok for c in "\r\n\0") or len(tok) > 4096:
            raise AlgoHashError("api key / token contains invalid characters", code="bad_api_key")
        assert_safe_endpoint(endpoint)
        self._max_bytes = max_response_bytes
        self.server = server
        self.endpoint = endpoint
        self.__token = tok  # name-mangled; never shown by repr()
        self.key_scopes = list(key_scopes) if key_scopes is not None else None
        self._protocol = protocol_version
        self._client_info = client_info or {"name": "algohash-mcp-sdk-python", "version": "0.1.0"}
        self._timeout = timeout
        self._retry = retry_rate_limited
        self._headers = headers or {}
        self._scopes = dict(action_scopes or {})
        self._seq = 0
        self._init: Optional[Dict[str, Any]] = None
        self._negotiated: Optional[str] = None

    # ── transport ─────────────────────────────────────────────────────────
    def send(self, body: Any) -> Any:
        headers = {
            **{k: v for k, v in self._headers.items() if k.lower() != "authorization"},
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            **({"MCP-Protocol-Version": self._negotiated} if self._negotiated else {}),
            "Authorization": f"Bearer {self.__token}",
        }
        req = urllib.request.Request(self.endpoint, data=json.dumps(body).encode(), headers=headers, method="POST")
        try:
            with _OPENER.open(req, timeout=self._timeout) as res:
                raw = res.read(self._max_bytes + 1)
                if len(raw) > self._max_bytes:
                    raise AlgoHashError("response too large", code="response_too_large")
                status, ctype, text = res.status, res.headers.get("Content-Type", ""), raw.decode("utf-8")
        except urllib.error.HTTPError as e:
            if 300 <= e.code < 400:
                raise AlgoHashError("redirect refused (the key is never sent to another location)", code="redirect_refused",
                                    http_status=e.code) from None
            text = (e.read(self._max_bytes) if e.fp else b"").decode("utf-8", "replace")
            try:
                j = json.loads(text)
            except ValueError:
                j = None
            err = (j or {}).get("error") if isinstance(j, dict) else None
            err = err if isinstance(err, dict) else {}
            code = {401: "invalid_api_key", 429: "rate_limited"}.get(e.code, f"http_{e.code}")
            retry = e.headers.get("Retry-After")
            raise AlgoHashError(err.get("message") or f"HTTP {e.code}", code=code, http_status=e.code, rpc_code=err.get("code"),
                                retry_after_sec=_seconds(retry),
                                data={"body": j, "www_authenticate": e.headers.get("WWW-Authenticate")}) from None
        except (urllib.error.URLError, OSError) as e:
            raise AlgoHashError(f"request failed: {e}", code="network_error") from None
        if status == 202 or not text:
            return None
        if "text/event-stream" in ctype:
            events = ["\n".join(l[5:].strip() for l in block.split("\n") if l.startswith("data:")) for block in text.split("\n\n")]
            events = [e for e in events if e]
            try:
                return json.loads(events[-1]) if events else None
            except ValueError:
                raise AlgoHashError("the server sent an event that is not JSON", code="bad_response", http_status=status) from None
        try:
            return json.loads(text)
        except ValueError:
            raise AlgoHashError("the server sent a body that is not JSON", code="bad_response", http_status=status) from None

    def rpc(self, method: str, params: Any = None) -> Any:
        if method != "initialize":
            self.initialize()
        self._seq += 1
        msg: Dict[str, Any] = {"jsonrpc": "2.0", "id": self._seq, "method": method}
        if params is not None:
            msg["params"] = params
        out = self.send(msg)
        if isinstance(out, dict) and out.get("error"):
            e = out["error"]
            c = e.get("code")
            code = {-32029: "rate_limited", -32602: "invalid_params", -32601: "method_not_found"}.get(c, f"rpc_{c}")
            raise AlgoHashError(e.get("message") or "JSON-RPC error", code=code, rpc_code=c,
                                retry_after_sec=(e.get("data") or {}).get("retry_after_sec"), data=e.get("data"))
        return (out or {}).get("result")

    def initialize(self) -> Dict[str, Any]:
        """Negotiate the protocol version. Called automatically before the first request."""
        if self._init is None:
            r = self.rpc("initialize", {"protocolVersion": self._protocol, "capabilities": {}, "clientInfo": self._client_info})
            self._negotiated = (r or {}).get("protocolVersion")
            self._init = r or {}
            try:
                self.send({"jsonrpc": "2.0", "method": "notifications/initialized"})
            except AlgoHashError:
                pass
        return self._init

    def __repr__(self) -> str:
        return f"{type(self).__name__}(server={self.server!r}, endpoint={self.endpoint!r}, key=[redacted])"

    def __getstate__(self):  # refuse pickling: it would serialize the key
        raise TypeError("clients hold a secret key and cannot be pickled")

    def instructions(self) -> str:
        return self.initialize().get("instructions", "")

    def ping(self) -> None:
        self.rpc("ping")

    def list_tools(self) -> List[Dict[str, Any]]:
        return (self.rpc("tools/list") or {}).get("tools", [])

    # ── scopes ────────────────────────────────────────────────────────────
    def required_scopes(self, tool: str, action: str = "") -> Optional[Tuple[str, ...]]:
        return self._scopes.get(f"{tool}.{action}")

    def can_call(self, tool: str, action: str, scopes: Optional[Iterable[str]] = None) -> bool:
        scopes = self.key_scopes if scopes is None else list(scopes)
        need = self.required_scopes(tool, action)
        if need is None or scopes is None:
            return True
        return all(s in scopes for s in need)

    def allowed_actions(self, scopes: Optional[Iterable[str]] = None) -> Dict[str, List[str]]:
        scopes = list(self.key_scopes or []) if scopes is None else list(scopes)
        out: Dict[str, List[str]] = {"allowed": [], "denied": []}
        for k, need in self._scopes.items():
            out["allowed" if all(s in scopes for s in need) else "denied"].append(k)
        return out

    # ── calls ─────────────────────────────────────────────────────────────
    def call(self, tool: str, args: Optional[Dict[str, Any]] = None, *, retry_rate_limited: Optional[int] = None) -> ToolResult:
        """Call a tool. Only ``rate_limited`` is ever retried (the server did not run the call)."""
        args = dict(args or {})
        action = args.get("action") if isinstance(args.get("action"), str) else ""
        if action and not self.can_call(tool, action):
            need = list(self.required_scopes(tool, action) or ())
            return ToolResult({"isError": True,
                               "content": [{"type": "text", "text": f"ERROR: scope_denied — {tool}.{action} needs [{' + '.join(need)}]"}],
                               "structuredContent": {"ok": False, "error": "scope_denied", "needs": need, "have": self.key_scopes}},
                              local=True)
        tries = self._retry if retry_rate_limited is None else retry_rate_limited
        while True:
            try:
                r = ToolResult(self.rpc("tools/call", {"name": tool, "arguments": args}) or {})
                r.approve_url = self._same_origin(r.approve_url)
            except AlgoHashError as e:
                if e.code == "rate_limited" and tries > 0:
                    tries -= 1
                    time.sleep(min(30.0, e.retry_after_sec or 2.0))
                    continue
                raise
            if r.code == "rate_limited" and tries > 0:
                tries -= 1
                time.sleep(min(30.0, r.retry_after_sec or 2.0))
                continue
            return r

    def call_action(self, tool: str, action: str, params: Optional[Dict[str, Any]] = None) -> ToolResult:
        return self.call(tool, {**(params or {}), "action": action})

    def batch(self, calls: Sequence[Tuple[str, Dict[str, Any]]]) -> List[ToolResult]:
        """Send several tool calls in one HTTP request (server limit: 20). Order is preserved."""
        if len(calls) > MAX_BATCH:
            raise AlgoHashError(f"batch limit is {MAX_BATCH} calls", code="batch_too_large")
        self.initialize()
        msgs = []
        for tool, args in calls:
            self._seq += 1
            msgs.append({"jsonrpc": "2.0", "id": self._seq, "method": "tools/call", "params": {"name": tool, "arguments": args or {}}})
        out = self.send(msgs) or []
        by_id = {m.get("id"): m for m in out}
        res = []
        for m in msgs:
            r = by_id.get(m["id"])
            if r and r.get("error"):
                res.append(ToolResult({"isError": True, "content": [{"type": "text", "text": f"ERROR: rpc_{r['error'].get('code')} — {r['error'].get('message')}"}]}))
            else:
                tr = ToolResult((r or {}).get("result") or {"isError": True, "content": [{"type": "text", "text": "ERROR: no_response"}]})
                tr.approve_url = self._same_origin(tr.approve_url)
                res.append(tr)
        return res

    def call_with_approval(self, tool: str, args: Dict[str, Any], *, approve: Optional[Approver] = None,
                           card: bool = False, max_rounds: int = 3, max_wait_sec: float = 300) -> ToolResult:
        """Call a tool and walk needs_permission / needs_confirmation.

        ``approve`` must return True only when a human agreed (see ApprovalRequest). With approval
        "user" the SDK then waits up to ``max_wait_sec`` for the owner to decide on AlgoHash. Tokens
        are single-use and bound to the exact arguments, so each repeat is identical apart from the
        token. A "no" returns status "declined"; no decision in time returns status
        "awaiting_approval" with the token and approve_url, so you can wait again later.
        """
        if approve is None and not (card and self.server == "studio"):
            raise AlgoHashError("call_with_approval needs approve= (or card=True on Studio)", code="no_approver")
        action = args.get("action", "")
        extra: Dict[str, Any] = {}
        pending: Optional[ApprovalRequest] = None
        for rnd in range(max_rounds + 1):
            r = self.call(tool, {**args, **extra})
            if r.status == "awaiting_approval" and pending is not None and rnd < max_rounds:
                # The repeat arrived before the owner decided. Wait, then repeat.
                w = self._wait_decision(pending, max_wait_sec)
                if w is not True:
                    return w  # type: ignore[return-value]
                continue
            if r.status not in ("needs_confirmation", "needs_permission") or rnd == max_rounds:
                return r
            kind = "confirmation" if r.status == "needs_confirmation" else "permission"
            token = r.confirm_token if kind == "confirmation" else r.permission_token
            if not token:
                return r
            req = ApprovalRequest(kind=kind, tool=tool, action=action, args=args, token=token, fee_hwt=r.fee_hwt,
                                  summary=r.summary, message=r.message, result=r,
                                  approval="user" if r.approval == "user" else "agent",
                                  approve_url=self._same_origin(r.approve_url))
            if card and self.server == "studio":
                w = self._card_decision(req, approve, max_wait_sec)
                if w is not True:
                    return w  # type: ignore[return-value]
            else:
                if not approve(req):  # type: ignore[misc]
                    return ToolResult(r.raw, declined=True)
                if req.approval == "user":
                    w = self._wait_decision(req, max_wait_sec)
                    if w is not True:
                        return w  # type: ignore[return-value]
            pending = req
            extra = {"confirm_token": token} if kind == "confirmation" else {"permission_token": token}
        raise AlgoHashError("approval loop exhausted", code="approval_loop")

    def _same_origin(self, url: Optional[str]) -> Optional[str]:
        """Only hand the approver an approval link on the endpoint's own origin, never one elsewhere."""
        if not url:
            return None
        try:
            a, b = urllib.parse.urlsplit(url), urllib.parse.urlsplit(self.endpoint)
            same = (a.scheme.lower(), (a.hostname or "").lower(), a.port) == (b.scheme.lower(), (b.hostname or "").lower(), b.port)
        except ValueError:
            return None
        return url if same and a.scheme.lower() in ("http", "https") and not a.username and not a.password else None

    def _card_decision(self, req: ApprovalRequest, fallback: Optional[Approver], max_wait_sec: float) -> Any:
        """Studio: render the approval card, then wait for the user's decision."""
        field = "confirm_token" if req.kind == "confirmation" else "permission_token"
        shown = self.call("studio_confirm", {"action": "show", "args": {field: req.token, "summary": req.summary or req.message or f"{req.tool}.{req.action}"}})
        if not shown.ok:
            # No card: fall back to the approver (it shows approve_url for approval "user").
            if not fallback or not fallback(req):
                return ToolResult(req.result.raw, declined=True)
            # Approval "agent": the yes is enough, there is no page decision to wait for.
            if req.approval != "user":
                return True
        return self._wait_decision(req, max_wait_sec)

    def _wait_decision(self, req: ApprovalRequest, max_wait_sec: float) -> Any:
        """Wait on *_confirm.wait. Returns True when approved, else a ToolResult to hand back."""
        field = "confirm_token" if req.kind == "confirmation" else "permission_token"
        deadline = time.monotonic() + max(1.0, float(max_wait_sec))
        wait_tool = "team_confirm" if self.server == "team" else "studio_confirm"
        while time.monotonic() < deadline:
            sec = int(max(5, min(50, -(-(deadline - time.monotonic()) // 1))))
            started = time.monotonic()
            if self.server == "team":
                w = self.call(wait_tool, {"action": "wait", "confirm_token": req.token, "timeout_sec": sec})
            else:
                w = self.call(wait_tool, {"action": "wait", "args": {field: req.token, "timeout_sec": sec}})
            d = w.data if isinstance(w.data, dict) else {}
            st = d.get("status")
            if st in ("decided", "used"):
                return True if d.get("decision") == "approved" else ToolResult(req.result.raw, declined=True)
            if st != "open":
                if not w.ok:
                    return w
                msg = "The approval request expired or is gone. Make the call again for a new one."
                return ToolResult({"isError": True, "content": [{"type": "text", "text": f"ERROR: approval_expired — {msg}"}],
                                   "structuredContent": {"ok": False, "error": "approval_expired", "message": msg, "status": st}})
            # The live server long-polls; never spin if a wait comes back early.
            if time.monotonic() - started < 1.0:
                time.sleep(1.0)
        sc: Dict[str, Any] = {"ok": False, "error": "awaiting_approval", "approval": req.approval, field: req.token,
                              "message": "The user has not decided yet. Wait again, then repeat the call with the same token."}
        if req.approve_url:
            sc["approve_url"] = req.approve_url
        return ToolResult({"isError": False, "content": [{"type": "text", "text": "awaiting_approval — the user has not decided yet."}],
                           "structuredContent": sc})
