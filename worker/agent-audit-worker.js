/**
 * Siliceo Agent-Ready Audit Worker (Same-Origin Cloudflare Worker)
 * License: AGPL-3.0 — Progetto Siliceo
 */

const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'PerplexityBot',
  'ClaudeBot',
  'Anthropic-AI',
  'Googlebot',
  'Applebot-Extended',
];
const MAX_DIRECT_BYTES = 100 * 1024;
const MAX_REDIRECTS = 3;
const DIRECT_TIMEOUT_MS = 4000;
const PSI_TIMEOUT_MS = 22000;
const RATE_LIMIT_PER_MIN = 10;

export function isBlockedHost(hostname) {
  const host = (hostname || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.+$/, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return true;
  }

  // IPv6 loopback, unspecified, ULA (fc00::/7), link-local (fe80::/10), IPv4-mapped (::ffff:0:0/96)
  if (host.includes(':')) {
    if (
      host === '::1' ||
      host === '::' ||
      host === '0:0:0:0:0:0:0:1' ||
      host === '0:0:0:0:0:0:0:0' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      /^fe[89ab]/.test(host) ||
      host.startsWith('::ffff:')
    ) {
      return true;
    }
  }

  // IPv4 private/loopback/reserved/CGNAT/multicast ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    if ([a, b, c, d].some((n) => n > 255)) return true;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true; // Benchmarking
  }

  return false;
}

export function validatePublicHttpUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { ok: false, error: 'URL mancante.' };
  }
  const trimmed = rawUrl.trim();
  const hasExplicitScheme =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ||
    /^(javascript|data|file|vbscript|mailto|blob):/i.test(trimmed);
  const normalized = hasExplicitScheme ? trimmed : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: 'Sintassi URL non valida.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Consentiti solo protocolli http e https.' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Credenziali nell URL non consentite.' };
  }
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { ok: false, error: 'Consentite solo porte standard 80/443.' };
  }
  if (!parsed.hostname.includes('.') || isBlockedHost(parsed.hostname)) {
    return { ok: false, error: 'Hostname locale, privato o non pubblico bloccato.' };
  }

  return { ok: true, url: parsed };
}

export function parseLlmsTxt(status, contentType, body) {
  if (status !== 200 || !body) {
    return { present: false, hasH1: false, bytes: 0, status };
  }
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('text/html') || /^\s*<!doctype\s+html/i.test(body) || /^\s*<html[\s>]/i.test(body)) {
    return { present: false, hasH1: false, bytes: 0, status, error: 'Soft-404 HTML invece di Markdown' };
  }
  const hasH1 = /^#\s+\S+/m.test(body);
  const bytes = new TextEncoder().encode(body).length;
  return { present: true, hasH1, bytes, status };
}

export function parseRobotsTxt(status, body) {
  if (status !== 200 || !body) {
    return { present: false, aiBotsBlocked: [], aiBotsExplicitlyAllowed: [], status };
  }

  const rules = new Map();
  let currentAgents = [];
  let seenRule = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (!line) {
      currentAgents = [];
      seenRule = false;
      continue;
    }
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === 'user-agent') {
      if (seenRule) {
        currentAgents = [];
        seenRule = false;
      }
      const ua = value.toLowerCase();
      currentAgents.push(ua);
      if (!rules.has(ua)) rules.set(ua, []);
    } else if ((key === 'disallow' || key === 'allow') && currentAgents.length > 0) {
      seenRule = true;
      for (const ua of currentAgents) {
        rules.get(ua).push({ directive: key, path: value });
      }
    }
  }

  const aiBotsBlocked = [];
  const aiBotsExplicitlyAllowed = [];
  const wildcardRules = rules.get('*') || [];

  for (const bot of AI_CRAWLERS) {
    const key = bot.toLowerCase();
    const specific = rules.get(key);
    const active = specific && specific.length > 0 ? specific : wildcardRules;

    const rootDisallow = active.some((r) => r.directive === 'disallow' && r.path === '/');
    const rootAllow = active.some((r) => r.directive === 'allow' && r.path === '/');

    if (rootDisallow && !rootAllow) {
      aiBotsBlocked.push(bot);
    } else if (specific && rootAllow) {
      aiBotsExplicitlyAllowed.push(bot);
    }
  }

  return { present: true, aiBotsBlocked, aiBotsExplicitlyAllowed, status };
}

