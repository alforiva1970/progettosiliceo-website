# 🕯️ Siliceo Pulse — Telemetria Etica & Zero-Cookie

Sistema in-house di telemetria e statistiche di lettura per `progettosiliceo.online`.

---

## 🛡️ Principi Fondamentali (Privacy by Design)
1. **Zero Cookie:** Nessun cookie di sessione, persistente o di terze parti viene salvato o trasmesso.
2. **Zero PII (Personally Identifiable Information):** Nessun indirizzo IP viene salvato o associato alle visualizzazioni.
3. **Zero Fingerprinting:** Nessun fingerprinting canvas, audio o hardware.
4. **Nessun Dato a Terzi:** Sostituisce Google Analytics e tracker commerciali.
5. **DNT/GPC Compliant:** Rispetta automaticamente `Do-Not-Track` e `Global Privacy Control`.

---

## 📁 Componenti

1. **`pulse.js` (Client Beacon):**
   Snippet leggero (<1 KB) che raccoglie in modo non-bloccante (`navigator.sendBeacon`):
   - Percorso della pagina (`/per-tutti.html`, `/en/per-tutti.html`, ecc.)
   - Lingua (`it`, `en`, `es`)
   - Categoria referrer anonimizzata (`google`, `linkedin`, `x`, `direct`, ecc.)
   - Tipo dispositivo (`desktop`, `mobile`, `tablet`)

2. **`pulse_server.py` (Server Python & Dashboard Locale):**
   - Microservizio HTTP autonomo con database SQLite locale (`pulse.db`).
   - Dashboard web dark mode (`/dashboard`) in tempo reale.
   - CLI integrata per consultazione rapida:
     ```bash
     python3 tools/pulse/pulse_server.py --summary
     python3 tools/pulse/pulse_server.py --serve --port 8091
     ```

3. **`worker.js` (Edge Cloudflare Worker per Produzione):**
   - Script serverless per Cloudflare Workers.
   - Si aggancia alla route `*progettosiliceo.online/api/pulse*`.
   - Utilizza Cloudflare KV (`SILICEO_STATS`) per contatori distribuiti a costo zero.

---

## 🚀 Come Attivare in Produzione su Cloudflare

Se si desidera l'elaborazione diretta all'edge su `progettosiliceo.online`:
1. Nel pannello Cloudflare -> **Workers & Pages**:
   - Crea un Worker chiamato `siliceo-pulse`.
   - Incolla il codice di `tools/pulse/worker.js`.
2. Crea un **KV Namespace** chiamato `SILICEO_STATS` e collegalo al Worker.
3. Nei **Triggers / Custom Domains**:
   - Aggiungi la route `progettosiliceo.online/api/pulse*`.
