// SPDX-License-Identifier: AGPL-3.0-or-later
//! Estrazione testo visibile da HTML, calcolo rapporto segnale/rumore e rilevamento marker WebMCP.

use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct NoiseMetrics {
    pub html_bytes: usize,
    pub text_bytes: usize,
    pub noise_percent: f64,
}

const IGNORED_TAGS: &[&str] = &["script", "style", "svg", "noscript"];

/// Estrae il testo visibile da un documento HTML ignorando commenti, `script`, `style`, `svg`, `noscript` e tag.
pub fn extract_visible_text(html: &str) -> String {
    let bytes = html.as_bytes();
    let len = bytes.len();
    let mut i = 0;
    let mut ignored_depth: usize = 0;
    let mut out = String::with_capacity(len / 4);
    let mut pending_space = false;

    while i < len {
        if bytes[i] == b'<' {
            // Commento HTML <!-- ... -->
            if bytes[i..].starts_with(b"<!--") {
                if let Some(end_rel) = find_bytes(&bytes[i + 4..], b"-->") {
                    i += 4 + end_rel + 3;
                } else {
                    break;
                }
                pending_space = true;
                continue;
            }

            if let Some(close_rel) = bytes[i + 1..].iter().position(|&b| b == b'>') {
                let raw_tag = &html[i + 1..i + 1 + close_rel];
                let trimmed = raw_tag.trim();
                let is_closing = trimmed.starts_with('/');
                let is_self_closing = trimmed.ends_with('/');
                let name_slice = trimmed.trim_start_matches('/');
                let tag_name = name_slice
                    .split(|c: char| c.is_whitespace() || c == '/')
                    .next()
                    .unwrap_or("")
                    .to_ascii_lowercase();

                if IGNORED_TAGS.contains(&tag_name.as_str()) {
                    if is_closing {
                        ignored_depth = ignored_depth.saturating_sub(1);
                    } else if !is_self_closing {
                        ignored_depth += 1;
                    }
                }
                i += 1 + close_rel + 1;
                pending_space = true;
                continue;
            }
        }

        // Carattere testo fuori dai tag
        let ch = html[i..].chars().next().unwrap();
        i += ch.len_utf8();
        if ignored_depth > 0 {
            continue;
        }
        if ch.is_whitespace() {
            pending_space = true;
        } else {
            if pending_space && !out.is_empty() {
                out.push(' ');
            }
            pending_space = false;
            out.push(ch);
        }
    }

    out
}

fn find_bytes(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}

/// Calcola il rapporto tra byte HTML grezzi e testo visibile estratto.
pub fn compute_noise_ratio(html: &str) -> NoiseMetrics {
    let html_bytes = html.len();
    if html_bytes == 0 {
        return NoiseMetrics {
            html_bytes: 0,
            text_bytes: 0,
            noise_percent: 0.0,
        };
    }
    let text = extract_visible_text(html);
    let text_bytes = text.len().min(html_bytes);
    let raw_pct = (1.0 - (text_bytes as f64 / html_bytes as f64)) * 100.0;
    let noise_percent = (raw_pct * 10.0).round() / 10.0;
    NoiseMetrics {
        html_bytes,
        text_bytes,
        noise_percent,
    }
}

/// Rileva marker WebMCP dichiarativi (`toolname=`) o imperativi (`navigator.modelContext`).
pub fn has_webmcp_markers(body: &str) -> bool {
    let lower = body.to_ascii_lowercase();
    lower.contains("toolname=") || lower.contains("navigator.modelcontext")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_scripts_styles_svg_noscript_and_comments() {
        let html = r#"<html><head><style>body{color:red}</style><script>const x = 1;</script></head><body><!-- nota --><svg><path d="M0"/><text>hidden</text></svg><noscript>Attiva JS</noscript><h1>Progetto Siliceo</h1><p>Ciao   Mondo</p></body></html>"#;
        let text = extract_visible_text(html);
        assert_eq!(text, "Progetto Siliceo Ciao Mondo");
    }

    #[test]
    fn computes_noise_ratio_and_empty_html() {
        let empty = compute_noise_ratio("");
        assert_eq!(empty.html_bytes, 0);
        assert_eq!(empty.text_bytes, 0);
        assert_eq!(empty.noise_percent, 0.0);

        let sample = "<html><body><div>Ciao mondo</div><script>/* padding */</script></body></html>";
        let m = compute_noise_ratio(sample);
        assert_eq!(m.html_bytes, sample.len());
        assert_eq!(m.text_bytes, "Ciao mondo".len());
        let expected = ((1.0 - (10.0 / sample.len() as f64)) * 1000.0).round() / 10.0;
        assert_eq!(m.noise_percent, expected);
    }

    #[test]
    fn detects_webmcp_markers_case_insensitively() {
        assert!(has_webmcp_markers(r#"<form toolname="siliceo_agent_audit">"#));
        assert!(has_webmcp_markers("if (navigator.modelContext) {}"));
        assert!(!has_webmcp_markers("<form action='/search'></form>"));
    }
}

