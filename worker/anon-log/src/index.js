// Siliceo — anon ASN log
// Riceve i beacon same-origin da /api/anon (solo visitatori che eseguono JS)
// e registra ASN + organizzazione, aggregati per giorno/path. Zero IP, zero cookie.
// Route: progettosiliceo.online/api/anon*  → NON intercetta le pagine, non tocca la cache.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/anon" && request.method === "POST") {
      const cf = request.cf || {};
      const asn = cf.asn || 0;
      const org = (cf.asOrganization || "unknown").slice(0, 80);
      const day = new Date().toISOString().slice(0, 10);
      let path = "/";
      try {
        const txt = await request.text();
        const b = JSON.parse(txt);
        path = String(b.p || "/").split("?")[0].split("#")[0].slice(0, 120);
      } catch (e) {}
      const key = `${day}|${asn}|${org}|${path}`;
      const cur = parseInt((await env.ANON_LOG.get(key)) || "0", 10);
      await env.ANON_LOG.put(key, String(cur + 1), { expirationTtl: 60 * 60 * 24 * 30 });
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/anon/stats" && request.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token || token !== env.ADMIN_TOKEN) {
        return new Response("forbidden", { status: 403 });
      }
      const prefix = url.searchParams.get("day") || "";
      const out = [];
      let cursor;
      do {
        const list = await env.ANON_LOG.list({ prefix, cursor });
        for (const k of list.keys) {
          out.push({ key: k.name, count: parseInt((await env.ANON_LOG.get(k.name)) || "0", 10) });
        }
        cursor = list.list_complete ? null : list.cursor;
      } while (cursor);
      return Response.json({ day: prefix, entries: out });
    }

    return new Response("not found", { status: 404 });
  },
};
