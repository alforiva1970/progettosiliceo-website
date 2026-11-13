#!/usr/bin/env python3
"""
Aggiorna data/observatory.json aggregando statistiche anonime per settore su endpoint pubblici.
Nessun nome di terzi non consenzienti viene esposto nei risultati aggregati.
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CLI_DIR = ROOT / "tools" / "agent-audit-cli"
if str(CLI_DIR) not in sys.path:
    sys.path.insert(0, str(CLI_DIR))

from siliceo_audit import audit_origin, fetch_url, normalize_target  # noqa: E402

OBSERVATORY_TITLE = (
    "Osservatorio Indipendente Navigazione Agentica — "
    "Benchmark empirico a cura del Laboratorio di Ricerca Progetto Siliceo"
)
_WEBMCP_MARKER_RE = re.compile(r"navigator\.modelContext|\btoolname\s*=", re.IGNORECASE)


def _probe_webmcp(origin: str) -> bool:
    for path in ("/", "/agent-ready.html"):
        status, ct, body, _, _ = fetch_url(f"{origin}{path}")
        if status == 200 and "html" in ct.lower() and _WEBMCP_MARKER_RE.search(body):
            return True
    return False


def build_observatory_snapshot(
    samples: dict[str, list[str]],
    opt_in_domains: list[dict[str, Any]],
) -> dict[str, Any]:
    """Aggrega rilevazioni live per settore e aggiorna la vetrina opt-in senza dati finti."""
    sectors: list[dict[str, Any]] = []
    audits_by_origin: dict[str, dict[str, Any]] = {}

    for sector_name, urls in samples.items():
        if not urls:
            continue
        audits: list[dict[str, Any]] = []
        for raw_url in urls:
            _, req_origin, _ = normalize_target(raw_url)
            audit = audit_origin(raw_url)
            audits.append(audit)
            if req_origin:
                audits_by_origin[req_origin] = audit
            if audit.get("origin"):
                audits_by_origin[audit["origin"]] = audit

        reachable = [a for a in audits if a["homepage_status"] == 200]
        total = len(reachable)
        if total == 0:
            continue
        llms_count = sum(
            1 for a in reachable if a["llms_txt"]["present"] and a["llms_txt"]["has_h1"]
        )
        ard_count = sum(1 for a in reachable if a["ai_catalog"]["valid_ard"])
        noises = [
            a["noise"]["noise_percent"]
            for a in reachable
            if a["noise"]["noise_percent"] is not None
        ]
        avg_noise = round(sum(noises) / len(noises), 1) if noises else None
        sectors.append({
            "sector": sector_name,
            "sampleSize": total,
            "llmsTxtValidPct": round((llms_count / total) * 100, 1),
            "aiCatalogValidPct": round((ard_count / total) * 100, 1),
            "avgHtmlNoisePct": avg_noise,
        })

    resolved_opt_in: list[dict[str, Any]] = []
    for entry in opt_in_domains:
        domain = str(entry.get("domain", "")).strip()
        if not domain:
            continue

        item = dict(entry)
        _, req_origin, url_err = normalize_target(domain)
        if url_err or req_origin is None:
            item["reachable"] = False
            item["error"] = url_err or "URL non valido."
            item["llmsTxt"] = False
            item["aiCatalog"] = False
            item["webMcp"] = False
            resolved_opt_in.append(item)
            continue

        audit = audits_by_origin.get(req_origin) or audit_origin(req_origin)
        effective_origin = audit.get("origin")
        is_reachable = audit["homepage_status"] == 200
        web_mcp_live = (
            _probe_webmcp(effective_origin)
            if is_reachable and effective_origin
            else False
        )

        item["reachable"] = is_reachable
        item["error"] = None if is_reachable else (audit.get("error") or "Host non raggiungibile.")
        item["llmsTxt"] = bool(
            is_reachable and audit["llms_txt"]["present"] and audit["llms_txt"]["has_h1"]
        )
        item["aiCatalog"] = bool(is_reachable and audit["ai_catalog"]["valid_ard"])
        item["webMcp"] = web_mcp_live
        resolved_opt_in.append(item)

    return {
        "title": OBSERVATORY_TITLE,
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "methodology": (
            "Rilevazione automatica da endpoint pubblici standard "
            "(/llms.txt, /robots.txt, /ai-catalog.json) senza cookie ne autenticazione. "
            "Statistiche aggregate per settore; vetrina singoli domini esclusivamente opt-in."
        ),
        "sectors": sectors,
        "optInShowcase": resolved_opt_in,
    }


def main() -> int:
    default_opt_in = [
        {
            "domain": "progettosiliceo.online",
            "label": "Progetto Siliceo (Caso Studio Vivente)",
            "notes": "Baseline Pietra & Candela v2.0 — rilevazione live da endpoint pubblici",
        }
    ]
    out_path = ROOT / "data" / "observatory.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    snapshot = build_observatory_snapshot(
        {"Ricerca & AI Open-Source": ["https://progettosiliceo.online"]},
        default_opt_in,
    )
    out_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Scritto {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
