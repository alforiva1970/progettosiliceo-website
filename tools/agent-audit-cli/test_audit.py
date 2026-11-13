import json
import socket
import subprocess
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from siliceo_audit import audit_origin, compute_noise_ratio, extract_visible_text

OBSERVATORY_DIR = Path(__file__).resolve().parents[1] / "observatory"
if str(OBSERVATORY_DIR) not in sys.path:
    sys.path.insert(0, str(OBSERVATORY_DIR))

from update_observatory import OBSERVATORY_TITLE, build_observatory_snapshot  # noqa: E402


class _LocalAuditHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/":
            body = (
                "<html><head><style>body{margin:0}</style><script>console.log(1)</script></head>"
                "<body><h1>Siliceo</h1><p>Contenuto visibile</p></body></html>"
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/llms.txt":
            body = b"# Progetto Siliceo\n> Documentazione agentica\n"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/robots.txt":
            body = (
                b"User-agent: GPTBot\nDisallow: /\n\n"
                b"User-agent: ClaudeBot\nDisallow: /\n\n"
                b"User-agent: Googlebot\nAllow: /\n"
            )
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/ai-catalog.json":
            catalog = {
                "specVersion": "1.0.0",
                "entries": [
                    {
                        "identifier": "urn:air:progettosiliceo:tools:local-test",
                        "displayName": "Local Test",
                        "type": "application/ai-catalog+json",
                        "url": "https://progettosiliceo.online/agent-ready.html",
                    }
                ],
            }
            body = json.dumps(catalog).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format: str, *args: object) -> None:
        return


class TestSiliceoAuditCli(unittest.TestCase):
    def test_extract_visible_text_strips_scripts_styles_and_tags(self):
        html = (
            "<html><head><style>.a{color:red}</style>"
            "<script>alert(1)</script></head>"
            "<body><h1>Ciao</h1><p>Mondo</p></body></html>"
        )
        text = extract_visible_text(html)
        self.assertNotIn("alert", text)
        self.assertNotIn("color:red", text)
        self.assertEqual(text, "Ciao Mondo")

    def test_extract_visible_text_strips_svg_and_noscript(self):
        html = (
            "<div>Prima<svg><path d='M0 0'/><text>SVG</text></svg>"
            "<noscript>Enable JS</noscript>Dopo</div>"
        )
        text = extract_visible_text(html)
        self.assertEqual(text, "Prima Dopo")

    def test_compute_noise_ratio_calculates_exact_percentages(self):
        html = "<div><span>Test</span></div>" + (" " * 50)
        stats = compute_noise_ratio(html)
        self.assertGreater(stats["html_bytes"], stats["text_bytes"])
        self.assertTrue(0.0 <= stats["noise_percent"] <= 100.0)

    def test_compute_noise_ratio_handles_empty_html(self):
        stats = compute_noise_ratio("")
        self.assertEqual(stats, {"html_bytes": 0, "text_bytes": 0, "noise_percent": 0.0})

    def test_audit_origin_rejects_invalid_and_non_http_inputs_cleanly(self):
        for bad in ["", "   ", "ftp://example.com", "javascript:alert(1)", "http://[::1]:badport"]:
            res = audit_origin(bad)
            self.assertIsNone(res["origin"])
            self.assertEqual(res["homepage_status"], 0)
            self.assertIsNone(res["noise"]["noise_percent"])
            self.assertFalse(res["llms_txt"]["present"])
            self.assertFalse(res["ai_catalog"]["valid_ard"])
            self.assertTrue(isinstance(res.get("error"), str) and len(res["error"]) > 0)

    def test_audit_origin_unreachable_host_fails_cleanly(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind(("127.0.0.1", 0))
            closed_port = sock.getsockname()[1]

        res = audit_origin(f"http://127.0.0.1:{closed_port}")
        self.assertEqual(res["origin"], f"http://127.0.0.1:{closed_port}")
        self.assertEqual(res["homepage_status"], 0)
        self.assertIsNone(res["noise"]["noise_percent"])
        self.assertFalse(res["llms_txt"]["present"])
        self.assertFalse(res["ai_catalog"]["valid_ard"])
        self.assertTrue(isinstance(res.get("error"), str) and len(res["error"]) > 0)

    def test_audit_origin_against_real_local_http_server(self):
        server = HTTPServer(("127.0.0.1", 0), _LocalAuditHandler)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            res = audit_origin(f"  http://127.0.0.1:{port}  ")
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        self.assertEqual(res["origin"], f"http://127.0.0.1:{port}")
        self.assertIsNone(res.get("error"))
        self.assertEqual(res["homepage_status"], 200)
        self.assertIsInstance(res["noise"]["noise_percent"], float)
        self.assertEqual(res["llms_txt"], {"status": 200, "present": True, "has_h1": True})
        self.assertEqual(res["robots_txt"]["status"], 200)
        self.assertEqual(res["robots_txt"]["blocked_ai_bots"], ["GPTBot", "ClaudeBot"])
        self.assertEqual(res["ai_catalog"], {"status": 200, "valid_ard": True})

    def test_cli_exit_codes_and_json_output(self):
        script_path = Path(__file__).resolve().parent / "siliceo_audit.py"
        usage_proc = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(usage_proc.returncode, 2)

        server = HTTPServer(("127.0.0.1", 0), _LocalAuditHandler)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            ok_proc = subprocess.run(
                [sys.executable, str(script_path), f"http://127.0.0.1:{port}"],
                capture_output=True,
                text=True,
                check=False,
            )
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        self.assertEqual(ok_proc.returncode, 0)
        payload = json.loads(ok_proc.stdout)
        self.assertEqual(payload["homepage_status"], 200)
        self.assertTrue(payload["ai_catalog"]["valid_ard"])

    def test_build_observatory_snapshot_uses_mandated_title_and_live_probe(self):
        server = HTTPServer(("127.0.0.1", 0), _LocalAuditHandler)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            snapshot = build_observatory_snapshot(
                {"Test Sector": [f"http://127.0.0.1:{port}"]},
                [{"domain": f"http://127.0.0.1:{port}", "label": "Local Test"}],
            )
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        self.assertEqual(
            snapshot["title"],
            "Osservatorio Indipendente Navigazione Agentica — Benchmark empirico a cura del Laboratorio di Ricerca Progetto Siliceo",
        )
        self.assertEqual(snapshot["title"], OBSERVATORY_TITLE)
        self.assertEqual(len(snapshot["sectors"]), 1)
        self.assertEqual(snapshot["sectors"][0]["sampleSize"], 1)
        self.assertEqual(snapshot["sectors"][0]["llmsTxtValidPct"], 100.0)
        self.assertEqual(snapshot["sectors"][0]["aiCatalogValidPct"], 100.0)
        self.assertEqual(len(snapshot["optInShowcase"]), 1)
        self.assertTrue(snapshot["optInShowcase"][0]["llmsTxt"])
        self.assertTrue(snapshot["optInShowcase"][0]["aiCatalog"])
        self.assertFalse(snapshot["optInShowcase"][0]["webMcp"])


if __name__ == "__main__":
    unittest.main()
