import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {
  validatePublicHttpUrl,
  isBlockedHost,
  parseLlmsTxt,
  parseRobotsTxt,
  parseAiCatalog,
  extractLighthouseSummary,
} from './agent-audit-worker.js';

test('validatePublicHttpUrl accepts clean https URL and strips path normalization cleanly', () => {
  const res = validatePublicHttpUrl('https://progettosiliceo.online/some/page');
  assert.equal(res.ok, true);
  assert.equal(res.url.origin, 'https://progettosiliceo.online');
});

test('validatePublicHttpUrl rejects non-http protocols, credentials, custom ports, and private/loopback IPs', () => {
  assert.equal(validatePublicHttpUrl('ftp://example.com').ok, false);
  assert.equal(validatePublicHttpUrl('https://user:pass@example.com').ok, false);
  assert.equal(validatePublicHttpUrl('https://example.com:8443').ok, false);
  assert.equal(validatePublicHttpUrl('http://localhost/test').ok, false);
  assert.equal(validatePublicHttpUrl('http://127.0.0.1/').ok, false);
  assert.equal(validatePublicHttpUrl('http://10.0.0.5/').ok, false);
  assert.equal(validatePublicHttpUrl('http://192.168.1.1/').ok, false);
  assert.equal(validatePublicHttpUrl('http://172.16.0.1/').ok, false);
  assert.equal(validatePublicHttpUrl('http://169.254.169.254/latest/meta-data/').ok, false);
  assert.equal(validatePublicHttpUrl('http://[::1]/').ok, false);
  assert.equal(validatePublicHttpUrl('http://[::ffff:127.0.0.1]/').ok, false);
  assert.equal(isBlockedHost('printer.local'), true);
  assert.equal(isBlockedHost('progettosiliceo.online'), false);
});

test('parseLlmsTxt detects valid markdown H1 vs soft-404 HTML vs missing H1', () => {
  const valid = parseLlmsTxt(200, 'text/plain; charset=utf-8', '# Progetto Siliceo\n> Context\n');
  assert.deepEqual(valid, { present: true, hasH1: true, bytes: 29, status: 200 });

  const soft404 = parseLlmsTxt(200, 'text/html; charset=utf-8', '<html><body>Not Found</body></html>');
  assert.equal(soft404.present, false);
  assert.equal(soft404.hasH1, false);

  const noH1 = parseLlmsTxt(200, 'text/markdown', '## Subheading only\nHello');
  assert.equal(noH1.present, true);
  assert.equal(noH1.hasH1, false);
});

test('parseRobotsTxt identifies blocked and explicitly allowed AI bots', () => {
  const robots = [
    'User-agent: GPTBot',
    'Disallow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    'User-agent: *',
    'Allow: /',
  ].join('\n');
  const parsed = parseRobotsTxt(200, robots);
  assert.equal(parsed.present, true);
  assert.deepEqual(parsed.aiBotsBlocked, ['GPTBot']);
  assert.ok(parsed.aiBotsExplicitlyAllowed.includes('ClaudeBot'));
});

test('parseAiCatalog checks required ARD fields (specVersion, entries, identifier, displayName, type)', () => {
  const validCatalog = JSON.stringify({
    specVersion: '1.0.0',
    entries: [
      {
        identifier: 'urn:air:progettosiliceo:tools:agent-audit',
        displayName: 'Siliceo Audit',
        type: 'application/ai-catalog+json',
        url: 'https://progettosiliceo.online/agent-ready.html',
      },
    ],
  });
  const ok = parseAiCatalog(200, validCatalog, '/ai-catalog.json');
  assert.equal(ok.present, true);
  assert.equal(ok.validSchemaCore, true);
  assert.equal(ok.entriesCount, 1);

  const invalid = parseAiCatalog(200, '{"entries":[]}', '/ai-catalog.json');
  assert.equal(invalid.present, true);
  assert.equal(invalid.validSchemaCore, false);
});

