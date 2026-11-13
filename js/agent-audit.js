/**
 * Siliceo Agent-Ready Live Scanner & WebMCP Tool Registration (AGPL-3.0)
 */
(function () {
  'use strict';

  const form = document.getElementById('agentAuditForm');
  const urlInput = document.getElementById('auditUrlInput');
  const strategySelect = document.getElementById('auditStrategySelect');
  const submitBtn = document.getElementById('auditSubmitBtn');
  const outputBox = document.getElementById('auditResults');
  const observatoryBox = document.getElementById('observatoryGrid');
  const observatoryShowcase = document.getElementById('observatoryShowcase');
  const observatoryMeta = document.getElementById('observatoryMeta');

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function renderPill(ok, label, variant) {
    const color = variant === 'error' ? '#fca5a5' : ok ? '#10b981' : '#fbbf24';
    const icon = variant === 'error' ? '✕' : ok ? '✓' : '!';
    return `<span style="display:inline-block;padding:4px 10px;border:1px solid ${color};color:${color};font-family:var(--font-mono);font-size:0.78rem;border-radius:4px;">${icon} ${escapeHtml(label)}</span>`;
  }

  async function runAudit(url, strategy) {
    const res = await fetch('/api/agent-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, strategy: strategy || 'desktop' }),
    });
    let data = {};
    try {
      data = await res.json();
    } catch (_err) {
      data = {};
    }
    if (!res.ok) {
      throw new Error(data.error || `Errore HTTP ${res.status}`);
    }
    return data;
  }

  function renderResults(data) {
    if (!outputBox) return;
    const lh = data.lighthouse || {};
    const ep = data.endpoints || {};
    const summary = data.agentReadinessSummary || {};
    const scores = lh.scores || {};

    const lhHtml = lh.available
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:16px 0;">
           <div class="audit-stat"><strong>Performance</strong><span>${escapeHtml(scores.performance ?? '—')}</span></div>
           <div class="audit-stat"><strong>Accessibilità</strong><span>${escapeHtml(scores.accessibility ?? '—')}</span></div>
           <div class="audit-stat"><strong>Best Practice</strong><span>${escapeHtml(scores.bestPractices ?? '—')}</span></div>
           <div class="audit-stat"><strong>SEO</strong><span>${escapeHtml(scores.seo ?? '—')}</span></div>
           <div class="audit-stat"><strong>CLS</strong><span>${escapeHtml(lh.cls ?? '—')}</span></div>
         </div>`
      : `<p style="color:#fbbf24;font-family:var(--font-mono);font-size:0.86rem;margin:12px 0;">Telemetria Google PSI non disponibile: ${escapeHtml(lh.error || 'errore temporaneo')}. Controlli endpoint diretti eseguiti comunque.</p>`;

    const warningsHtml =
      Array.isArray(summary.warnings) && summary.warnings.length > 0
        ? `<ul style="margin:12px 0 0 18px;color:var(--siliceo-paper-quartz);line-height:1.6;">${summary.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
        : `<p style="color:#10b981;margin-top:12px;">Tutti i controlli automatici base superati.</p>`;

    const passedChecks = Number.isFinite(Number(summary.passedChecks)) ? Number(summary.passedChecks) : 0;
    const totalChecks = Number.isFinite(Number(summary.totalChecks)) ? Number(summary.totalChecks) : 5;

    outputBox.innerHTML = `
      <div style="background:var(--siliceo-basalt);border:1px solid var(--siliceo-stone-border);border-radius:var(--radius-md);padding:24px;margin-top:24px;">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;align-items:center;">
          <h3 style="margin:0;color:var(--siliceo-paper-quartz);">Esito scansione: ${escapeHtml(data.target || '')}</h3>
          <span style="font-family:var(--font-mono);color:#fbbf24;">Controlli superati: ${passedChecks}/${totalChecks}</span>
        </div>
        ${lhHtml}
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin:14px 0;">
          ${renderPill(Boolean(ep.llmsTxt?.present && ep.llmsTxt?.hasH1), 'llms.txt (H1)')}
          ${renderPill(Boolean(ep.robotsTxt?.present && (ep.robotsTxt?.aiBotsBlocked?.length || 0) === 0), 'robots.txt AI-open')}
          ${renderPill(Boolean(ep.aiCatalog?.present && ep.aiCatalog?.validSchemaCore), 'ai-catalog.json (ARD)')}
        </div>
        <h4 style="margin:16px 0 6px;color:#fbbf24;font-family:var(--font-mono);font-size:0.85rem;">DIAGNOSI TECNICA</h4>
        ${warningsHtml}
      </div>`;
  }

  function renderObservatorySectors(sectors) {
    return sectors
      .map((s) => {
        const sampleSize = Number.isFinite(Number(s.sampleSize)) ? Number(s.sampleSize) : 0;
        const llmsPct = Number.isFinite(Number(s.llmsTxtValidPct)) ? Number(s.llmsTxtValidPct) : 0;
        const ardPct = Number.isFinite(Number(s.aiCatalogValidPct)) ? Number(s.aiCatalogValidPct) : 0;
        const noiseLabel =
          s.avgHtmlNoisePct !== null && s.avgHtmlNoisePct !== undefined && Number.isFinite(Number(s.avgHtmlNoisePct))
            ? `${Number(s.avgHtmlNoisePct)}%`
            : '—';

        return `
          <div style="background:var(--siliceo-graphite);border:1px solid var(--siliceo-stone-border);border-radius:var(--radius-md);padding:20px;">
            <div style="font-family:var(--font-mono);font-size:0.78rem;color:#fbbf24;">SETTORE // CAMPIONE N=${sampleSize}</div>
            <h3 style="margin:6px 0 12px;color:var(--siliceo-paper-quartz);">${escapeHtml(s.sector || 'Settore')}</h3>
            <p style="margin:4px 0;color:var(--siliceo-ash-light);">llms.txt valido (con H1): <strong style="color:var(--siliceo-paper-quartz);">${llmsPct}%</strong></p>
            <p style="margin:4px 0;color:var(--siliceo-ash-light);">ai-catalog.json (ARD): <strong style="color:var(--siliceo-paper-quartz);">${ardPct}%</strong></p>
            <p style="margin:4px 0;color:var(--siliceo-ash-light);">Rumore HTML medio: <strong style="color:var(--siliceo-paper-quartz);">${escapeHtml(noiseLabel)}</strong></p>
          </div>`;
      })
      .join('');
  }

  function renderOptInShowcase(entries) {
    if (!Array.isArray(entries) || entries.length === 0) return '';
    return entries
      .map((item) => {
        const isReachable = item.reachable !== false;
        const domainText = escapeHtml(item.domain || '');
        const labelText = escapeHtml(item.label || item.domain || 'Dominio Opt-In');
        const notesHtml = item.notes
          ? `<p style="margin:8px 0 12px;color:var(--siliceo-ash-light);font-size:0.92rem;">${escapeHtml(item.notes)}</p>`
          : '';

        const statusHtml = isReachable
          ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
               ${renderPill(true, 'Raggiungibile')}
               ${renderPill(Boolean(item.llmsTxt), 'llms.txt')}
               ${renderPill(Boolean(item.aiCatalog), 'ai-catalog.json (ARD)')}
               ${renderPill(Boolean(item.webMcp), 'WebMCP')}
             </div>`
          : `<div style="margin-top:10px;">
               ${renderPill(false, 'Host non raggiungibile', 'error')}
               <p style="margin:8px 0 0;color:#fca5a5;font-family:var(--font-mono);font-size:0.82rem;">Errore rilevazione: ${escapeHtml(item.error || 'Connessione non riuscita')}</p>
             </div>`;

        return `
          <div style="background:var(--siliceo-graphite);border:1px solid var(--siliceo-stone-border);border-radius:var(--radius-md);padding:20px;">
            <div style="font-family:var(--font-mono);font-size:0.78rem;color:#fbbf24;">OPT-IN // ${domainText}</div>
            <h4 style="margin:6px 0 6px;color:var(--siliceo-paper-quartz);font-size:1.1rem;">${labelText}</h4>
            ${notesHtml}
            ${statusHtml}
          </div>`;
      })
      .join('');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetUrl = urlInput ? urlInput.value.trim() : '';
      const strategy = strategySelect ? strategySelect.value : 'desktop';
      if (!targetUrl) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Scansione reale in corso (Google PSI + Endpoint)...';
      }
      if (outputBox) {
        outputBox.innerHTML =
          '<p style="margin-top:18px;font-family:var(--font-mono);color:#fbbf24;">Interrogazione Google PageSpeed v5 ed endpoint standard pubblici in corso...</p>';
      }

      try {
        const result = await runAudit(targetUrl, strategy);
        renderResults(result);
      } catch (err) {
        if (outputBox) {
          outputBox.innerHTML = `<p style="margin-top:18px;color:#fca5a5;font-family:var(--font-mono);">Errore: ${escapeHtml(err.message)}. Nota: il worker /api/agent-audit deve essere attivo sulla zona Cloudflare o usa la CLI Python locale in basso.</p>`;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🔍 Esegui Audit Reale';
        }
      }
    });
  }

  // Imperative WebMCP Tool Registration (Chrome 2026)
  if (
    typeof navigator !== 'undefined' &&
    navigator.modelContext &&
    typeof navigator.modelContext.registerTool === 'function'
  ) {
    try {
      const maybePromise = navigator.modelContext.registerTool({
        name: 'siliceo_agent_audit',
        description:
          'Analizza un URL pubblico per verificare la conformità a llms.txt, robots.txt per AI crawler, ai-catalog.json ARD e Google PageSpeed / CLS.',
        annotations: { readOnlyHint: true },
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL pubblico completo da analizzare (es. https://progettosiliceo.online)',
            },
            strategy: {
              type: 'string',
              enum: ['desktop', 'mobile'],
              description: 'Strategia Lighthouse (default desktop)',
            },
          },
          required: ['url'],
        },
        async execute(args) {
          const data = await runAudit(args.url, args.strategy || 'desktop');
          return { content: [{ type: 'text', text: JSON.stringify(data) }] };
        },
      });
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {});
      }
    } catch (_err) {
      // Alcune implementazioni possono lanciare in modo sincrono se il tool dichiarativo è già registrato
    }
  }

  // Load Independent Observatory JSON
  if (observatoryBox || observatoryShowcase) {
    fetch('data/observatory.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((obs) => {
        if (!obs) return;

        if (observatoryMeta && (obs.updatedAt || obs.methodology)) {
          const updatedText = obs.updatedAt ? `Ultimo aggiornamento: ${escapeHtml(obs.updatedAt)}` : '';
          const methodText = obs.methodology ? escapeHtml(obs.methodology) : '';
          observatoryMeta.innerHTML = [updatedText, methodText].filter(Boolean).join(' — ');
        }

        if (observatoryBox && Array.isArray(obs.sectors)) {
          observatoryBox.innerHTML = renderObservatorySectors(obs.sectors);
        }

        if (observatoryShowcase && Array.isArray(obs.optInShowcase)) {
          observatoryShowcase.innerHTML = renderOptInShowcase(obs.optInShowcase);
        }
      })
      .catch(() => {
        if (observatoryBox) {
          observatoryBox.innerHTML =
            '<p style="color:var(--siliceo-ash-light);font-family:var(--font-mono);font-size:0.85rem;">Dati dell\'osservatorio al momento non caricabili.</p>';
        }
      });
  }
})();
