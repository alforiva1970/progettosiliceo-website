#!/usr/bin/env python3
"""
Siliceo Agent-Ready CLI Auditor (AGPL-3.0)
Controlla endpoint pubblici llms.txt, robots.txt, ai-catalog.json e Token Noise Ratio.
"""
import json
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse

from validate_ard import validate_ard_catalog

USER_AGENT = "SiliceoAgentAuditCLI/1.0 (+https://progettosiliceo.online/agent-ready.html)"
AI_BOTS = ["GPTBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Anthropic-AI", "Googlebot"]
_SCHEME_PREFIX_RE = re.compile(r"^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$")


class _TextExtractor(HTMLParser):
    """Estrae testo visibile da HTML ignorando script, style, noscript e svg."""

    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self.chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style", "noscript", "svg"}:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "noscript", "svg"} and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            stripped = " ".join(data.split())
            if stripped:
                self.chunks.append(stripped)


def extract_visible_text(html: str) -> str:
    """Restituisce il testo visibile normalizzato contenuto in un documento HTML."""
    parser = _TextExtractor()
    parser.feed(html)
    parser.close()
    return " ".join(parser.chunks)


def compute_noise_ratio(html: str) -> dict[str, Any]:
    """Calcola byte HTML totali, byte di testo visibile e percentuale di rumore."""
    html_bytes = len(html.encode("utf-8"))
    text = extract_visible_text(html)
    text_bytes = len(text.encode("utf-8"))
    noise_percent = (
        round(((html_bytes - text_bytes) / html_bytes) * 100.0, 1)
        if html_bytes > 0
        else 0.0
    )
    return {
        "html_bytes": html_bytes,
        "text_bytes": text_bytes,
        "noise_percent": noise_percent,
    }


def _fetch(url: str, timeout: float = 5.0) -> tuple[int, str, str, str | None]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            ct = resp.headers.get("Content-Type", "")
            body = resp.read(250_000).decode("utf-8", errors="replace")
            return resp.status, ct, body, None
    except urllib.error.HTTPError as err:
        ct = err.headers.get("Content-Type", "") if err.headers else ""
        return err.code, ct, "", None
    except Exception as exc:
        return 0, "", "", str(exc)


def _normalize_target(raw_url: str) -> tuple[str | None, str | None, str | None]:
    if not isinstance(raw_url, str):
        return None, None, "URL non valido: atteso testo."

    cleaned = raw_url.strip()
    if not cleaned:
        return None, None, "URL vuoto."
    if any(ch.isspace() for ch in cleaned):
        return None, None, "URL non valido: contiene spazi."

    if "://" in cleaned:
        candidate = cleaned
    else:
        match = _SCHEME_PREFIX_RE.match(cleaned)
        if match and not match.group(2).split("/", 1)[0].isdigit():
            return None, None, f"Schema URL non supportato: {match.group(1)}."
        candidate = f"https://{cleaned}"

    try:
        parsed = urlparse(candidate)
        _ = parsed.port
    except ValueError as exc:
        return None, None, f"URL non valido: {exc}"

    scheme = parsed.scheme.lower()
    if scheme not in {"http", "https"}:
        return None, None, f"Schema URL non supportato: {scheme or 'vuoto'}."
    if not parsed.hostname or not parsed.netloc:
        return None, None, "Host mancante nell'URL."

    origin = f"{scheme}://{parsed.netloc}"
    normalized = f"{origin}{parsed.path or ''}"
    if parsed.query:
        normalized = f"{normalized}?{parsed.query}"
    return normalized, origin, None


def _empty_audit(origin: str | None, error: str | None) -> dict[str, Any]:
    return {
        "origin": origin,
        "error": error,
        "homepage_status": 0,
        "noise": {"html_bytes": 0, "text_bytes": 0, "noise_percent": None},
        "llms_txt": {"status": 0, "present": False, "has_h1": False},
        "robots_txt": {"status": 0, "blocked_ai_bots": []},
        "ai_catalog": {"status": 0, "valid_ard": False},
    }


def audit_origin(raw_url: str) -> dict[str, Any]:
    """Esegue l'audit pubblico di un origin su homepage, llms.txt, robots.txt e ai-catalog.json."""
    normalized, origin, url_error = _normalize_target(raw_url)
    if url_error or normalized is None or origin is None:
        return _empty_audit(None, url_error or "URL non valido.")

    home_status, _, home_html, home_err = _fetch(normalized)
    if home_status == 0:
        return _empty_audit(origin, home_err or "Host non raggiungibile.")

    noise = (
        compute_noise_ratio(home_html)
        if home_status == 200
        else {"html_bytes": 0, "text_bytes": 0, "noise_percent": None}
    )

    llms_status, llms_ct, llms_body, _ = _fetch(f"{origin}/llms.txt")
    llms_ok = (
        llms_status == 200
        and "text/html" not in llms_ct.lower()
        and not llms_body.lstrip().lower().startswith("<!doctype")
    )
    llms_h1 = bool(re.search(r"^#\s+\S+", llms_body, re.MULTILINE)) if llms_ok else False

    robots_status, _, robots_body, _ = _fetch(f"{origin}/robots.txt")
    blocked_bots: list[str] = []
    if robots_status == 200:
        normalized_robots = robots_body.replace("\r\n", "\n")
        for bot in AI_BOTS:
            pattern = re.compile(
                rf"User-agent:\s*{re.escape(bot)}\s*\nDisallow:\s*/\s*$",
                re.IGNORECASE | re.MULTILINE,
            )
            if pattern.search(normalized_robots):
                blocked_bots.append(bot)

    cat_status, _, cat_body, _ = _fetch(f"{origin}/ai-catalog.json")
    cat_valid = False
    if cat_status == 200:
        try:
            cat_valid = len(validate_ard_catalog(json.loads(cat_body))) == 0
        except Exception:
            cat_valid = False

    return {
        "origin": origin,
        "error": None if home_status == 200 else f"Homepage HTTP {home_status}",
        "homepage_status": home_status,
        "noise": noise,
        "llms_txt": {"status": llms_status, "present": llms_ok, "has_h1": llms_h1},
        "robots_txt": {"status": robots_status, "blocked_ai_bots": blocked_bots},
        "ai_catalog": {"status": cat_status, "valid_ard": cat_valid},
    }


def main() -> int:
    """Entrypoint CLI per eseguire l'audit JSON su stdout."""
    if len(sys.argv) < 2:
        print("Uso: python3 siliceo_audit.py <url>", file=sys.stderr)
        return 2
    report = audit_origin(sys.argv[1])
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
