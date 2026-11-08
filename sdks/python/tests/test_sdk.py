"""Runs the SDK against tools/mock-server.mjs (no network, no key, no charges)."""
import os
import re
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from algohash_mcp import AlgoHashError, OpenClient, StudioClient, TeamClient  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]


class SdkTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proc = subprocess.Popen(["node", str(ROOT / "tools/mock-server.mjs")], env={**os.environ, "PORT": "0"},
                                    stdout=subprocess.PIPE, text=True)
        line = cls.proc.stdout.readline()
        cls.base = re.search(r"http://[\d.]+:\d+", line).group(0)

    @classmethod
    def tearDownClass(cls):
        cls.proc.kill()
        cls.proc.stdout.close()
        cls.proc.wait()

    def studio(self, key, **kw):
        return StudioClient(key, endpoint=self.base + "/mcp/studio", **kw)

    def test_initialize(self):
        self.assertEqual(self.studio("smk_mock_read").initialize()["protocolVersion"], "2025-11-25")

    def test_list_tools(self):
        self.assertEqual(len(self.studio("smk_mock_read").list_tools()), 22)

    def test_read_ok(self):
        r = self.studio("smk_mock_read").core.list_assets(pillar="avatars")
        self.assertEqual(r.status, "ok")
        self.assertEqual(r.data["action"], "list_assets")

    def test_scope_denied(self):
        r = self.studio("smk_mock_read").create.storyboard(args={"prompt": "x"})
        self.assertEqual((r.status, r.code, r.local), ("error", "scope_denied", False))
        with self.assertRaises(AlgoHashError):
            r.unwrap()

    def test_local_preflight(self):
        r = self.studio("smk_mock_read", key_scopes=["read"]).create.storyboard_draw(version="v1")
        self.assertEqual((r.code, r.local), ("scope_denied", True))

    def test_allowed_actions(self):
        m = self.studio("smk_mock_read").allowed_actions(["read"])
        self.assertIn("studio.list_assets", m["allowed"])
        self.assertEqual(len(m["allowed"]) + len(m["denied"]), 329)

    def test_needs_confirmation(self):
        r = self.studio("smk_mock_read_edit_spend").create.storyboard_draw(version="v1")
        self.assertEqual(r.status, "needs_confirmation")
        self.assertTrue(r.confirm_token)
        self.assertEqual(r.fee_hwt, 120)

    def test_approval_yes(self):
        seen = []
        r = self.studio("smk_mock_read_edit_spend").call_with_approval(
            "studio_create", {"action": "storyboard_draw", "version": "v1"}, approve=lambda q: seen.append(q.kind) or True)
        self.assertEqual(r.status, "ok")
        self.assertEqual(seen, ["confirmation"])

    def test_approval_no(self):
        r = self.studio("smk_mock_read_edit_spend").call_with_approval(
            "studio_create", {"action": "storyboard_draw", "version": "v2"}, approve=lambda q: False)
        self.assertEqual(r.status, "declined")

    def test_token_bound_to_args(self):
        # Owner approval off: the token is usable at once, so only the argument binding stops it.
        # (With owner approval on, an unapproved token answers awaiting_approval first.)
        s = self.studio("smk_mock_read_edit_spend_agentapproval")
        q = s.create.storyboard_draw(version="v3")
        self.assertEqual(s.create.storyboard_draw(version="v4", confirm_token=q.confirm_token).code, "confirm_invalid")

    def test_permission_then_quote(self):
        kinds = []
        r = self.studio("smk_mock_all").call_with_approval(
            "studio", {"action": "blog_generate", "topic": "x", "confirm": True}, approve=lambda q: kinds.append(q.kind) or True)
        self.assertEqual(r.status, "ok")
        self.assertEqual(kinds, ["permission", "confirmation"])

    def test_card(self):
        r = self.studio("smk_mock_read_edit_spend").call_with_approval(
            "studio_create", {"action": "storyboard_draw", "version": "v5"}, card=True)
        self.assertEqual(r.status, "ok")

    def test_rate_limited(self):
        r = self.studio("smk_mock_read_ratelimited", retry_rate_limited=1).core.list_assets()
        self.assertEqual((r.code, r.retry_after_sec), ("rate_limited", 1.0))

    def test_bad_key(self):
        with self.assertRaises(AlgoHashError) as cm:
            self.studio("nope").list_tools()
        self.assertEqual((cm.exception.code, cm.exception.http_status), ("invalid_api_key", 401))

    def test_batch(self):
        rs = self.studio("smk_mock_read").batch([("studio", {"action": "list_assets"}), ("studio_outputs", {"action": "get"})])
        self.assertEqual([r.data["action"] for r in rs], ["list_assets", "get"])

    def test_team(self):
        t = TeamClient("tmk_mock_read_edit_spend", endpoint=self.base + "/mcp/team")
        self.assertEqual(t.core.overview().status, "ok")
        r = t.call_with_approval("team_deploy", {"action": "deploy", "room_id": 1, "args": {"goal": "x"}}, approve=lambda q: True)
        self.assertEqual(r.status, "ok")

    def test_open(self):
        o = OpenClient("ahk_mock", endpoint=self.base + "/open/v1/mcp")
        self.assertEqual(o.list_models(kind="image").data["models"][0]["op"], "image.sample")
        self.assertEqual(o.quote(op="image.sample").data["price_hwt"], 40)
        j = o.generate(op="image.sample", inputs={"prompt": "x"})
        self.assertEqual(o.job_status(job_id=j.data["job_id"]).data["status"], "completed")
        self.assertEqual(o.balance().data["balance_hwt"], 10000)


if __name__ == "__main__":
    unittest.main()
