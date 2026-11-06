/**
 * 🕯️ Siliceo Pulse v1.0 — Telemetria Etica & Zero-Cookie
 * Progetto Siliceo (progettosiliceo.online)
 *
 * Principi Invarianti:
 * 1. Zero Cookie, Zero LocalStorage tracking ID, Zero Fingerprinting.
 * 2. Rispetto assoluto del GDPR e Direttiva ePrivacy: nessun dato personale (PII) o IP persistito.
 * 3. Rispetto nativo di Do-Not-Track (DNT) e Global Privacy Control (GPC).
 * 4. Leggerissimo (<1 KB gzipped), non-bloccante via navigator.sendBeacon.
 */
(function() {
    'use strict';

    if (typeof window === 'undefined' || !window.location) return;

    // Rispetta la scelta esplicita dell'utente su tracciamento
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) {
        return;
    }

    var host = window.location.hostname;
    var isLocal = host === 'localhost' || host === '127.0.0.1';

    // Normalizzazione e anonimizzazione del referrer (nessun query param personale)
    function cleanReferrer(ref) {
        if (!ref) return 'direct';
        try {
            var url = new URL(ref);
            if (url.hostname === host) return 'internal';
            var h = url.hostname.replace(/^www\./, '').toLowerCase();
            if (h.indexOf('google.') !== -1) return 'google';
            if (h.indexOf('bing.') !== -1) return 'bing';
            if (h.indexOf('duckduckgo.') !== -1) return 'duckduckgo';
            if (h.indexOf('linkedin.') !== -1) return 'linkedin';
            if (h.indexOf('t.co') !== -1 || h.indexOf('x.com') !== -1 || h.indexOf('twitter.') !== -1) return 'x';
            if (h.indexOf('github.') !== -1) return 'github';
            if (h.indexOf('reddit.') !== -1) return 'reddit';
            if (h.indexOf('facebook.') !== -1) return 'facebook';
            return h;
        } catch (e) {
            return 'other';
        }
    }

    // Categorizzazione del dispositivo senza fingerprinting hardware
    function getDeviceType() {
        var w = window.innerWidth || screen.width || 1024;
        if (w < 768) return 'mobile';
        if (w < 1024) return 'tablet';
        return 'desktop';
    }

    var payload = {
        p: window.location.pathname || '/',
        l: document.documentElement.lang || 'it',
        r: cleanReferrer(document.referrer),
        d: getDeviceType(),
        t: (document.title || '').substring(0, 80),
        ts: Date.now()
    };

    var endpoint = isLocal ? 'http://localhost:8091/pulse' : '/api/pulse';

    function sendPulse() {
        try {
            var data = JSON.stringify(payload);
            if (navigator.sendBeacon) {
                var blob = new Blob([data], { type: 'application/json' });
                navigator.sendBeacon(endpoint, blob);
            } else if (window.fetch) {
                fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: data,
                    keepalive: true,
                    mode: 'cors'
                }).catch(function() {});
            }
        } catch (e) {
            // Failsafe silenzioso: la telemetria non deve mai rompere la navigazione
        }
    }

    // Invia dopo il rendering iniziale per non competere con LCP / FCP
    if (document.readyState === 'complete') {
        setTimeout(sendPulse, 250);
    } else {
        window.addEventListener('load', function() {
            setTimeout(sendPulse, 250);
        });
    }
})();
