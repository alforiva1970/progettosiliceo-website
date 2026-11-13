// SPDX-License-Identifier: AGPL-3.0-or-later
//! Fetch HTTP limitato anti-SSRF con redirect manuali, parsing `/llms.txt`, `/robots.txt` e `/ai-catalog.json`.

use std::io::Read;
use std::time::Duration;

use serde::Serialize;

use crate::ard::validate_ard_catalog;
use crate::html::{NoiseMetrics, compute_noise_ratio};
use crate::ssrf::{
    ParsedTarget, SsrfPolicy, normalize_target, resolve_redirect_target, validate_target_network,
};

pub const MAX_REDIRECTS: usize = 3;
pub const MAX_FETCH_BYTES: usize = 250 * 1024;
pub const USER_AGENT: &str = "SiliceoAgentAudit/1.0 (+https://progettosiliceo.online/agent-ready.html)";

const AI_BOTS: &[&str] = &[
    "GPTBot",
    "ChatGPT-User",
    "PerplexityBot",
    "ClaudeBot",
    "Anthropic-AI",
    "Google-Extended",
    "Applebot-Extended",
];

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct LlmsTxtReport {
    pub status: u16,
    pub present: bool,
    pub has_h1: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct RobotsTxtReport {
    pub status: u16,
    pub blocked_ai_bots: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct AiCatalogReport {
    pub status: u16,
    pub valid_ard: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct AuditReport {
    pub origin: String,
    pub error: Option<String>,
    pub homepage_status: u16,
    pub noise: NoiseMetrics,
    pub llms_txt: LlmsTxtReport,
    pub robots_txt: RobotsTxtReport,
    pub ai_catalog: AiCatalogReport,
}

#[derive(Debug, Clone)]
pub struct FetchOutcome {
    pub status: u16,
    pub content_type: String,
    pub body: String,
    pub effective_origin: String,
    pub error: Option<String>,
}

fn empty_audit(origin: String, error: String, homepage_status: u16) -> AuditReport {
    AuditReport {
        origin,
        error: Some(error),
        homepage_status,
        noise: NoiseMetrics {
            html_bytes: 0,
            text_bytes: 0,
            noise_percent: 0.0,
        },
        llms_txt: LlmsTxtReport {
            status: 0,
            present: false,
            has_h1: false,
        },
        robots_txt: RobotsTxtReport {
            status: 0,
            blocked_ai_bots: Vec::new(),
        },
        ai_catalog: AiCatalogReport {
            status: 0,
            valid_ard: false,
        },
    }
}

/// Esegue HTTP GET con timeout, lettura limitata e validazione manuale dei redirect contro SSRF.
pub fn fetch_url(raw_url: &str, policy: SsrfPolicy) -> FetchOutcome {
    let mut current: ParsedTarget = match normalize_target(raw_url) {
        Ok(t) => t,
        Err(err) => {
            return FetchOutcome {
                status: 0,
                content_type: String::new(),
                body: String::new(),
                effective_origin: String::new(),
                error: Some(err),
            };
        }
    };

    if let Err(err) = validate_target_network(&current, policy) {
        return FetchOutcome {
            status: 0,
            content_type: String::new(),
            body: String::new(),
            effective_origin: current.origin,
            error: Some(err),
        };
    }

    let agent: ureq::Agent = ureq::Agent::config_builder()
        .max_redirects(0)
        .http_status_as_error(false)
        .timeout_global(Some(Duration::from_secs(5)))
        .build()
        .into();

    for _hop in 0..=MAX_REDIRECTS {
        let mut response = match agent
            .get(&current.normalized_url)
            .header("User-Agent", USER_AGENT)
            .call()
        {
            Ok(resp) => resp,
            Err(err) => {
                return FetchOutcome {
                    status: 0,
                    content_type: String::new(),
                    body: String::new(),
                    effective_origin: current.origin,
                    error: Some(err.to_string()),
                };
            }
        };

        let status = response.status().as_u16();
        if matches!(status, 301 | 302 | 303 | 307 | 308) {
            let location = response
                .headers()
                .get("location")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("")
                .to_string();
            let next_target = match resolve_redirect_target(&current, &location) {
                Ok(t) => t,
                Err(err) => {
                    return FetchOutcome {
                        status: 0,
                        content_type: String::new(),
                        body: String::new(),
                        effective_origin: current.origin,
                        error: Some(format!("Redirect bloccato ({err})")),
                    };
                }
            };
            if let Err(err) = validate_target_network(&next_target, policy) {
                return FetchOutcome {
                    status: 0,
                    content_type: String::new(),
                    body: String::new(),
                    effective_origin: current.origin,
                    error: Some(format!("Redirect bloccato ({err})")),
                };
            }
            current = next_target;
            continue;
        }

        let content_type = response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_ascii_lowercase();

        let mut buf = Vec::new();
        let mut limited = response.body_mut().as_reader().take(MAX_FETCH_BYTES as u64);
        if let Err(err) = limited.read_to_end(&mut buf) {
            return FetchOutcome {
                status,
                content_type,
                body: String::new(),
                effective_origin: current.origin,
                error: Some(format!("Errore lettura risposta: {err}")),
            };
        }
        let body = String::from_utf8_lossy(&buf).into_owned();
        return FetchOutcome {
            status,
            content_type,
            body,
            effective_origin: current.origin,
            error: None,
        };
    }

    FetchOutcome {
        status: 0,
        content_type: String::new(),
        body: String::new(),
        effective_origin: current.origin,
        error: Some("Troppi redirect HTTP (>3)".into()),
    }
}

/// Rileva validità base di `/llms.txt` escludendo soft-404 HTML.
pub fn parse_llms_txt(status: u16, content_type: &str, body: &str) -> LlmsTxtReport {
    let trimmed = body.trim();
    let lower_head = trimmed.chars().take(128).collect::<String>().to_ascii_lowercase();
    let looks_html = content_type.contains("text/html")
        || lower_head.starts_with("<!doctype")
        || lower_head.starts_with("<html");

    let present = status == 200 && !trimmed.is_empty() && !looks_html;
    let has_h1 = present
        && body
            .lines()
            .any(|line| line.trim_start().starts_with("# "));

    LlmsTxtReport {
        status,
        present,
        has_h1,
    }
}

/// Analizza `/robots.txt` per gruppi RFC 9309 (incluso CRLF e `User-agent:` multipli) e restituisce i bot AI bloccati.
pub fn parse_robots_txt(status: u16, body: &str) -> RobotsTxtReport {
    if status != 200 || body.trim().is_empty() {
        return RobotsTxtReport {
            status,
            blocked_ai_bots: Vec::new(),
        };
    }

    let mut current_agents: Vec<String> = Vec::new();
    let mut saw_rule = false;
    let mut blocked_set: Vec<String> = Vec::new();
    let mut wildcard_disallowed = false;

    for raw_line in body.lines() {
        let no_comment = raw_line.split('#').next().unwrap_or("").trim();
        if no_comment.is_empty() {
            current_agents.clear();
            saw_rule = false;
            continue;
        }
        let Some((k, v)) = no_comment.split_once(':') else {
            continue;
        };
        let key = k.trim().to_ascii_lowercase();
        let val = v.trim();
        if key == "user-agent" {
            if saw_rule {
                current_agents.clear();
                saw_rule = false;
            }
            current_agents.push(val.to_ascii_lowercase());
            continue;
        }
        saw_rule = true;
        if key == "disallow" && val == "/" {
            for bot in AI_BOTS {
                if current_agents.iter().any(|ua| ua == &bot.to_ascii_lowercase())
                    && !blocked_set.contains(&(*bot).to_string())
                {
                    blocked_set.push((*bot).to_string());
                }
            }
            if current_agents.iter().any(|ua| ua == "*") {
                wildcard_disallowed = true;
            }
        }
    }

    if wildcard_disallowed && blocked_set.is_empty() {
        blocked_set.push("*".into());
    }

    RobotsTxtReport {
        status,
        blocked_ai_bots: blocked_set,
    }
}

/// Esegue audit completo su homepage, `/llms.txt`, `/robots.txt` e `/ai-catalog.json` (con fallback `.well-known`).
pub fn audit_origin(raw_url: &str, policy: SsrfPolicy) -> AuditReport {
    let normalized = match normalize_target(raw_url) {
        Ok(t) => t,
        Err(err) => return empty_audit(raw_url.to_string(), err, 0),
    };

    let home = fetch_url(&normalized.origin, policy);
    let effective_origin = if home.effective_origin.is_empty() {
        normalized.origin.clone()
    } else {
        home.effective_origin.clone()
    };

    if home.status == 0 {
        return empty_audit(
            effective_origin,
            home.error.unwrap_or_else(|| "Connessione fallita".into()),
            0,
        );
    }
    if home.status != 200 {
        return empty_audit(effective_origin, format!("Homepage HTTP {}", home.status), home.status);
    }

    let noise = compute_noise_ratio(&home.body);

    let llms_res = fetch_url(&format!("{effective_origin}/llms.txt"), policy);
    let llms_txt = parse_llms_txt(llms_res.status, &llms_res.content_type, &llms_res.body);

    let robots_res = fetch_url(&format!("{effective_origin}/robots.txt"), policy);
    let robots_txt = parse_robots_txt(robots_res.status, &robots_res.body);

    let mut cat_res = fetch_url(&format!("{effective_origin}/ai-catalog.json"), policy);
    if cat_res.status != 200 {
        let wk_res = fetch_url(&format!("{effective_origin}/.well-known/ai-catalog.json"), policy);
        if wk_res.status == 200 {
            cat_res = wk_res;
        }
    }
    let valid_ard = cat_res.status == 200
        && serde_json::from_str::<serde_json::Value>(&cat_res.body)
            .map(|val| validate_ard_catalog(&val).is_empty())
            .unwrap_or(false);

    AuditReport {
        origin: effective_origin,
        error: None,
        homepage_status: home.status,
        noise,
        llms_txt,
        robots_txt,
        ai_catalog: AiCatalogReport {
            status: cat_res.status,
            valid_ard,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;
    use std::thread;

    fn spawn_http_server<F>(handler: F) -> (String, thread::JoinHandle<()>)
    where
        F: Fn(&str) -> (u16, &'static str, Vec<(&'static str, String)>, String) + Send + Sync + 'static,
    {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let origin = format!("http://{addr}");
        let handle = thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let mut stream = stream;
                let mut reader = BufReader::new(stream.try_clone().unwrap());
                let mut request_line = String::new();
                if reader.read_line(&mut request_line).is_err() {
                    continue;
                }
                // Scarta header rimanenti
                let mut hdr = String::new();
                while reader.read_line(&mut hdr).is_ok() {
                    if hdr.trim().is_empty() {
                        break;
                    }
                    hdr.clear();
                }
                let path = request_line
                    .split_whitespace()
                    .nth(1)
                    .unwrap_or("/");
                if path == "/__stop" {
                    let _ = stream.write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n");
                    break;
                }
                let (status, ctype, extra_headers, body) = handler(path);
                let mut resp = format!(
                    "HTTP/1.1 {status} OK\r\nContent-Type: {ctype}\r\nContent-Length: {}\r\nConnection: close\r\n",
                    body.len()
                );
                for (k, v) in extra_headers {
                    resp.push_str(&format!("{k}: {v}\r\n"));
                }
                resp.push_str("\r\n");
                let _ = stream.write_all(resp.as_bytes());
                let _ = stream.write_all(body.as_bytes());
            }
        });
        (origin, handle)
    }

    #[test]
    fn parses_crlf_robots_and_llms_soft_404() {
        let crlf_robots = "User-agent: GPTBot\r\nDisallow: /\r\nUser-agent: ClaudeBot\r\nAllow: /\r\n";
        let r = parse_robots_txt(200, crlf_robots);
        assert_eq!(r.blocked_ai_bots, vec!["GPTBot"]);

        let soft = parse_llms_txt(200, "text/html; charset=utf-8", "<html><body>404</body></html>");
        assert!(!soft.present);
        assert!(!soft.has_h1);

        let no_h1 = parse_llms_txt(200, "text/plain", "## Solo sottotitolo\nTesto");
        assert!(no_h1.present);
        assert!(!no_h1.has_h1);
    }

    #[test]
    fn audits_local_http_server_and_blocks_unsafe_redirects() {
        let (origin, handle) = spawn_http_server(|path| match path {
            "/" => (
                200,
                "text/html",
                vec![],
                "<html><body><h1>Siliceo</h1><script>var a=1;</script></body></html>".into(),
            ),
            "/llms.txt" => (200, "text/plain", vec![], "# Siliceo\n> Contesto\n".into()),
            "/robots.txt" => (200, "text/plain", vec![], "User-agent: PerplexityBot\r\nDisallow: /\r\n".into()),
            "/ai-catalog.json" => (
                200,
                "application/json",
                vec![],
                r#"{"specVersion":"1.0.0","entries":[{"identifier":"urn:air:siliceo:tools:test","displayName":"Test","type":"application/json","url":"https://progettosiliceo.online/"}]}"#.into(),
            ),
            "/redir-ok" => (302, "text/plain", vec![("Location", "/llms.txt".into())], String::new()),
            "/redir-evil" => (
                302,
                "text/plain",
                vec![("Location", "ftp://evil.example.com/a".into())],
                String::new(),
            ),
            "/redir-loop" => (302, "text/plain", vec![("Location", "/redir-loop".into())], String::new()),
            _ => (404, "text/plain", vec![], "Not found".into()),
        });

        let report = audit_origin(&origin, SsrfPolicy::AllowLocalTest);
        assert_eq!(report.homepage_status, 200);
        assert!(report.error.is_none());
        assert!(report.llms_txt.present && report.llms_txt.has_h1);
        assert_eq!(report.robots_txt.blocked_ai_bots, vec!["PerplexityBot"]);
        assert!(report.ai_catalog.valid_ard);

        let ok_redir = fetch_url(&format!("{origin}/redir-ok"), SsrfPolicy::AllowLocalTest);
        assert_eq!(ok_redir.status, 200);
        assert!(ok_redir.body.starts_with("# Siliceo"));

        let evil_redir = fetch_url(&format!("{origin}/redir-evil"), SsrfPolicy::AllowLocalTest);
        assert!(evil_redir.error.is_some());

        let loop_redir = fetch_url(&format!("{origin}/redir-loop"), SsrfPolicy::AllowLocalTest);
        assert!(loop_redir.error.as_deref().unwrap_or("").contains("redirect"));

        let _ = fetch_url(&format!("{origin}/__stop"), SsrfPolicy::AllowLocalTest);
        let _ = handle.join();
    }

    #[test]
    fn public_policy_rejects_local_targets() {
        let r = audit_origin("http://127.0.0.1:80/", SsrfPolicy::PublicOnly);
        assert_eq!(r.homepage_status, 0);
        assert!(r.error.is_some());
    }
}

