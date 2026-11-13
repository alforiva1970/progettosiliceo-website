// SPDX-License-Identifier: AGPL-3.0-or-later
//! Aggregatore parallelo per l'Osservatorio Indipendente Navigazione Agentica (`data/observatory.json`).

use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

use crate::audit::{AuditReport, audit_origin, fetch_url};
use crate::html::has_webmcp_markers;
use crate::ssrf::{SsrfPolicy, normalize_target};

#[derive(Debug, Clone)]
pub struct OptInDomainInput {
    pub domain: String,
    pub label: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SectorStats {
    pub sector: String,
    pub sample_size: usize,
    pub llms_txt_valid_pct: f64,
    pub ai_catalog_valid_pct: f64,
    pub avg_html_noise_pct: Option<f64>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OptInShowcaseEntry {
    pub domain: String,
    pub label: String,
    pub notes: String,
    pub reachable: bool,
    pub error: Option<String>,
    pub llms_txt: bool,
    pub ai_catalog: bool,
    pub web_mcp: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ObservatorySnapshot {
    pub title: String,
    pub updated_at: String,
    pub methodology: String,
    pub sectors: Vec<SectorStats>,
    pub opt_in_showcase: Vec<OptInShowcaseEntry>,
}

/// Formatta `SystemTime::now()` in timestamp UTC ISO-8601 (`YYYY-MM-DDTHH:MM:SSZ`) senza dipendenze esterne.
pub fn current_utc_iso8601() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format_unix_utc(secs)
}

pub fn format_unix_utc(secs: u64) -> String {
    let days = (secs / 86_400) as i64;
    let rem = secs % 86_400;
    let hour = rem / 3600;
    let min = (rem % 3600) / 60;
    let sec = rem % 60;

    // Algoritmo calendario civile Howard Hinnant da epoch UNIX (1970-01-01)
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };

    format!("{year:04}-{m:02}-{d:02}T{hour:02}:{min:02}:{sec:02}Z")
}

fn probe_webmcp(origin: &str, policy: SsrfPolicy) -> bool {
    for path in ["", "/agent-ready.html"] {
        let res = fetch_url(&format!("{origin}{path}"), policy);
        if res.status == 200 && has_webmcp_markers(&res.body) {
            return true;
        }
    }
    false
}

/// Genera snapshot aggregato eseguendo gli audit dei campioni in parallelo con `std::thread::scope`.
pub fn build_observatory_snapshot(
    samples: &[(&str, Vec<String>)],
    opt_in_domains: &[OptInDomainInput],
    policy: SsrfPolicy,
) -> ObservatorySnapshot {
    // Raccoglie tutte le origini uniche normalizzate da auditare in parallelo
    let mut unique_urls: Vec<String> = Vec::new();
    let mut normalized_map: HashMap<String, String> = HashMap::new();

    for (_, urls) in samples {
        for raw in urls {
            if let Ok(parsed) = normalize_target(raw)
                && !normalized_map.contains_key(&parsed.origin)
            {
                normalized_map.insert(parsed.origin.clone(), raw.clone());
                unique_urls.push(parsed.origin);
            }
        }
    }
    for entry in opt_in_domains {
        if let Ok(parsed) = normalize_target(&entry.domain)
            && !normalized_map.contains_key(&parsed.origin)
        {
            normalized_map.insert(parsed.origin.clone(), entry.domain.clone());
            unique_urls.push(parsed.origin);
        }
    }

    let mut audits_by_origin: HashMap<String, AuditReport> = HashMap::new();
    std::thread::scope(|scope| {
        let handles: Vec<_> = unique_urls
            .iter()
            .map(|origin_key| {
                scope.spawn(move || (origin_key.clone(), audit_origin(origin_key, policy)))
            })
            .collect();
        for h in handles {
            if let Ok((origin_key, report)) = h.join() {
                audits_by_origin.insert(origin_key, report);
            }
        }
    });

    let mut sectors = Vec::new();
    for (sector_name, urls) in samples {
        if urls.is_empty() {
            continue;
        }
        let mut reachable: Vec<&AuditReport> = Vec::new();
        for raw in urls {
            if let Ok(parsed) = normalize_target(raw)
                && let Some(report) = audits_by_origin.get(&parsed.origin)
                && report.homepage_status == 200
            {
                reachable.push(report);
            }
        }
        let total = reachable.len();
        if total == 0 {
            continue;
        }
        let llms_ok = reachable
            .iter()
            .filter(|a| a.llms_txt.present && a.llms_txt.has_h1)
            .count();
        let ard_ok = reachable.iter().filter(|a| a.ai_catalog.valid_ard).count();
        let avg_noise = (reachable.iter().map(|a| a.noise.noise_percent).sum::<f64>()
            / total as f64
            * 10.0)
            .round()
            / 10.0;

        sectors.push(SectorStats {
            sector: (*sector_name).to_string(),
            sample_size: total,
            llms_txt_valid_pct: ((llms_ok as f64 / total as f64) * 1000.0).round() / 10.0,
            ai_catalog_valid_pct: ((ard_ok as f64 / total as f64) * 1000.0).round() / 10.0,
            avg_html_noise_pct: Some(avg_noise),
        });
    }

    let mut resolved_opt_in = Vec::new();
    for item in opt_in_domains {
        match normalize_target(&item.domain) {
            Err(err) => resolved_opt_in.push(OptInShowcaseEntry {
                domain: item.domain.clone(),
                label: item.label.clone(),
                notes: item.notes.clone(),
                reachable: false,
                error: Some(err),
                llms_txt: false,
                ai_catalog: false,
                web_mcp: false,
            }),
            Ok(parsed) => {
                let report = audits_by_origin.get(&parsed.origin);
                let is_reachable = report.is_some_and(|r| r.homepage_status == 200);
                let err_msg = match report {
                    Some(_) if is_reachable => None,
                    Some(r) => Some(
                        r.error
                            .clone()
                            .unwrap_or_else(|| format!("Homepage HTTP {}", r.homepage_status)),
                    ),
                    None => Some("Audit non eseguito".into()),
                };
                let effective_origin = report
                    .map(|r| r.origin.as_str())
                    .filter(|o| !o.is_empty())
                    .unwrap_or(&parsed.origin);
                let web_mcp = if is_reachable {
                    probe_webmcp(effective_origin, policy)
                } else {
                    false
                };
                resolved_opt_in.push(OptInShowcaseEntry {
                    domain: item.domain.clone(),
                    label: item.label.clone(),
                    notes: item.notes.clone(),
                    reachable: is_reachable,
                    error: err_msg,
                    llms_txt: is_reachable
                        && report.is_some_and(|r| r.llms_txt.present && r.llms_txt.has_h1),
                    ai_catalog: is_reachable && report.is_some_and(|r| r.ai_catalog.valid_ard),
                    web_mcp,
                });
            }
        }
    }

    ObservatorySnapshot {
        title: "Osservatorio Indipendente Navigazione Agentica — Benchmark empirico a cura del Laboratorio di Ricerca Progetto Siliceo".into(),
        updated_at: current_utc_iso8601(),
        methodology: "Rilevazione automatica da endpoint pubblici standard (/llms.txt, /robots.txt, /ai-catalog.json) senza cookie ne autenticazione. Statistiche aggregate per settore; vetrina singoli domini esclusivamente opt-in.".into(),
        sectors,
        opt_in_showcase: resolved_opt_in,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_unix_epoch_to_iso8601_utc() {
        assert_eq!(format_unix_utc(0), "1970-01-01T00:00:00Z");
        assert_eq!(format_unix_utc(1_794_612_845), "2026-11-13T23:34:05Z");
    }

    #[test]
    fn reports_explicit_unreachable_status_in_opt_in_showcase() {
        let samples = [("Test", vec!["http://127.0.0.1:9".to_string()])];
        let opt_in = vec![
            OptInDomainInput {
                domain: "http://127.0.0.1:9".into(),
                label: "Chiuso".into(),
                notes: "Test offline".into(),
            },
            OptInDomainInput {
                domain: "ftp://invalid.example".into(),
                label: "Schema Errato".into(),
                notes: "Test URL".into(),
            },
        ];
        let snap = build_observatory_snapshot(&samples, &opt_in, SsrfPolicy::PublicOnly);
        assert!(snap.sectors.is_empty());
        assert_eq!(snap.opt_in_showcase.len(), 2);
        assert!(!snap.opt_in_showcase[0].reachable);
        assert!(snap.opt_in_showcase[0].error.is_some());
        assert!(!snap.opt_in_showcase[1].reachable);
        assert!(snap.opt_in_showcase[1].error.as_deref().unwrap().contains("http"));
    }
}

