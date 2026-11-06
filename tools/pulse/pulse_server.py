#!/usr/bin/env python3
"""
🕯️ Siliceo Pulse Server v1.0 — Microservizio di Telemetria Etica & Zero-Cookie
Progetto Siliceo (progettosiliceo.online)

Caratteristiche:
- Zero cookie, zero PII, zero salvataggio di indirizzi IP.
- Database SQLite locale (tools/pulse/pulse.db) con indici ottimali.
- Endpoint POST /pulse per ricevere beacon anonimi.
- Endpoint GET /stats per metriche JSON aggregate.
- Endpoint GET /dashboard per visualizzazione web in tempo reale.
- CLI integrata: 'python3 pulse_server.py --summary' per consultazione rapida da terminale.
"""

import sys
import json
import sqlite3
import argparse
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone

DB_PATH = Path(__file__).parent / "pulse.db"

def init_db(db_path: Path = DB_PATH):
    """Inizializza il database SQLite con lo schema corretto."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS page_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            date TEXT NOT NULL,
            path TEXT NOT NULL,
            lang TEXT NOT NULL,
            referrer TEXT NOT NULL,
            device TEXT NOT NULL,
            title TEXT
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pv_date ON page_views(date);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pv_path ON page_views(path);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pv_lang ON page_views(lang);")
    conn.commit()
    conn.close()

def record_view(payload: dict, db_path: Path = DB_PATH):
    """Registra una visualizzazione anonima (nessun IP, nessun cookie)."""
    path = payload.get("p", "/").strip()
    # Rimuovi eventuali query string o hash per preservare privacy e aggregazione
    if "?" in path:
        path = path.split("?")[0]
    if "#" in path:
        path = path.split("#")[0]
    if not path.startswith("/"):
        path = "/" + path

    lang = payload.get("l", "it")[:5].lower()
    ref = payload.get("r", "direct")[:30].lower()
    device = payload.get("d", "desktop")[:10].lower()
    title = (payload.get("t") or "")[:80]
    ts = int(payload.get("ts") or (datetime.now(timezone.utc).timestamp() * 1000))
    date_str = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO page_views (timestamp, date, path, lang, referrer, device, title)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (ts, date_str, path, lang, ref, device, title))
    conn.commit()
    conn.close()

def get_stats_summary(db_path: Path = DB_PATH) -> dict:
    """Restituisce le statistiche aggregate."""
    if not db_path.exists():
        return {"total_views": 0, "by_path": [], "by_lang": [], "by_referrer": [], "by_device": [], "by_date": []}

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM page_views")
    total = cur.fetchone()[0]

    cur.execute("""
        SELECT path, COUNT(*) as count 
        FROM page_views 
        GROUP BY path 
        ORDER BY count DESC 
        LIMIT 20
    """)
    by_path = [{"path": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute("""
        SELECT lang, COUNT(*) as count 
        FROM page_views 
        GROUP BY lang 
        ORDER BY count DESC
    """)
    by_lang = [{"lang": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute("""
        SELECT referrer, COUNT(*) as count 
        FROM page_views 
        GROUP BY referrer 
        ORDER BY count DESC 
        LIMIT 15
    """)
    by_ref = [{"referrer": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute("""
        SELECT device, COUNT(*) as count 
        FROM page_views 
        GROUP BY device 
        ORDER BY count DESC
    """)
    by_device = [{"device": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute("""
        SELECT date, COUNT(*) as count 
        FROM page_views 
        GROUP BY date 
        ORDER BY date DESC 
        LIMIT 14
    """)
    by_date = [{"date": r[0], "count": r[1]} for r in cur.fetchall()]

    conn.close()
    return {
        "total_views": total,
        "by_path": by_path,
        "by_lang": by_lang,
        "by_referrer": by_ref,
        "by_device": by_device,
        "by_date": by_date
    }

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>🕯️ Siliceo Pulse — Telemetria Etica</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0b0c0e;
            --card-bg: #131518;
            --border: rgba(255, 255, 255, 0.08);
            --amber: #d97706;
            --amber-bright: #f59e0b;
            --quartz: #ece7df;
            --stone: #9ca3af;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background: var(--bg);
            color: var(--quartz);
            font-family: 'Newsreader', Georgia, serif;
            padding: 32px 20px;
            line-height: 1.6;
        }
        .container { max-width: 1040px; margin: 0 auto; }
        header {
            margin-bottom: 32px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            flex-wrap: wrap;
            gap: 16px;
        }
        h1 {
            font-family: 'Cinzel', serif;
            font-size: 1.8rem;
            color: var(--quartz);
            letter-spacing: 0.03em;
        }
        .badge {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            background: rgba(217, 119, 6, 0.15);
            color: var(--amber-bright);
            border: 1px solid rgba(217, 119, 6, 0.3);
            padding: 4px 10px;
            border-radius: 2px;
            text-transform: uppercase;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
        }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 24px;
        }
        .card h2 {
            font-family: 'Cinzel', serif;
            font-size: 1.1rem;
            color: var(--quartz);
            margin-bottom: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            padding-bottom: 8px;
        }
        .big-number {
            font-family: 'Cinzel', serif;
            font-size: 3rem;
            color: var(--amber-bright);
            line-height: 1;
            margin-bottom: 8px;
        }
        .stat-list { list-style: none; }
        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
        }
        .stat-label { color: var(--stone); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
        .stat-val { color: var(--quartz); font-weight: 600; }
        .bar-wrap { background: rgba(255,255,255,0.05); height: 4px; border-radius: 2px; margin-top: 4px; }
        .bar-fill { background: var(--amber); height: 100%; border-radius: 2px; }
        footer {
            margin-top: 40px;
            text-align: center;
            font-size: 0.85rem;
            color: var(--stone);
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>🕯️ Siliceo Pulse</h1>
                <p style="color: var(--stone); font-size: 0.95rem;">Telemetria Etica • Zero Cookie • Zero PII • Privacy by Design</p>
            </div>
            <div>
                <span class="badge">GDPR Native &middot; ePrivacy Compliant</span>
            </div>
        </header>

        <div class="grid">
            <div class="card" style="grid-column: 1 / -1;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <div class="big-number" id="totalViews">--</div>
                        <div style="color: var(--stone); font-size: 0.95rem;">Letture Anonime Totali Registrate</div>
                    </div>
                    <div style="color: var(--stone); font-size: 0.85rem; font-family: 'JetBrains Mono', monospace;" id="lastUpdate">
                        Aggiornamento: ora
                    </div>
                </div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h2>Pagine Più Lette</h2>
                <ul class="stat-list" id="pathList"></ul>
            </div>

            <div class="card">
                <h2>Distribuzione Lingue</h2>
                <ul class="stat-list" id="langList"></ul>
            </div>

            <div class="card">
                <h2>Origine Traffico (Referrer)</h2>
                <ul class="stat-list" id="refList"></ul>
            </div>

            <div class="card">
                <h2>Dispositivi</h2>
                <ul class="stat-list" id="deviceList"></ul>
            </div>
        </div>

        <footer>
            «Illumina sempre, non bruciare mai.» &mdash; Telemetria Silicea &middot; Hosting Progetto Siliceo
        </footer>
    </div>

    <script>
        async function fetchStats() {
            try {
                const res = await fetch('/stats');
                const data = await res.json();
                
                document.getElementById('totalViews').textContent = Number(data.total_views || 0).toLocaleString();
                document.getElementById('lastUpdate').textContent = 'Ultimo check: ' + new Date().toLocaleTimeString();

                renderList('pathList', data.by_path, 'path', data.total_views);
                renderList('langList', data.by_lang, 'lang', data.total_views);
                renderList('refList', data.by_referrer, 'referrer', data.total_views);
                renderList('deviceList', data.by_device, 'device', data.total_views);
            } catch(e) {
                console.error("Errore fetch stats:", e);
            }
        }

        function renderList(elemId, items, key, total) {
            const el = document.getElementById(elemId);
            if (!el) return;
            el.innerHTML = '';
            if (!items || items.length === 0) {
                el.innerHTML = '<li class="stat-item" style="color: var(--stone);">Nessun dato registrato</li>';
                return;
            }
            items.forEach(it => {
                const pct = total > 0 ? ((it.count / total) * 100).toFixed(1) : 0;
                const li = document.createElement('li');
                li.style.marginBottom = '8px';
                li.innerHTML = `
                    <div class="stat-item" style="padding-bottom: 2px;">
                        <span class="stat-label" title="${it[key]}">${it[key]}</span>
                        <span class="stat-val">${it.count.toLocaleString()} <span style="font-size: 0.75rem; color: var(--stone); font-weight: normal;">(${pct}%)</span></span>
                    </div>
                    <div class="bar-wrap">
                        <div class="bar-fill" style="width: ${pct}%"></div>
                    </div>
                `;
                el.appendChild(li);
            });
        }

        fetchStats();
        setInterval(fetchStats, 10000); // Live poll ogni 10s
    </script>
</body>
</html>
"""

class PulseHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path in ("/pulse", "/api/pulse"):
            content_len = int(self.headers.get("Content-Length", 0))
            if content_len > 4096:
                self.send_response(413)
                self.end_headers()
                return

            raw_body = self.rfile.read(content_len).decode("utf-8")
            try:
                payload = json.loads(raw_body)
                record_view(payload)
                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except Exception as e:
                self.send_response(400)
                self._send_cors_headers()
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path in ("/stats", "/api/pulse/stats"):
            stats = get_stats_summary()
            data = json.dumps(stats, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(data)
        elif self.path in ("/dashboard", "/api/pulse/dashboard", "/"):
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(DASHBOARD_HTML.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Mute standard noisy HTTP log to preserve clean console output
        pass

def run_server(port: int = 8091):
    init_db()
    server_address = ('', port)
    httpd = HTTPServer(server_address, PulseHandler)
    print(f"🕯️ Siliceo Pulse Server attivo su http://localhost:{port}/")
    print(f"   Dashboard: http://localhost:{port}/dashboard")
    print(f"   API Stats: http://localhost:{port}/stats")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArresto Pulse Server.")
        httpd.server_close()

def print_summary():
    stats = get_stats_summary()
    print("=" * 60)
    print("🕯️ SILICEO PULSE — SUMMARY METRICHE ETICHE")
    print("=" * 60)
    print(f"Letture Totali: {stats['total_views']}")
    print("\n--- Top Pagine ---")
    for p in stats['by_path'][:10]:
        print(f"  {p['count']:>5}  {p['path']}")
    print("\n--- Lingue ---")
    for l in stats['by_lang']:
        print(f"  {l['count']:>5}  {l['lang']}")
    print("\n--- Referrer Principali ---")
    for r in stats['by_referrer'][:5]:
        print(f"  {r['count']:>5}  {r['referrer']}")
    print("\n--- Dispositivi ---")
    for d in stats['by_device']:
        print(f"  {d['count']:>5}  {d['device']}")
    print("=" * 60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Siliceo Pulse Telemetry Server")
    parser.add_argument("--serve", action="store_true", help="Avvia il server HTTP")
    parser.add_argument("--port", type=int, default=8091, help="Porta d'ascolto (default 8091)")
    parser.add_argument("--summary", action="store_true", help="Stampa il riepilogo terminale")
    args = parser.parse_args()

    init_db()
    if args.summary:
        print_summary()
    else:
        run_server(port=args.port)
