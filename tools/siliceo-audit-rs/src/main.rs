// SPDX-License-Identifier: AGPL-3.0-or-later
//! CLI `siliceo-audit` (AGPL-3.0) per controllo locale Agent-Ready, validazione ARD e aggiornamento Osservatorio.

use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

use siliceo_audit::ard::validate_ard_catalog;
use siliceo_audit::audit::audit_origin;
use siliceo_audit::observatory::{OptInDomainInput, build_observatory_snapshot};
use siliceo_audit::ssrf::SsrfPolicy;

fn print_usage() {
    eprintln!(
        "Uso:\n  \
         siliceo-audit check <url>\n  \
         siliceo-audit validate-ard <path/to/ai-catalog.json>\n  \
         siliceo-audit observatory [path/to/observatory.json]"
    );
}

fn cmd_check(args: &[String]) -> ExitCode {
    let Some(url) = args.first() else {
        print_usage();
        return ExitCode::from(2);
    };
    let report = audit_origin(url, SsrfPolicy::PublicOnly);
    match serde_json::to_string_pretty(&report) {
        Ok(json) => {
            println!("{json}");
            ExitCode::SUCCESS
        }
        Err(err) => {
            eprintln!("ERROR: serializzazione JSON fallita: {err}");
            ExitCode::from(1)
        }
    }
}

fn cmd_validate_ard(args: &[String]) -> ExitCode {
    let Some(path) = args.first() else {
        print_usage();
        return ExitCode::from(2);
    };
    let raw = match fs::read_to_string(path) {
        Ok(s) => s,
        Err(err) => {
            eprintln!("ERROR: impossibile leggere '{path}': {err}");
            return ExitCode::from(1);
        }
    };
    let value: serde_json::Value = match serde_json::from_str(&raw) {
        Ok(v) => v,
        Err(err) => {
            eprintln!("ERROR: '{path}' non è JSON valido: {err}");
            return ExitCode::from(1);
        }
    };
    let errors = validate_ard_catalog(&value);
    if !errors.is_empty() {
        for err in &errors {
            eprintln!("ERROR: {err}");
        }
        return ExitCode::from(1);
    }
    let count = value
        .get("entries")
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0);
    println!("OK: {path} conforme ai requisiti core ARD ({count} entries).");
    ExitCode::SUCCESS
}

fn cmd_observatory(args: &[String]) -> ExitCode {
    let out_path = args
        .first()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("data/observatory.json"));

    let samples = [(
        "Ricerca & AI Open-Source",
        vec!["https://progettosiliceo.online".to_string()],
    )];
    let opt_in = [OptInDomainInput {
        domain: "progettosiliceo.online".into(),
        label: "Progetto Siliceo (Caso Studio Vivente)".into(),
        notes: "Baseline Pietra & Candela v2.0 — rilevazione live da endpoint pubblici".into(),
    }];

    let snapshot = build_observatory_snapshot(&samples, &opt_in, SsrfPolicy::PublicOnly);
    if let Some(parent) = out_path.parent()
        && !parent.as_os_str().is_empty()
        && let Err(err) = fs::create_dir_all(parent)
    {
        eprintln!("ERROR: creazione cartella output fallita: {err}");
        return ExitCode::from(1);
    }

    match serde_json::to_string_pretty(&snapshot) {
        Ok(json) => {
            if let Err(err) = fs::write(&out_path, format!("{json}\n")) {
                eprintln!("ERROR: scrittura {} fallita: {err}", out_path.display());
                return ExitCode::from(1);
            }
            println!("Scritto {}", out_path.display());
            ExitCode::SUCCESS
        }
        Err(err) => {
            eprintln!("ERROR: serializzazione snapshot fallita: {err}");
            ExitCode::from(1)
        }
    }
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let Some((cmd, rest)) = args.split_first() else {
        print_usage();
        return ExitCode::from(2);
    };

    match cmd.as_str() {
        "check" => cmd_check(rest),
        "validate-ard" => cmd_validate_ard(rest),
        "observatory" => cmd_observatory(rest),
        "-h" | "--help" | "help" => {
            print_usage();
            ExitCode::SUCCESS
        }
        _ => {
            eprintln!("Comando sconosciuto: {cmd}");
            print_usage();
            ExitCode::from(2)
        }
    }
}

