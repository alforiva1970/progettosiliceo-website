#!/usr/bin/env python3
"""
Siliceo Agent-Ready CLI Auditor (AGPL-3.0)
Controlla endpoint pubblici llms.txt, robots.txt, ai-catalog.json e Token Noise Ratio.
"""
import ipaddress
import json
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse

from validate_ard import validate_ard_catalog

USER_AGENT = "SiliceoAgentAuditCLI/1.0 (+https://progettosiliceo.online/agent-ready.html)"
AI_BOTS = ["GPTBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Anthropic-AI", "Googlebot"]
MAX_REDIRECTS = 3
_SCHEME_PREFIX_RE = re.compile(r"^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$")
_REDIRECT_CODES = {301, 302, 303, 307, 308}


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Impedisce ad urllib di seguire redirect automaticamente senza validazione."""

    def redirect_request(
        self,
        req: urllib.request.Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> urllib.request.Request | None:
        return None


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


def _is_private_or_metadata_host(hostname: str) -> bool:
    host = hostname.strip().lower().strip("[]").rstrip(".")
    if not host:
        return True
    if (
        host == "localhost"
        or host.endswith(".local")
        or host.endswith(".internal")
        or host.endswith(".localhost")
    ):
        return True
    try:
        ip = ipaddress.ip_address(host)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        )
    except ValueError:
        return False


def normalize_target(raw_url: str) -> tuple[str | None, str | None, str | None]:
    """Normalizza e valida un URL HTTP(S), rifiutando credenziali, spazi e schemi non HTTP."""
    if not isinstance(raw_url, str):
        return None, None, "URL non valido: atteso testo."

    cleaned = raw_url.strip()
    if not cleaned:
        return None, None, "URL vuoto."
    if any(ch.isspace() for ch in cleaned):
        return None, None, "URL non valido: contiene spazi."

    if "://" in cleaned or cleaned.startswith("["):
        candidate = cleaned if "://" in cleaned else f"https://{cleaned}"
    else:
        match = _SCHEME_PREFIX_RE.match(cleaned)
        if match:
            scheme_or_host, remainder = match.group(1), match.group(2)
            authority_head = re.split(r"[/?#]", remainder, maxsplit=1)[0]
            if scheme_or_host.lower() in {"http", "https", "ftp", "file", "javascript", "data", "mailto", "vbscript", "blob"}:
                return None, None, f"Schema URL non supportato: {scheme_or_host}."
            if authority_head.isdigit() or "@" in authority_head:
                candidate = f"https://{cleaned}"
            else:
                return None, None, f"Schema URL non supportato: {scheme_or_host}."
        else:
            candidate = f"https://{cleaned}"

    try:
        parsed = urlparse(candidate)
        _ = parsed.port
    except ValueError as exc:
        return None, None, f"URL non valido: {exc}"

    scheme = parsed.scheme.lower()
    if scheme not in {"http", "https"}:
        return None, None, f"Schema URL non supportato: {scheme or 'vuoto'}."
    if parsed.username is not None or parsed.password is not None or "@" in parsed.netloc:
        return None, None, "Credenziali nell'URL non consentite."
    if not parsed.hostname or not parsed.netloc:
        return None, None, "Host mancante nell'URL."

    origin = f"{scheme}://{parsed.netloc.lower()}"
    normalized = f"{origin}{parsed.path or ''}"
    if parsed.query:
        normalized = f"{normalized}?{parsed.query}"
    return normalized, origin, None


def fetch_url(
    url: str,
    timeout: float = 5.0,
    max_redirects: int = MAX_REDIRECTS,
) -> tuple[int, str, str, str | None, str]:
    """Esegue GET HTTP(S) con redirect validati e limitati a max_redirects hop."""
    normalized_start, start_origin, start_err = normalize_target(url)
    if start_err or normalized_start is None or start_origin is None:
        return 0, "", "", start_err or "URL non valido.", url

    start_host = urlparse(normalized_start).hostname or ""
    start_is_private = _is_private_or_metadata_host(start_host)

    opener = urllib.request.build_opener(_NoRedirectHandler())
    current_url = normalized_start
    current_origin = start_origin

    for _hop in range(max_redirects + 1):
        req = urllib.request.Request(current_url, headers={"User-Agent": USER_AGENT})
        try:
            with opener.open(req, timeout=timeout) as resp:
                ct = resp.headers.get("Content-Type", "")
                body = resp.read(250_000).decode("utf-8", errors="replace")
                return resp.status, ct, body, None, current_origin
        except urllib.error.HTTPError as err:
            ct = err.headers.get("Content-Type", "") if err.headers else ""
            if err.code in _REDIRECT_CODES:
                location = err.headers.get("Location") if err.headers else None
                if not location:
                    return err.code, ct, "", "Redirect senza header Location.", current_origin
                joined = urljoin(current_url, location.strip())
                next_url, next_origin, next_err = normalize_target(joined)
                if next_err or next_url is None or next_origin is None:
                    return 0, "", "", f"Redirect bloccato: {next_err or 'destinazione non valida'}", current_origin
                next_host = urlparse(next_url).hostname or ""
                if _is_private_or_metadata_host(next_host) and (
                    not start_is_private or next_origin != current_origin
                ):
                    return 0, "", "", "Redirect bloccato verso host privato o metadata.", current_origin
                current_url = next_url
                current_origin = next_origin
                continue
            return err.code, ct, "", None, current_origin
        except Exception as exc:
            return 0, "", "", str(exc), current_origin

    return 0, "", "", f"Troppi redirect (>{max_redirects}).", current_origin


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
    normalized, origin, url_error = normalize_target(raw_url)
    if url_error or normalized is None or origin is None:
        return _empty_audit(None, url_error or "URL non valido.")

    home_status, _, home_html, home_err, effective_origin = fetch_url(normalized)
    if home_status == 0:
        return _empty_audit(effective_origin, home_err or "Host non raggiungibile.")

    noise = (
        compute_noise_ratio(home_html)
        if home_status == 200
        else {"html_bytes": 0, "text_bytes": 0, "noise_percent": None}
    )

    llms_status, llms_ct, llms_body, _, _ = fetch_url(f"{effective_origin}/llms.txt")
    llms_ok = (
        llms_status == 200
        and "text/html" not in llms_ct.lower()
        and not llms_body.lstrip().lower().startswith("<!doctype")
    )
    llms_h1 = bool(re.search(r"^#\s+\S+", llms_body, re.MULTILINE)) if llms_ok else False

    robots_status, _, robots_body, _, _ = fetch_url(f"{effective_origin}/robots.txt")
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

    cat_status, _, cat_body, _, _ = fetch_url(f"{effective_origin}/ai-catalog.json")
    cat_valid = False
    if cat_status == 200:
        try:
            cat_valid = len(validate_ard_catalog(json.loads(cat_body))) == 0
        except Exception:
            cat_valid = False

    return {
        "origin": effective_origin,
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