export function parseAiCatalog(status, body, path) {
  if (status !== 200 || !body) {
    return { present: false, validSchemaCore: false, entriesCount: 0, path, status };
  }
  try {
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { present: true, validSchemaCore: false, entriesCount: 0, path, status, error: 'JSON non valido' };
    }
    const hasSpecVersion = typeof data.specVersion === 'string' && data.specVersion.length > 0;
    const hasEntries = Array.isArray(data.entries);
    const entriesValid =
      hasEntries &&
      data.entries.every(
        (e) =>
          e &&
          typeof e.identifier === 'string' &&
          typeof e.displayName === 'string' &&
          typeof e.type === 'string' &&
          (typeof e.url === 'string' || (typeof e.data === 'object' && e.data !== null))
      );

    return {
      present: true,
      validSchemaCore: hasSpecVersion && entriesValid,
      entriesCount: hasEntries ? data.entries.length : 0,
      path,
      status,
    };
  } catch {
    return { present: true, validSchemaCore: false, entriesCount: 0, path, status, error: 'JSON non valido' };
  }
}

export function extractLighthouseSummary(psiJson) {
  const lh = psiJson?.lighthouseResult;
  if (!lh || !lh.categories) {
    const msg = psiJson?.error?.message || 'Risposta Google PageSpeed Insights non disponibile.';
    return {
      available: false,
      scores: { performance: null, accessibility: null, bestPractices: null, seo: null },
      cls: null,
      notes: [],
      error: msg,
    };
  }

  const toPct = (cat) => (typeof cat?.score === 'number' ? Math.round(cat.score * 100) : null);
  const scores = {
    performance: toPct(lh.categories.performance),
    accessibility: toPct(lh.categories.accessibility),
    bestPractices: toPct(lh.categories['best-practices']),
    seo: toPct(lh.categories.seo),
  };

  const clsRaw = lh.audits?.['cumulative-layout-shift']?.numericValue;
  const cls = typeof clsRaw === 'number' ? Number(clsRaw.toFixed(3)) : null;

  const diagnosticIds = ['errors-in-console', 'color-contrast', 'target-size', 'link-name', 'image-aspect-ratio'];
  const notes = diagnosticIds.filter((id) => lh.audits?.[id]?.score === 0);

  return { available: true, scores, cls, notes };
}

