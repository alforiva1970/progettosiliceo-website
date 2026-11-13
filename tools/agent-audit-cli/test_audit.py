import json
import socket
import subprocess
import sys
import threading
import unittest
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Iterator

from siliceo_audit import (
    audit_origin,
    compute_noise_ratio,
    extract_visible_text,
    fetch_url,
    normalize_target,
)

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
                b"User-agent: GPTBot\r\nDisallow: /\r\n\r\n"
                b"User-agent: ClaudeBot\r\nDisallow: /\r\n\r\n"
                b"User-agent: Googlebot\r\nAllow: /\r\n"
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


def _make_custom_handler(routes: dict[str, tuple[int, dict[str, str], bytes]]) -> type[BaseHTTPRequestHandler]:
    class _CustomHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            route = routes.get(self.path)
            if route is None:
                self.send_response(404)
                self.end_headers()
                return
            status, headers, body = route
            self.send_response(status)
            for k, v in headers.items():
                self.send_header(k, v)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if body:
                self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:
            return

    return _CustomHandler


@contextmanager
def _run_server(handler_cls: type[BaseHTTPRequestHandler]) -> Iterator[int]:
    server = HTTPServer(("127.0.0.1", 0), handler_cls)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield port
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


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

    def test_normalize_target_handles_schemeless_port_query_and_rejects_credentials(self):
        norm, origin, err = normalize_target("example.com")
        self.assertIsNone(err)
        self.assertEqual(norm, "https://example.com")
        self.assertEqual(origin, "https://example.com")

        norm2, origin2, err2 = normalize_target("Example.COM:8080?foo=bar")
        self.assertIsNone(err2)
        self.assertEqual(origin2, "https://example.com:8080")
        self.assertEqual(norm2, "https://example.com:8080?foo=bar")

        for cred_url in ["user:pass@example.com", "https://user:pass@example.com", "https://user@example.com"]:
            n, o, e = normalize_target(cred_url)
            self.assertIsNone(n)
            self.assertIsNone(o)
            self.assertIn("Credenziali", e or "")

    def test_audit_origin_rejects_invalid_and_non_http_inputs_cleanly(self):
        for bad in [
            "",
            "   ",
            "ftp://example.com",
            "javascript:alert(1)",
            "http://[::1]:badport",
            "https://user:pass@example.com",
        ]:
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

    def test_audit_origin_against_real_local_http_server_with_crlf_robots(self):
        with _run_server(_LocalAuditHandler) as port:
            res = audit_origin(f"  http://127.0.0.1:{port}  ")

        self.assertEqual(res["origin"], f"http://127.0.0.1:{port}")
        self.assertIsNone(res.get("error"))
        self.assertEqual(res["homepage_status"], 200)
        self.assertIsInstance(res["noise"]["noise_percent"], float)
        self.assertEqual(res["llms_txt"], {"status": 200, "present": True, "has_h1": True})
        self.assertEqual(res["robots_txt"]["status"], 200)
        self.assertEqual(res["robots_txt"]["blocked_ai_bots"], ["GPTBot", "ClaudeBot"])
        self.assertEqual(res["ai_catalog"], {"status": 200, "valid_ard": True})

    def test_audit_origin_handles_non_200_html_llms_no_h1_and_bad_catalogs(self):
        # Case A: Homepage 503 + HTML-disguised llms.txt (text/html) + invalid JSON catalog
        handler_a = _make_custom_handler({
            "/": (503, {"Content-Type": "text/html"}, b"<h1>Maintenance</h1>"),
            "/llms.txt": (200, {"Content-Type": "text/html"}, b"# Fake HTML"),
            "/ai-catalog.json": (200, {"Content-Type": "application/json"}, b"{bad json"),
        })
        with _run_server(handler_a) as port:
            res_a = audit_origin(f"http://127.0.0.1:{port}")

        self.assertEqual(res_a["homepage_status"], 503)
        self.assertEqual(res_a["error"], "Homepage HTTP 503")
        self.assertIsNone(res_a["noise"]["noise_percent"])
        self.assertEqual(res_a["llms_txt"], {"status": 200, "present": False, "has_h1": False})
        self.assertEqual(res_a["ai_catalog"], {"status": 200, "valid_ard": False})

        # Case B: <!doctype disguised llms.txt without text/html header + valid JSON invalid ARD schema
        handler_b = _make_custom_handler({
            "/": (200, {"Content-Type": "text/html"}, b"<html><body>Ok</body></html>"),
            "/llms.txt": (200, {"Content-Type": "text/plain"}, b"<!DOCTYPE html><html>404</html>"),
            "/ai-catalog.json": (200, {"Content-Type": "application/json"}, b'{"entries": []}'),
        })
        with _run_server(handler_b) as port:
            res_b = audit_origin(f"http://127.0.0.1:{port}")
        self.assertEqual(res_b["llms_txt"], {"status": 200, "present": False, "has_h1": False})
        self.assertEqual(res_b["ai_catalog"], {"status": 200, "valid_ard": False})

        # Case C: plain-text llms.txt without H1 heading
        handler_c = _make_custom_handler({
            "/": (200, {"Content-Type": "text/html"}, b"<html><body>Ok</body></html>"),
            "/llms.txt": (200, {"Content-Type": "text/plain"}, b"No heading here\nJust text"),
        })
        with _run_server(handler_c) as port:
            res_c = audit_origin(f"http://127.0.0.1:{port}")
        self.assertEqual(res_c["llms_txt"], {"status": 200, "present": True, "has_h1": False})

    def test_fetch_url_validates_redirects_and_blocks_unsafe_or_excessive_hops(self):
        # 1. Valid bounded redirect (2 hops)
        handler_ok = _make_custom_handler({
            "/": (302, {"Location": "/step1"}, b""),
            "/step1": (301, {"Location": "/final"}, b""),
            "/final": (200, {"Content-Type": "text/plain"}, b"ok"),
        })
        with _run_server(handler_ok) as port:
            status, _, body, err, final_origin = fetch_url(f"http://127.0.0.1:{port}/")
        self.assertEqual(status, 200)
        self.assertEqual(body, "ok")
        self.assertIsNone(err)
        self.assertEqual(final_origin, f"http://127.0.0.1:{port}")

        # 2. Excessive redirect loop (> 3 hops)
        handler_loop = _make_custom_handler({
            "/": (302, {"Location": "/"}, b""),
        })
        with _run_server(handler_loop) as port:
            status, _, _, err, _ = fetch_url(f"http://127.0.0.1:{port}/")
        self.assertEqual(status, 0)
        self.assertIn("Troppi redirect", err or "")

        # 3. Redirect to non-http scheme (ftp://)
        handler_ftp = _make_custom_handler({
            "/": (302, {"Location": "ftp://evil.example/file"}, b""),
        })
        with _run_server(handler_ftp) as port:
            status, _, _, err, _ = fetch_url(f"http://127.0.0.1:{port}/")
        self.assertEqual(status, 0)
        self.assertIn("Redirect bloccato", err or "")

        # 4. Redirect to metadata IP (169.254.169.254)
        handler_meta = _make_custom_handler({
            "/": (302, {"Location": "http://169.254.169.254/latest/meta-data/"}, b""),
        })
        with _run_server(handler_meta) as port:
            status, _, _, err, _ = fetch_url(f"http://127.0.0.1:{port}/")
        self.assertEqual(status, 0)
        self.assertIn("Redirect bloccato", err or "")

    def test_cli_exit_codes_and_json_output(self):
        script_path = Path(__file__).resolve().parent / "siliceo_audit.py"
        usage_proc = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(usage_proc.returncode, 2)

        with _run_server(_LocalAuditHandler) as port:
            ok_proc = subprocess.run(
                [sys.executable, str(script_path), f"http://127.0.0.1:{port}"],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(ok_proc.returncode, 0)
        payload = json.loads(ok_proc.stdout)
        self.assertEqual(payload["homepage_status"], 200)
        self.assertTrue(payload["ai_catalog"]["valid_ard"])

    def test_build_observatory_snapshot_webmcp_positive_and_unreachable_opt_in(self):
        handler_webmcp = _make_custom_handler({
            "/": (
                200,
                {"Content-Type": "text/html"},
                b"<html><body><script>navigator.modelContext.registerTool({})</script></body></html>",
            ),
            "/llms.txt": (200, {"Content-Type": "text/plain"}, b"# WebMCP Site\n"),
        })
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind(("127.0.0.1", 0))
            closed_port = sock.getsockname()[1]

        with _run_server(handler_webmcp) as port:
            snapshot = build_observatory_snapshot(
                {"Test Sector": [f"http://127.0.0.1:{port}"]},
                [
                    {"domain": f"http://127.0.0.1:{port}", "label": "Reachable WebMCP"},
                    {"domain": f"https://127.0.0.1:{port}", "label": "Scheme Mismatch"},
                    {"domain": f"http://127.0.0.1:{closed_port}", "label": "Down Site"},
                    {"domain": "http://[::1]:badport", "label": "Malformed"},
                ],
            )

        self.assertEqual(
            snapshot["title"],
            "Osservatorio Indipendente Navigazione Agentica — Benchmark empirico a cura del Laboratorio di Ricerca Progetto Siliceo",
        )
        self.assertEqual(snapshot["title"], OBSERVATORY_TITLE)
        self.assertEqual(len(snapshot["sectors"]), 1)
        self.assertEqual(snapshot["sectors"][0]["sampleSize"], 1)
        self.assertEqual(snapshot["sectors"][0]["llmsTxtValidPct"], 100.0)
        self.assertEqual(snapshot["sectors"][0]["aiCatalogValidPct"], 0.0)

        self.assertEqual(len(snapshot["optInShowcase"]), 4)
        live_entry, scheme_mismatch_entry, down_entry, bad_entry = snapshot["optInShowcase"]

        self.assertTrue(live_entry["reachable"])
        self.assertIsNone(live_entry["error"])
        self.assertTrue(live_entry["llmsTxt"])
        self.assertFalse(live_entry["aiCatalog"])
        self.assertTrue(live_entry["webMcp"])

        self.assertFalse(scheme_mismatch_entry["reachable"])
        self.assertTrue(isinstance(scheme_mismatch_entry["error"], str) and len(scheme_mismatch_entry["error"]) > 0)
        self.assertFalse(scheme_mismatch_entry["llmsTxt"])

        self.assertFalse(down_entry["reachable"])
        self.assertTrue(isinstance(down_entry["error"], str) and len(down_entry["error"]) > 0)
        self.assertFalse(down_entry["llmsTxt"])
        self.assertFalse(down_entry["webMcp"])

        self.assertFalse(bad_entry["reachable"])
        self.assertTrue(isinstance(bad_entry["error"], str) and len(bad_entry["error"]) > 0)


if __name__ == "__main__":
    unittest.main()