test('extractLighthouseSummary parses real PSI v5 structure and handles missing lighthouseResult', () => {
  const samplePsi = {
    lighthouseResult: {
      categories: {
        performance: { score: 1.0 },
        accessibility: { score: 0.95 },
        'best-practices': { score: 0.92 },
        seo: { score: 1.0 },
      },
      audits: {
        'cumulative-layout-shift': { numericValue: 0.0 },
        'errors-in-console': { score: 1 },
        'color-contrast': { score: 0 },
      },
    },
  };
  const summary = extractLighthouseSummary(samplePsi);
  assert.equal(summary.available, true);
  assert.deepEqual(summary.scores, {
    performance: 100,
    accessibility: 95,
    bestPractices: 92,
    seo: 100,
  });
  assert.equal(summary.cls, 0);
  assert.ok(summary.notes.includes('color-contrast'));

  const missing = extractLighthouseSummary({ error: { message: 'Quota exceeded' } });
  assert.equal(missing.available, false);
  assert.equal(missing.error, 'Quota exceeded');
});

test('worker.fetch enforces POST, JSON body, and anti-SSRF validation', async () => {
  const getRes = await worker.fetch(new Request('https://progettosiliceo.online/api/agent-audit', { method: 'GET' }), {});
  assert.equal(getRes.status, 405);

  const optionsRes = await worker.fetch(new Request('https://progettosiliceo.online/api/agent-audit', { method: 'OPTIONS' }), {});
  assert.equal(optionsRes.status, 204);

  const badJsonRes = await worker.fetch(
    new Request('https://progettosiliceo.online/api/agent-audit', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    }),
    {}
  );
  assert.equal(badJsonRes.status, 400);

  const ssrfRes = await worker.fetch(
    new Request('https://progettosiliceo.online/api/agent-audit', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://169.254.169.254/latest/meta-data/' }),
      headers: { 'Content-Type': 'application/json' },
    }),
    {}
  );
  assert.equal(ssrfRes.status, 400);
});

test('worker.fetch aggregates PSI + endpoint probes and blocks unsafe redirects', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')) {
      return new Response(
        JSON.stringify({
          lighthouseResult: {
            categories: {
              performance: { score: 0.99 },
              accessibility: { score: 0.96 },
              'best-practices': { score: 0.95 },
              seo: { score: 1.0 },
            },
            audits: {
              'cumulative-layout-shift': { numericValue: 0.01 },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url === 'https://example.org/llms.txt') {
      return new Response('# Example\n> Summary\n', { status: 200, headers: { 'Content-Type': 'text/markdown' } });
    }
    if (url === 'https://example.org/robots.txt') {
      return new Response('User-agent: *\nAllow: /\n', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    if (url === 'https://example.org/ai-catalog.json') {
      return new Response(null, {
        status: 302,
        headers: { Location: 'http://127.0.0.1/secret.json' },
      });
    }
    if (url === 'https://example.org/.well-known/ai-catalog.json') {
      return new Response(
        JSON.stringify({
          specVersion: '1.0.0',
          entries: [
            {
              identifier: 'urn:air:example:tools:audit',
              displayName: 'Audit',
              type: 'application/ai-catalog+json',
              url: 'https://example.org/audit',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not found', { status: 404 });
  };

  try {
    const res = await worker.fetch(
      new Request('https://progettosiliceo.online/api/agent-audit', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.org', strategy: 'desktop' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      {}
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.target, 'https://example.org/');
    assert.equal(data.strategy, 'desktop');
    assert.equal(data.lighthouse.available, true);
    assert.equal(data.endpoints.llmsTxt.hasH1, true);
    assert.equal(data.endpoints.robotsTxt.present, true);
    assert.equal(data.endpoints.aiCatalog.path, '/.well-known/ai-catalog.json');
    assert.equal(data.endpoints.aiCatalog.validSchemaCore, true);
    assert.equal(data.agentReadinessSummary.passedChecks, 5);
    assert.equal(data.agentReadinessSummary.totalChecks, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