async function readBoundedText(res, maxBytes) {
  if (!res.body) {
    return (await res.text()).slice(0, maxBytes);
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - total;
      const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(slice);
      total += slice.byteLength;
      if (total >= maxBytes) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

async function fetchBoundedText(targetUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIRECT_TIMEOUT_MS);
  try {
    let currentUrl = targetUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SiliceoAgentAudit/1.0 (+https://progettosiliceo.online/agent-ready.html)',
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        await res.body?.cancel().catch(() => {});
        if (!location || hop === MAX_REDIRECTS) {
          return { status: 0, contentType: '', body: '', error: 'Redirect non valido o eccessivo' };
        }
        let resolvedNext;
        try {
          resolvedNext = new URL(location, currentUrl).href;
        } catch {
          return { status: 0, contentType: '', body: '', error: 'URL redirect non valido' };
        }
        const check = validatePublicHttpUrl(resolvedNext);
        if (!check.ok) {
          return { status: 0, contentType: '', body: '', error: 'Redirect verso host bloccato (Anti-SSRF)' };
        }
        currentUrl = check.url.href;
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      const body = await readBoundedText(res, MAX_DIRECT_BYTES);
      return { status: res.status, contentType, body };
    }
    return { status: 0, contentType: '', body: '', error: 'Redirect eccessivi' };
  } catch (err) {
    return { status: 0, contentType: '', body: '', error: err?.name === 'AbortError' ? 'Timeout' : 'Fetch fallito' };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPsi(targetUrl, strategy, apiKey) {
  const params = new URLSearchParams({
    url: targetUrl,
    strategy,
  });
  for (const cat of ['performance', 'accessibility', 'best-practices', 'seo']) {
    params.append('category', cat);
  }
  if (apiKey) {
    params.set('key', apiKey);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);
  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, {
      signal: controller.signal,
    });
    const json = await res.json();
    return extractLighthouseSummary(json);
  } catch (err) {
    return {
      available: false,
      scores: { performance: null, accessibility: null, bestPractices: null, seo: null },
      cls: null,
      notes: [],
      error: err?.name === 'AbortError' ? 'Google PSI timeout' : 'Errore chiamata Google PSI',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (typeof caches === 'undefined' || !caches.default) return true;
  const cache = caches.default;
  const bucket = Math.floor(Date.now() / 60000);
  const key = new Request(`https://rate.siliceo.internal/${encodeURIComponent(ip)}/${bucket}`);
  const hit = await cache.match(key);
  const count = hit ? Number(await hit.text()) : 0;
  if (count >= RATE_LIMIT_PER_MIN) return false;
  await cache.put(key, new Response(String(count + 1), { headers: { 'Cache-Control': 'max-age=65' } }));
  return true;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Metodo non consentito. Usa POST.' }, 405);
    }

    const allowed = await checkRateLimit(request);
    if (!allowed) {
      return jsonResponse({ error: 'Troppe richieste. Riprova tra un minuto.' }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Body JSON non valido.' }, 400);
    }

    const validation = validatePublicHttpUrl(body?.url);
    if (!validation.ok) {
      return jsonResponse({ error: validation.error }, 400);
    }

    const strategy = body?.strategy === 'mobile' ? 'mobile' : 'desktop';
    const targetOrigin = validation.url.origin;
    const targetHref = validation.url.href;

    const [lighthouse, llmsRaw, robotsRaw, catalogRootRaw] = await Promise.all([
      fetchPsi(targetHref, strategy, env?.PSI_API_KEY),
      fetchBoundedText(`${targetOrigin}/llms.txt`),
      fetchBoundedText(`${targetOrigin}/robots.txt`),
      fetchBoundedText(`${targetOrigin}/ai-catalog.json`),
    ]);

    let aiCatalog = parseAiCatalog(catalogRootRaw.status, catalogRootRaw.body, '/ai-catalog.json');
    if (catalogRootRaw.error) aiCatalog.error = catalogRootRaw.error;

    if (!aiCatalog.present) {
      const wellKnownRaw = await fetchBoundedText(`${targetOrigin}/.well-known/ai-catalog.json`);
      if (wellKnownRaw.status === 200) {
        aiCatalog = parseAiCatalog(wellKnownRaw.status, wellKnownRaw.body, '/.well-known/ai-catalog.json');
      } else if (wellKnownRaw.error && !aiCatalog.error) {
        aiCatalog.error = wellKnownRaw.error;
      }
    }

    const llmsTxt = parseLlmsTxt(llmsRaw.status, llmsRaw.contentType, llmsRaw.body);
    if (llmsRaw.error) llmsTxt.error = llmsRaw.error;

    const robotsTxt = parseRobotsTxt(robotsRaw.status, robotsRaw.body);
    if (robotsRaw.error) robotsTxt.error = robotsRaw.error;

    const warnings = [];
    let passedChecks = 0;
    const totalChecks = 5;

    if (llmsTxt.present && llmsTxt.hasH1) passedChecks++;
    else warnings.push(llmsTxt.present ? 'llms.txt presente ma privo di intestazione H1 (# Titolo)' : 'llms.txt assente');

    if (robotsTxt.present && robotsTxt.aiBotsBlocked.length === 0) passedChecks++;
    else if (robotsTxt.aiBotsBlocked.length > 0) warnings.push(`Bot AI bloccati in robots.txt: ${robotsTxt.aiBotsBlocked.join(', ')}`);
    else warnings.push('robots.txt non raggiungibile o assente');

    if (aiCatalog.present && aiCatalog.validSchemaCore) passedChecks++;
    else warnings.push('ai-catalog.json (ARD) assente o non valido');

    if (lighthouse.available && (lighthouse.cls === null || lighthouse.cls <= 0.1)) passedChecks++;
    else if (lighthouse.available && lighthouse.cls > 0.1) warnings.push(`CLS superiore a 0.10 (${lighthouse.cls})`);

    if (lighthouse.available && (lighthouse.scores.accessibility ?? 0) >= 90 && (lighthouse.scores.bestPractices ?? 0) >= 90) passedChecks++;
    else if (lighthouse.available) warnings.push('Accessibilità o Best Practices sotto 90');

    return jsonResponse({
      target: targetHref,
      strategy,
      auditedAt: new Date().toISOString(),
      lighthouse,
      endpoints: { llmsTxt, robotsTxt, aiCatalog },
      agentReadinessSummary: { passedChecks, totalChecks, warnings },
    });
  },
};
