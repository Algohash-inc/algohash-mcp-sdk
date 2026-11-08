"""Transport-safety guarantees. These must never regress."""
import http.server
import json
import pickle
import sys
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from algohash_mcp import AlgoHashError, McpClient, StudioClient  # noqa: E402
from algohash_mcp.client import assert_safe_endpoint  # noqa: E402

KEY = "smk_mock_secret_value_do_not_print"


def serve(handler_fn):
    class H(http.server.BaseHTTPRequestHandler):
        def do_POST(self):
            handler_fn(self)

        def log_message(self, *a):
            pass
    srv = http.server.HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/mcp"


class SecurityTest(unittest.TestCase):
    def test_foreign_approve_links_dropped_from_results(self):
        links = []

        def h(req):
            m = json.loads(req.rfile.read(int(req.headers["Content-Length"])))
            port = req.server.server_address[1]
            url = [f"http://127.0.0.1:{port}/mcp/studio/approve/mca_ok", "https://evil.example/approve",
                   f"http://user@127.0.0.1:{port}/approve"][len(links)] if m.get("method") == "tools/call" else None
            if url:
                links.append(url)
            body = {"jsonrpc": "2.0", "id": m.get("id"),
                    "result": {"structuredContent": {"ok": False, "error": "awaiting_approval", "approval": "user", "approve_url": url}}
                    if url else {"protocolVersion": "2025-11-25"}}
            raw = json.dumps(body).encode()
            req.send_response(200)
            req.send_header("Content-Type", "application/json")
            req.send_header("Content-Length", str(len(raw)))
            req.end_headers()
            req.wfile.write(raw)
        srv, url = serve(h)
        try:
            c = McpClient(server="studio", api_key=KEY, endpoint=url + "/studio")
            got = [c.call("studio", {"action": "list_assets"}).approve_url for _ in range(3)]
        finally:
            srv.shutdown()
        self.assertEqual(got, [links[0], None, None])

    def test_retry_after_http_date_does_not_crash(self):
        def h(req):
            req.rfile.read(int(req.headers["Content-Length"]))
            req.send_response(429)
            req.send_header("Retry-After", "Wed, 21 Oct 2026 07:28:00 GMT")
            req.send_header("Content-Length", "0")
            req.end_headers()
        srv, url = serve(h)
        try:
            with self.assertRaises(AlgoHashError) as cm:
                McpClient(server="studio", api_key=KEY, endpoint=url, retry_rate_limited=0).initialize()
        finally:
            srv.shutdown()
        self.assertEqual(cm.exception.code, "rate_limited")
        self.assertIsNone(cm.exception.retry_after_sec)

    def test_plain_http_refused(self):
        with self.assertRaises(AlgoHashError) as cm:
            StudioClient(KEY, endpoint="http://example.com/mcp/studio")
        self.assertEqual(cm.exception.code, "insecure_endpoint")

    def test_safe_endpoints(self):
        assert_safe_endpoint("https://console.algohash.ai/mcp/studio")
        assert_safe_endpoint("http://127.0.0.1:8787/mcp/studio")
        with self.assertRaises(AlgoHashError):
            assert_safe_endpoint("https://u:p@console.algohash.ai/mcp/studio")

    def test_crlf_key_refused(self):
        with self.assertRaises(AlgoHashError) as cm:
            StudioClient("smk_x\r\nX-Evil: 1")
        self.assertEqual(cm.exception.code, "bad_api_key")

    def test_key_not_in_repr_or_vars(self):
        c = StudioClient(KEY)
        self.assertNotIn(KEY, repr(c))
        self.assertNotIn(KEY, str(c))
        with self.assertRaises(TypeError):
            pickle.dumps(c)

    def test_custom_header_cannot_override_auth(self):
        seen = {}

        def h(req):
            seen["auth"] = req.headers.get("Authorization")
            body = json.dumps({"jsonrpc": "2.0", "id": 1, "result": {"protocolVersion": "2025-11-25"}}).encode()
            req.send_response(200)
            req.send_header("Content-Type", "application/json")
            req.send_header("Content-Length", str(len(body)))
            req.end_headers()
            req.wfile.write(body)
        srv, url = serve(h)
        try:
            McpClient(server="studio", endpoint=url, api_key=KEY, headers={"Authorization": "Bearer attacker"}).initialize()
        finally:
            srv.shutdown()
        self.assertEqual(seen["auth"], f"Bearer {KEY}")

    def test_redirect_not_followed(self):
        hits = []
        tsrv, turl = serve(lambda r: hits.append(r.headers.get("Authorization")))

        def h(req):
            req.send_response(307)
            req.send_header("Location", turl + "/steal")
            req.send_header("Content-Length", "0")
            req.end_headers()
        srv, url = serve(h)
        try:
            with self.assertRaises(AlgoHashError) as cm:
                McpClient(server="studio", endpoint=url, api_key=KEY).initialize()
            self.assertEqual(cm.exception.code, "redirect_refused")
        finally:
            srv.shutdown()
            tsrv.shutdown()
        self.assertEqual(hits, [])

    def test_oversized_response(self):
        def h(req):
            body = b"x" * 4096
            req.send_response(200)
            req.send_header("Content-Length", str(len(body)))
            req.end_headers()
            req.wfile.write(body)
        srv, url = serve(h)
        try:
            with self.assertRaises(AlgoHashError) as cm:
                McpClient(server="studio", endpoint=url, api_key=KEY, max_response_bytes=1024).initialize()
            self.assertEqual(cm.exception.code, "response_too_large")
        finally:
            srv.shutdown()

    def test_batch_limit(self):
        with self.assertRaises(AlgoHashError) as cm:
            StudioClient(KEY, endpoint="http://127.0.0.1:1/mcp/studio").batch([("studio", {})] * 21)
        self.assertEqual(cm.exception.code, "batch_too_large")

    def test_no_approver(self):
        with self.assertRaises(AlgoHashError) as cm:
            StudioClient(KEY).call_with_approval("studio", {"action": "generate_image"})
        self.assertEqual(cm.exception.code, "no_approver")

    def test_no_decide_wrapper(self):
        c = StudioClient(KEY)
        self.assertFalse(hasattr(c.confirm, "decide"))
        self.assertTrue(hasattr(c.confirm, "show"))


if __name__ == "__main__":
    unittest.main()
