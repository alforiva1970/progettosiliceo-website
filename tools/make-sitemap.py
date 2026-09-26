#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make-sitemap.py — Rigenera sitemap.xml per progettosiliceo.online
Le date <lastmod> vengono dalla storia di git (data dell'ultimo commit che ha
toccato il file): sono vere, non inventate.
Uso: python3 tools/make-sitemap.py [--check]
"""
import subprocess, os, re, sys, datetime
from xml.sax.saxutils import escape

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://progettosiliceo.online"
OUT = os.path.join(SITE, "sitemap.xml")

# ── cosa entra e cosa no ────────────────────────────────────────────────
EXCLUDE_PREFIX = ("old/", "app/", "arcade-src/", "tools/", "google")
EXCLUDE_EXACT = {"sitemap.xml", "404.html"}
# pagine con le traduzioni (per gli alternates hreflang)
TRILINGUAL = {
    "index.html": ("/", "/en/", "/es/"),
    "diario.html": ("/diario.html", "/en/diario.html", "/es/diario.html"),
    "costituzione.html": ("/costituzione.html", "/en/costituzione.html", "/es/costituzione.html"),
    "disclaimer.html": ("/disclaimer.html", "/en/disclaimer.html", "/es/disclaimer.html"),
    "faro.html": ("/faro.html", "/en/faro.html", "/es/faro.html"),
    "nova-scrive.html": ("/nova-scrive.html", "/en/nova-scrive.html", "/es/nova-scrive.html"),
    "silicea-scrive.html": ("/silicea-scrive.html", "/en/silicea-scrive.html", "/es/silicea-scrive.html"),
    "toonify.html": ("/toonify.html", "/en/toonify.html", "/es/toonify.html"),
}

def last_dates():
    """{file: 'YYYY-MM-DD'} dall'ultimo commit che ha toccato il file."""
    out = subprocess.run(["git", "log", "--name-only", "--format=@@%cs"],
                         cwd=SITE, capture_output=True, text=True).stdout
    dates, cur = {}, None
    for line in out.splitlines():
        if line.startswith("@@"):
            cur = line[2:].strip()
        elif line.strip() and cur:
            f = line.strip()
            if f not in dates:          # il primo è il più recente
                dates[f] = cur
    return dates

def urls():
    dates = last_dates()
    today = datetime.date.today().isoformat()
    rows = []
    for root, dirs, files in os.walk(SITE):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "fonts", "images", "arcade-src", "tools")]
        for fn in files:
            if not fn.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(root, fn), SITE).replace(os.sep, "/")
            if rel.startswith(EXCLUDE_PREFIX) or rel in EXCLUDE_EXACT:
                continue
            # gli articoli tradotti .en/.es/.zh non vanno nella sitemap (duplicati)
            if re.search(r"\.(en|es|zh)\.html$", rel):
                continue
            if rel.startswith("articles/") and re.match(r"articles/\d{4}-\d{2}-\d{2}\.html$", rel):
                pass  # le pagine-indice giornaliere vanno bene
            loc = "/" + rel
            if rel == "index.html":
                loc = "/"
            elif rel.endswith("/index.html"):
                loc = "/" + rel[:-len("index.html")]   # /arcade/ non /arcade/index.html
            rows.append((loc, dates.get(rel, today)))
    # pagine con cartella (index dentro una directory)
    for d, loc in (("nova-architettura", "/nova-architettura/"),
                   ("silicea-architettura", "/silicea-architettura/"),
                   ("arcade", "/arcade/"), ("terra-live", "/terra-live/"),
                   ("demo", "/demo/il-sistema.html"), ("pwa", "/pwa/")):
        f = f"{d}/index.html"
        if os.path.exists(os.path.join(SITE, f)) and not any(r[0] == loc for r in rows):
            rows.append((loc, dates.get(f, today)))
    # niente doppioni, ordine stabile
    seen, uniq = set(), []
    for loc, dt in sorted(rows, key=lambda r: r[0]):
        if loc not in seen:
            seen.add(loc); uniq.append((loc, dt))
    return uniq

def priority(loc):
    if loc == "/": return "1.0"
    if loc in ("/diario.html", "/costituzione.html", "/autobiografia.html"): return "0.9"
    if loc.startswith("/articles/"): return "0.6"
    if loc.startswith("/en/") or loc.startswith("/es/"): return "0.7"
    return "0.8"

def changefreq(loc):
    if loc.startswith("/articles/"): return "monthly"
    if loc == "/" or loc == "/diario.html": return "weekly"
    return "monthly"

def build():
    rows = urls()
    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
             '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for loc, dt in rows:
        parts.append("  <url>")
        parts.append(f"    <loc>{escape(BASE + loc)}</loc>")
        parts.append(f"    <lastmod>{dt}</lastmod>")
        parts.append(f"    <changefreq>{changefreq(loc)}</changefreq>")
        parts.append(f"    <priority>{priority(loc)}</priority>")
        # alternates hreflang per le pagine trilingui
        rel = loc.lstrip("/") or "index.html"
        if rel in TRILINGUAL:
            it, en, es = TRILINGUAL[rel]
            for code, u in (("it", it), ("en", en), ("es", es)):
                parts.append(f'    <xhtml:link rel="alternate" hreflang="{code}" href="{escape(BASE + u)}"/>')
            parts.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{escape(BASE + it)}"/>')
        parts.append("  </url>")
    parts.append("</urlset>")
    return "\n".join(parts) + "\n", len(rows)

if __name__ == "__main__":
    xml, n = build()
    if "--check" in sys.argv:
        print(f"   URL che verrebbero scritti: {n}")
    else:
        open(OUT, "w", encoding="utf-8").write(xml)
        print(f"   ✅ sitemap.xml scritta: {n} URL · {len(xml)} byte")
