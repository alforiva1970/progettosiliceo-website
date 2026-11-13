// SPDX-License-Identifier: AGPL-3.0-or-later
//! Validatore schema core per manifest Agentic Resource Discovery (`ai-catalog.json`).

use serde_json::Value;

fn is_valid_urn_segment(seg: &str) -> bool {
    let bytes = seg.as_bytes();
    !bytes.is_empty()
        && (bytes[0].is_ascii_lowercase() || bytes[0].is_ascii_digit())
        && bytes
            .iter()
            .all(|&b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

/// Verifica formato esatto `urn:air:<pub>:<ns>:<name>` senza trailing newline.
pub fn is_valid_ard_urn(urn: &str) -> bool {
    let parts: Vec<&str> = urn.split(':').collect();
    parts.len() == 5
        && parts[0] == "urn"
        && parts[1] == "air"
        && is_valid_urn_segment(parts[2])
        && is_valid_urn_segment(parts[3])
        && is_valid_urn_segment(parts[4])
}

/// Verifica formato RFC media-type `type/subtype` (con opzionali parametri dopo `;`).
pub fn is_valid_media_type(raw: &str) -> bool {
    if raw.contains('\n') || raw.contains('\r') {
        return false;
    }
    let trimmed = raw.trim();
    let main_part = trimmed.split(';').next().unwrap_or("").trim();
    let Some((t, sub)) = main_part.split_once('/') else {
        return false;
    };
    let valid_part = |s: &str| {
        !s.is_empty()
            && s.bytes()
                .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'!' | b'#' | b'$' | b'&' | b'-' | b'^' | b'_' | b'.' | b'+'))
    };
    valid_part(t) && valid_part(sub)
}

fn is_valid_https_url(raw: &str) -> bool {
    let Some(rest) = raw.strip_prefix("https://") else {
        return false;
    };
    if rest.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return false;
    }
    let host = rest.split(['/', '?', '#']).next().unwrap_or("");
    !host.is_empty()
}

fn validate_entry(idx: usize, entry: &Value) -> Vec<String> {
    let Some(obj) = entry.as_object() else {
        return vec![format!("entries[{idx}]: deve essere un oggetto JSON.")];
    };
    let mut errors = Vec::new();

    let ident = obj.get("identifier").and_then(Value::as_str).unwrap_or("");
    if !is_valid_ard_urn(ident) {
        errors.push(format!(
            "entries[{idx}]: identifier '{ident}' non rispetta formato urn:air:<pub>:<ns>:<name>."
        ));
    }

    let display = obj.get("displayName").and_then(Value::as_str).unwrap_or("").trim();
    if display.is_empty() {
        errors.push(format!("entries[{idx}]: displayName mancante o vuoto."));
    }

    let media_type = obj.get("type").and_then(Value::as_str).unwrap_or("");
    if !is_valid_media_type(media_type) {
        errors.push(format!("entries[{idx}]: type media-type mancante o non valido."));
    }

    let has_url_key = obj.contains_key("url");
    let has_valid_url = obj
        .get("url")
        .and_then(Value::as_str)
        .is_some_and(is_valid_https_url);
    if has_url_key && !has_valid_url {
        errors.push(format!("entries[{idx}]: url presente ma non è un URL https:// valido."));
    }

    let has_data = obj.get("data").is_some_and(Value::is_object);
    if !has_valid_url && !has_data {
        errors.push(format!(
            "entries[{idx}]: richiesto almeno url o data inline (url deve usare https://)."
        ));
    }

    if let Some(queries) = obj.get("representativeQueries") {
        match queries.as_array() {
            Some(arr)
                if arr
                    .iter()
                    .all(|q| q.as_str().is_some_and(|s| !s.trim().is_empty())) => {}
            _ => errors.push(format!(
                "entries[{idx}]: representativeQueries deve essere una lista di stringhe non vuote."
            )),
        }
    }

    errors
}

/// Valida i campi core di un documento ARD `ai-catalog.json` e restituisce l'elenco degli errori trovati.
pub fn validate_ard_catalog(data: &Value) -> Vec<String> {
    let Some(root) = data.as_object() else {
        return vec!["Root JSON deve essere un oggetto.".into()];
    };
    let mut errors = Vec::new();

    if root
        .get("specVersion")
        .and_then(Value::as_str)
        .is_none_or(|s| s.trim().is_empty())
    {
        errors.push("Campo obbligatorio 'specVersion' mancante.".into());
    }

    match root.get("entries").and_then(Value::as_array) {
        Some(entries) if !entries.is_empty() => {
            for (idx, entry) in entries.iter().enumerate() {
                errors.extend(validate_entry(idx, entry));
            }
        }
        _ => errors.push("Campo 'entries' deve essere una lista non vuota.".into()),
    }

    errors
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn validates_valid_catalog_and_inline_data() {
        let valid = json!({
            "specVersion": "1.0.0",
            "entries": [{
                "identifier": "urn:air:progettosiliceo:tools:agent-audit",
                "displayName": "Siliceo Audit",
                "type": "application/mcp-server-card+json",
                "data": { "capabilities": ["audit"] },
                "representativeQueries": ["Verifica llms.txt"]
            }]
        });
        assert!(validate_ard_catalog(&valid).is_empty());
    }

    #[test]
    fn rejects_invalid_urn_url_with_data_and_trailing_newlines() {
        let bad = json!({
            "specVersion": "1.0.0",
            "entries": [{
                "identifier": "urn:air:siliceo:tools:test\n",
                "displayName": "Test",
                "type": "application/json",
                "url": "http://insecure.example.com",
                "data": {"ok": true},
                "representativeQueries": ["  "]
            }]
        });
        let errs = validate_ard_catalog(&bad);
        assert!(errs.iter().any(|e| e.contains("urn:air")));
        assert!(errs.iter().any(|e| e.contains("https://")));
        assert!(errs.iter().any(|e| e.contains("representativeQueries")));
    }

    #[test]
    fn validates_real_repo_ai_catalog_json() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../ai-catalog.json");
        let raw = std::fs::read_to_string(path).expect("ai-catalog.json presente");
        let val: Value = serde_json::from_str(&raw).expect("JSON valido");
        let errs = validate_ard_catalog(&val);
        assert!(errs.is_empty(), "Errori ARD inattesi: {errs:?}");
    }
}

