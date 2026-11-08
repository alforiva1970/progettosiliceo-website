/**
 * 🕯️ Siliceo Pulse — Cloudflare Worker Edge Edition v1.0
 * Progetto Siliceo (progettosiliceo.online)
 *
 * Edge Telemetry Serverless su Cloudflare Workers + KV.
 * Zero Cookie, Zero PII, Zero IP Storage.
 *
 * Configurazione Cloudflare:
 * 1. Crea un KV Namespace: 'SILICEO_STATS'
 * 2. Assegna Route: 'progettosiliceo.online/api/pulse*'
 * 3. Opzionale: imposta Secret 'PULSE_AUTH_KEY' per proteggere la dashboard/stats
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    // Header CORS conformi
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Pulse-Auth",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    // Endpoint POST /api/pulse — Riceve il beacon
    if (request.method === "POST" && (url.pathname === "/api/pulse" || url.pathname === "/pulse")) {
      try {
        const body = await request.json();
        const path = (body.p || "/").split("?")[0].split("#")[0];
        const lang = (body.l || "it").slice(0, 5).toLowerCase();
        const ref = (body.r || "direct").slice(0, 30).toLowerCase();
        const device = (body.d || "desktop").slice(0, 10).toLowerCase();
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        // Incremento contatori asincrono su KV (non rallenta la risposta al client)
        if (env.SILICEO_STATS) {
          ctx.waitUntil((async () => {
            const inc = async (key) => {
              const current = parseInt((await env.SILICEO_STATS.get(key)) || "0", 10);
              await env.SILICEO_STATS.put(key, (current + 1).toString());
            };
            await inc("total_views");
            await inc(`date:${today}`);
            await inc(`path:${path}`);
            await inc(`lang:${lang}`);
            await inc(`ref:${ref}`);
            await inc(`dev:${device}`);
          })());
        }

        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "bad_request" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    // Endpoint GET /api/pulse/stats — JSON sommario
    if (request.method === "GET" && (url.pathname === "/api/pulse/stats" || url.pathname === "/stats")) {
      if (!env.SILICEO_STATS) {
        return new Response(JSON.stringify({ error: "kv_not_bound", total_views: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const total = parseInt((await env.SILICEO_STATS.get("total_views")) || "0", 10);
      return new Response(JSON.stringify({
        total_views: total,
        status: "active",
        privacy: "zero_cookies_zero_pii"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // Endpoint GET /api/pulse/dashboard
    if (request.method === "GET" && (url.pathname === "/api/pulse/dashboard" || url.pathname === "/dashboard")) {
      return new Response("Siliceo Pulse Edge Worker Active. Connect KV 'SILICEO_STATS' for metrics.", {
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
