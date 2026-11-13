#!/usr/bin/env python3
"""Validatore JSON locale per manifest ARD (Agentic Resource Discovery)."""
import json
import re
import sys
from pathlib import Path
from typing import Any

URN_PATTERN = re.compile(r"^urn:air:[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$")
MEDIA_TYPE_PATTERN = re.compile(
    r"^[a-zA-Z0-9!#$&^_.+-]+/[a-zA-Z0-9!#$&^_.+-]+(?:\s*;.*)?$"
)


def _validate_entry(entry: Any, idx: int) -> list[str]:
    """Valida una singola voce del catalogo ARD e restituisce gli errori trovati."""
    prefix = f"entries[{idx}]"
    if not isinstance(entry, dict):
        return [f"{prefix}: deve essere un oggetto."]

    errors: list[str] = []

    ident = entry.get("identifier")
    if not isinstance(ident, str) or not URN_PATTERN.match(ident):
        errors.append(
            f"{prefix}: identifier deve seguire il formato urn:air:<publisher>:<namespace>:<name>."
        )

    display_name = entry.get("displayName")
    if not isinstance(display_name, str) or not display_name.strip():
        errors.append(f"{prefix}: displayName obbligatorio.")

    media_type = entry.get("type")
    if not isinstance(media_type, str) or not MEDIA_TYPE_PATTERN.match(media_type.strip()):
        errors.append(f"{prefix}: type deve essere un media type IANA valido.")

    url = entry.get("url")
    has_url = isinstance(url, str) and url.startswith("https://") and len(url) > len("https://")
    has_data = isinstance(entry.get("data"), dict)
    if not has_url and not has_data:
        errors.append(
            f"{prefix}: richiesto almeno url o data inline (url deve usare https://)."
        )

    queries = entry.get("representativeQueries")
    if queries is not None and (
        not isinstance(queries, list)
        or not all(isinstance(q, str) and q.strip() for q in queries)
    ):
        errors.append(f"{prefix}: representativeQueries deve essere una lista di stringhe.")

    return errors


def validate_ard_catalog(data: dict[str, Any]) -> list[str]:
    """Valida un dizionario manifest ARD ai sensi dello schema core ARD."""
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["Il root JSON deve essere un oggetto."]

    spec_version = data.get("specVersion")
    if not isinstance(spec_version, str) or not spec_version.strip():
        errors.append("Campo obbligatorio mancante o non valido: specVersion.")

    entries = data.get("entries")
    if not isinstance(entries, list) or len(entries) == 0:
        errors.append("Campo obbligatorio mancante o vuoto: entries (array non vuoto).")
        return errors

    for idx, entry in enumerate(entries):
        errors.extend(_validate_entry(entry, idx))

    return errors


def main() -> int:
    """Entrypoint CLI per validare un file ai-catalog.json."""
    if len(sys.argv) != 2:
        print("Uso: python3 validate_ard.py <ai-catalog.json>", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    try:
        raw_text = path.read_text(encoding="utf-8")
        data = json.loads(raw_text)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        print(f"ERROR: impossibile leggere o parsare {path}: {exc}", file=sys.stderr)
        return 1

    errors = validate_ard_catalog(data)
    if errors:
        for err in errors:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1

    print(f"OK: {path} conforme ai requisiti core ARD ({len(data['entries'])} entries).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
