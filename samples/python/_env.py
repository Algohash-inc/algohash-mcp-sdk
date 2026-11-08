"""Shared setup for the samples.

ALGOHASH_MOCK=1          -> talk to tools/mock-server.mjs on 127.0.0.1:8787 with mock keys
ALGOHASH_STUDIO_KEY etc. -> real keys (never hard-code them)
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "sdks" / "python"))
from algohash_mcp import OpenClient, StudioClient, TeamClient  # noqa: E402

MOCK = os.environ.get("ALGOHASH_MOCK") == "1"
MOCK_BASE = os.environ.get("ALGOHASH_MOCK_URL", "http://127.0.0.1:8787")


def _key(name, mock_key):
    if MOCK:
        return mock_key
    v = os.environ.get(name)
    if not v:
        sys.exit(f"Set {name} (or ALGOHASH_MOCK=1 to use the local mock server).")
    return v


def _scopes(name):
    v = os.environ.get(name)
    return [s.strip() for s in v.split(",")] if v else None


def studio():
    kw = {"endpoint": MOCK_BASE + "/mcp/studio"} if MOCK else {}
    return StudioClient(_key("ALGOHASH_STUDIO_KEY", "smk_mock_read_edit_spend"), key_scopes=_scopes("ALGOHASH_STUDIO_SCOPES"), **kw)


def team():
    kw = {"endpoint": MOCK_BASE + "/mcp/team"} if MOCK else {}
    return TeamClient(_key("ALGOHASH_TEAM_KEY", "tmk_mock_read_edit_spend"), key_scopes=_scopes("ALGOHASH_TEAM_SCOPES"), **kw)


def open_client():
    kw = {"endpoint": MOCK_BASE + "/open/v1/mcp"} if MOCK else {}
    return OpenClient(_key("ALGOHASH_OPEN_KEY", "ahk_mock"), **kw)


def ask_human(q):
    """True only for an explicit "y". Non-interactive runs are declined, except mock + ALGOHASH_MOCK_AUTO_APPROVE=1.

    approval "user" (when the key owner turned on page approval): the owner approves on AlgoHash at q.approve_url, so print the link.
    """
    if q.kind == "confirmation":
        text = f"Spend {q.fee_hwt} HWT on {q.tool}.{q.action}? {q.summary or ''}"
    else:
        text = f"Allow {q.tool}.{q.action}? {q.message or ''}"
    if getattr(q, "approval", None) == "user":
        # The owner approves on AlgoHash; "y" here only means "wait for my decision there".
        link = getattr(q, "approve_url", None) or "open AlgoHash → approvals"
        text += f"\nApprove or decline on AlgoHash (signed in): {link}\nWait for your decision there?"
    if MOCK and os.environ.get("ALGOHASH_MOCK_AUTO_APPROVE") == "1":
        print(f"[mock auto-approve] {text}")
        return True
    if not sys.stdin.isatty():
        print(f"[declined: no terminal to ask] {text}")
        return False
    return input(f"{text}\n[y/N] ").strip().lower() == "y"


class Ask:
    """Minimal ApprovalRequest-like object for asking about non-token steps."""

    def __init__(self, kind, tool, action, message=None, fee_hwt=None):
        self.kind, self.tool, self.action, self.message, self.fee_hwt, self.summary = kind, tool, action, message, fee_hwt, None


def show(label, r):
    detail = str(r.data)[:300] if r.status == "ok" else (r.message or "")
    print(f"{label}: {r.status}{f' ({r.code})' if r.code else ''} {detail}")
