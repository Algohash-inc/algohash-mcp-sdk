"""Owner approval on AlgoHash ("Only I can approve paid and risky steps", approval "user").

The mock runs with MOCK_APPROVE_VIA_PAGE=1: nothing is approved until the approve_url is opened.
"""
import os
import re
import subprocess
import sys
import threading
import unittest
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from algohash_mcp import StudioClient, TeamClient  # noqa: E402
from algohash_mcp.client import McpClient  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
KEY = "smk_mock_read_edit_spend"


def user_opens(url, decision=None):
    def go():
        urllib.request.urlopen(url + (f"?decision={decision}" if decision else ""), timeout=10).read()
    threading.Timer(0.3, go).start()


class ApprovalTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proc = subprocess.Popen(["node", str(ROOT / "tools/mock-server.mjs")],
                                    env={**os.environ, "PORT": "0", "MOCK_APPROVE_VIA_PAGE": "1"},
                                    stdout=subprocess.PIPE, text=True)
        cls.base = re.search(r"http://[\d.]+:\d+", cls.proc.stdout.readline()).group(0)

    @classmethod
    def tearDownClass(cls):
        cls.proc.kill()
        cls.proc.stdout.close()
        cls.proc.wait()

    def studio(self, key=KEY):
        return StudioClient(key, endpoint=self.base + "/mcp/studio")

    def test_quote_has_user_approval_and_link(self):
        r = self.studio().create.storyboard_draw(version="p1")
        self.assertEqual((r.status, r.approval), ("needs_confirmation", "user"))
        self.assertTrue(r.approve_url.startswith(self.base + "/approve/"))

    def test_early_repeat_awaiting(self):
        s = self.studio()
        q = s.create.storyboard_draw(version="p2")
        r = s.create.storyboard_draw(version="p2", confirm_token=q.confirm_token)
        self.assertEqual(r.status, "awaiting_approval")
        self.assertFalse(r.is_error)
        self.assertEqual(r.approve_url, q.approve_url)

    def test_key_cannot_self_approve(self):
        s = self.studio()
        q = s.create.storyboard_draw(version="p3")
        d = s.call("studio_confirm", {"action": "decide", "args": {"confirm_token": q.confirm_token, "decision": "approve"}})
        self.assertEqual(d.data["status"], "user_required")
        self.assertEqual(s.create.storyboard_draw(version="p3", confirm_token=q.confirm_token).status, "awaiting_approval")

    def test_owner_approves(self):
        seen = []

        def approve(q):
            seen.append(q)
            user_opens(q.approve_url)
            return True
        r = self.studio().call_with_approval("studio_create", {"action": "storyboard_draw", "version": "p4"}, approve=approve)
        self.assertEqual(r.status, "ok")
        self.assertEqual([q.approval for q in seen], ["user"])

    def test_owner_declines(self):
        def approve(q):
            user_opens(q.approve_url, "decline")
            return True
        r = self.studio().call_with_approval("studio_create", {"action": "storyboard_draw", "version": "p5"}, approve=approve)
        self.assertEqual(r.status, "declined")

    def test_timeout_returns_awaiting(self):
        r = self.studio().call_with_approval("studio_create", {"action": "storyboard_draw", "version": "p6"},
                                             approve=lambda q: True, max_wait_sec=2)
        self.assertEqual(r.status, "awaiting_approval")
        self.assertTrue(r.approve_url and r.confirm_token)

    def test_approver_no(self):
        r = self.studio().call_with_approval("studio_create", {"action": "storyboard_draw", "version": "p7"}, approve=lambda q: False)
        self.assertEqual(r.status, "declined")

    def test_agent_approval_key(self):
        seen = []
        r = self.studio(KEY + "_agentapproval").call_with_approval(
            "studio_create", {"action": "storyboard_draw", "version": "p8"}, approve=lambda q: seen.append(q) or True)
        self.assertEqual(r.status, "ok")
        self.assertEqual((seen[0].approval, seen[0].approve_url), ("agent", None))

    def test_team_wait(self):
        t = TeamClient("tmk_mock_read_edit_spend", endpoint=self.base + "/mcp/team")

        def approve(q):
            user_opens(q.approve_url)
            return True
        r = t.call_with_approval("team_deploy", {"action": "deploy", "room_id": 1, "args": {"goal": "x"}}, approve=approve)
        self.assertEqual(r.status, "ok")


class ForeignLinkTest(unittest.TestCase):
    def test_other_origin_link_dropped(self):
        c = McpClient(server="studio", endpoint="https://console.algohash.ai/mcp/studio", api_key=KEY + "_x")
        self.assertIsNone(c._same_origin("https://approve.example.org/phish"))
        self.assertIsNone(c._same_origin("http://console.algohash.ai/approve/x"))
        self.assertIsNone(c._same_origin("https://user@console.algohash.ai/approve/x"))
        self.assertIsNone(c._same_origin("javascript:alert(1)"))
        self.assertEqual(c._same_origin("https://console.algohash.ai/approve/x"), "https://console.algohash.ai/approve/x")


if __name__ == "__main__":
    unittest.main()
