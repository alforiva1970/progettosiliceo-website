// SPDX-License-Identifier: AGPL-3.0-or-later
//! Normalizzazione URL, classificazione IP/host anti-SSRF e controllo DNS pre-connessione.

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, ToSocketAddrs};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SsrfPolicy {
    PublicOnly,
    AllowLocalTest,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedTarget {
    pub normalized_url: String,
    pub origin: String,
    pub scheme: String,
    pub host: String,
    pub port: u16,
    pub path_and_query: String,
}

fn default_port(scheme: &str) -> u16 {
    if scheme == "http" { 80 } else { 443 }
}

fn extract_explicit_scheme(raw: &str) -> Option<(&str, &str)> {
    let bytes = raw.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        let b = bytes[i];
        if b == b':' {
            if i == 0 {
                return None;
            }
            return Some((&raw[..i], &raw[i + 1..]));
        }
        let valid_first = i == 0 && b.is_ascii_alphabetic();
        let valid_rest = i > 0 && (b.is_ascii_alphanumeric() || matches!(b, b'+' | b'-' | b'.'));
        if !(valid_first || valid_rest) {
            return None;
        }
        i += 1;
    }
    None
}

/// Normalizza un URL http/https o hostname privo di schema, rifiutando credenziali, porte invalide e schemi non HTTP.
pub fn normalize_target(raw_url: &str) -> Result<ParsedTarget, String> {
    let cleaned = raw_url.trim();
    if cleaned.is_empty() {
        return Err("URL mancante o non valido".into());
    }
    if cleaned.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err("URL non valido".into());
    }

    let (scheme, rest) = if let Some((s, after_colon)) = extract_explicit_scheme(cleaned) {
        let lower_scheme = s.to_ascii_lowercase();
        if let Some(after_slashes) = after_colon.strip_prefix("//") {
            if lower_scheme != "http" && lower_scheme != "https" {
                return Err("Consentiti solo URL http o https".into());
            }
            (lower_scheme, after_slashes)
        } else {
            // Caso host:port senza schema (es. example.com:8080?x=1) vs javascript:alert(1)
            let head = after_colon.split(['/', '?', '#']).next().unwrap_or("");
            let is_port = !head.is_empty() && head.bytes().all(|b| b.is_ascii_digit());
            if is_port {
                ("https".to_string(), cleaned)
            } else {
                return Err("Consentiti solo URL http o https".into());
            }
        }
    } else {
        let stripped = cleaned.trim_start_matches('/');
        if stripped.is_empty() {
            return Err("URL non valido".into());
        }
        ("https".to_string(), stripped)
    };

    let (authority, tail) = match rest.find(['/', '?', '#']) {
        Some(idx) => (&rest[..idx], &rest[idx..]),
        None => (rest, ""),
    };

    if authority.is_empty() {
        return Err("URL non valido".into());
    }
    if authority.contains('@') {
        return Err("Credenziali nell'URL non consentite".into());
    }

    let (host, port) = parse_authority(authority, &scheme)?;

    // Rimuove #fragment e mantiene path/query pulito
    let path_no_frag = tail.split('#').next().unwrap_or("");
    let path_and_query = if path_no_frag.is_empty() {
        "/".to_string()
    } else if path_no_frag.starts_with('?') {
        format!("/{path_no_frag}")
    } else {
        path_no_frag.to_string()
    };

    let formatted_host = if host.contains(':') {
        format!("[{host}]")
    } else {
        host.clone()
    };

    let origin = if port == default_port(&scheme) {
        format!("{scheme}://{formatted_host}")
    } else {
        format!("{scheme}://{formatted_host}:{port}")
    };

    let normalized_url = if path_no_frag.is_empty() {
        format!("{origin}/")
    } else {
        format!("{origin}{path_and_query}")
    };

    Ok(ParsedTarget {
        normalized_url,
        origin,
        scheme,
        host,
        port,
        path_and_query,
    })
}

fn parse_authority(authority: &str, scheme: &str) -> Result<(String, u16), String> {
    if let Some(after_open) = authority.strip_prefix('[') {
        let close_idx = after_open
            .find(']')
            .ok_or_else(|| "Indirizzo IPv6 malformato".to_string())?;
        let raw_ip = &after_open[..close_idx];
        let parsed_v6: Ipv6Addr = raw_ip
            .parse()
            .map_err(|_| "Indirizzo IPv6 non valido".to_string())?;
        let rem = &after_open[close_idx + 1..];
        let port = if rem.is_empty() {
            default_port(scheme)
        } else if let Some(port_str) = rem.strip_prefix(':') {
            parse_port(port_str)?
        } else {
            return Err("Porta non valida".into());
        };
        return Ok((parsed_v6.to_string(), port));
    }

    if let Some((host_part, port_part)) = authority.rsplit_once(':') {
        if host_part.contains(':') {
            return Err("IPv6 senza parentesi quadre".into());
        }
        let host = validate_host_chars(host_part)?;
        let port = parse_port(port_part)?;
        Ok((host, port))
    } else {
        let host = validate_host_chars(authority)?;
        Ok((host, default_port(scheme)))
    }
}

fn validate_host_chars(host: &str) -> Result<String, String> {
    let lower = host.trim_end_matches('.').to_ascii_lowercase();
    if lower.is_empty() {
        return Err("Host mancante".into());
    }
    if lower
        .bytes()
        .any(|b| !(b.is_ascii_alphanumeric() || matches!(b, b'.' | b'-' | b'_' | b':')))
    {
        return Err("Caratteri non validi nell'host".into());
    }
    Ok(lower)
}

fn parse_port(raw: &str) -> Result<u16, String> {
    let p: u16 = raw.parse().map_err(|_| "Porta non valida".to_string())?;
    if p == 0 {
        return Err("Porta 0 non consentita".into());
    }
    Ok(p)
}

/// Risolve un header `Location` relativo o assoluto rispetto al target corrente.
pub fn resolve_redirect_target(base: &ParsedTarget, location: &str) -> Result<ParsedTarget, String> {
    let loc = location.trim();
    if loc.is_empty() {
        return Err("Header Location vuoto".into());
    }
    if let Some(after_slashes) = loc.strip_prefix("//") {
        return normalize_target(&format!("{}://{after_slashes}", base.scheme));
    }
    if loc.contains("://") || extract_explicit_scheme(loc).is_some_and(|(s, a)| !a.starts_with('/') && !s.is_empty() && !loc.starts_with('/')) {
        // Potrebbe essere uno schema esplicito (http://, ftp://, javascript:)
        if let Some((_, after)) = extract_explicit_scheme(loc)
            && !after.is_empty()
        {
            return normalize_target(loc);
        }
    }
    if loc.starts_with('/') {
        return normalize_target(&format!("{}{loc}", base.origin));
    }
    if loc.starts_with('?') {
        let base_path = base.path_and_query.split('?').next().unwrap_or("/");
        return normalize_target(&format!("{}{base_path}{loc}", base.origin));
    }
    let current_path = base.path_and_query.split('?').next().unwrap_or("/");
    let parent_dir = match current_path.rfind('/') {
        Some(pos) => &current_path[..=pos],
        None => "/",
    };
    normalize_target(&format!("{}{parent_dir}{loc}", base.origin))
}

/// Restituisce `true` se l'indirizzo IP appartiene a reti private, loopback, link-local, metadata o riservate.
pub fn is_blocked_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => is_blocked_v4(v4),
        IpAddr::V6(v6) => is_blocked_v6(v6),
    }
}

fn is_blocked_v4(v4: Ipv4Addr) -> bool {
    let [a, b, _, _] = v4.octets();
    v4.is_loopback()
        || v4.is_private()
        || v4.is_link_local()
        || v4.is_broadcast()
        || v4.is_documentation()
        || v4.is_multicast()
        || v4.is_unspecified()
        || a == 0 // 0.0.0.0/8 "this network"
        || (a == 100 && (64..=127).contains(&b)) // 100.64.0.0/10 CGNAT
        || (a == 198 && (b == 18 || b == 19)) // 198.18.0.0/15 benchmarking
        || a >= 240 // 240.0.0.0/4 reserved
}

fn is_blocked_v6(v6: Ipv6Addr) -> bool {
    if v6.is_loopback() || v6.is_unspecified() || v6.is_multicast() {
        return true;
    }
    let seg = v6.segments();
    // ULA fc00::/7
    if (seg[0] & 0xfe00) == 0xfc00 {
        return true;
    }
    // Link-local fe80::/10
    if (seg[0] & 0xffc0) == 0xfe80 {
        return true;
    }
    // Site-local fec0::/10 (deprecato)
    if (seg[0] & 0xffc0) == 0xfec0 {
        return true;
    }
    // Documentation 2001:db8::/32
    if seg[0] == 0x2001 && seg[1] == 0x0db8 {
        return true;
    }
    // Benchmarking 2001:2::/48
    if seg[0] == 0x2001 && seg[1] == 0x0002 && seg[2] == 0 {
        return true;
    }
    // IPv4-mapped ::ffff:0:0/96
    if let Some(mapped) = v6.to_ipv4_mapped() {
        return is_blocked_v4(mapped);
    }
    // IPv4-compatible ::/96 e NAT64 64:ff9b::/96 / 64:ff9b:1::/48
    if (seg[0] == 0 && seg[1] == 0 && seg[2] == 0 && seg[3] == 0 && seg[4] == 0 && seg[5] == 0)
        || (seg[0] == 0x0064 && seg[1] == 0xff9b && seg[2] == 0 && seg[3] == 0 && seg[4] == 0 && seg[5] == 0)
        || (seg[0] == 0x0064 && seg[1] == 0xff9b && seg[2] == 0x0001)
    {
        return true;
    }
    false
}

/// Restituisce `true` se l'hostname o IP letterale è bloccato in modalità pubblica.
pub fn is_blocked_hostname(host: &str) -> bool {
    let lower = host.trim_end_matches('.').to_ascii_lowercase();
    if lower == "localhost"
        || lower == "metadata.google.internal"
        || lower.ends_with(".localhost")
        || lower.ends_with(".local")
        || lower.ends_with(".internal")
        || lower.ends_with(".localdomain")
    {
        return true;
    }
    if let Ok(ip) = lower.parse::<IpAddr>() {
        return is_blocked_ip(ip);
    }
    false
}

/// Verifica policy SSRF sull'hostname e, se `PublicOnly`, risolve i record DNS verificando che ogni IP sia pubblico.
pub fn validate_target_network(target: &ParsedTarget, policy: SsrfPolicy) -> Result<(), String> {
    if policy == SsrfPolicy::AllowLocalTest {
        return Ok(());
    }
    if is_blocked_hostname(&target.host) {
        return Err("Host privato, loopback o metadata non consentito".into());
    }
    if let Ok(ip) = target.host.parse::<IpAddr>() {
        if is_blocked_ip(ip) {
            return Err("Indirizzo IP non pubblico".into());
        }
        return Ok(());
    }

    let addr_pair = format!("{}:{}", target.host, target.port);
    let addrs = addr_pair
        .to_socket_addrs()
        .map_err(|e| format!("Risoluzione DNS fallita per {}: {e}", target.host))?;

    let mut saw_any = false;
    for sock in addrs {
        saw_any = true;
        if is_blocked_ip(sock.ip()) {
            return Err("L'host risolve verso un indirizzo IP privato o riservato".into());
        }
    }
    if !saw_any {
        return Err(format!("Nessun indirizzo DNS trovato per {}", target.host));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_clean_and_schemeless_urls_with_port_and_query() {
        let t1 = normalize_target("https://progettosiliceo.online/some/page#top").unwrap();
        assert_eq!(t1.origin, "https://progettosiliceo.online");
        assert_eq!(t1.normalized_url, "https://progettosiliceo.online/some/page");

        let t2 = normalize_target("Example.COM:8080?foo=bar").unwrap();
        assert_eq!(t2.origin, "https://example.com:8080");
        assert_eq!(t2.normalized_url, "https://example.com:8080/?foo=bar");
    }

    #[test]
    fn rejects_credentials_bad_schemes_and_private_hosts() {
        assert!(normalize_target("ftp://example.com").is_err());
        assert!(normalize_target("javascript:alert(1)").is_err());
        assert!(normalize_target("https://user:pass@example.com/").is_err());
        assert!(normalize_target("https://example.com:0/").is_err());
        assert!(normalize_target("https://user@localhost/").is_err());

        for blocked in [
            "http://localhost/test",
            "http://127.0.0.1/",
            "http://10.0.0.5/",
            "http://172.16.0.1/",
            "http://192.168.1.1/",
            "http://169.254.169.254/latest/meta-data/",
            "http://100.64.0.1/",
            "http://[::1]/",
            "http://[::ffff:127.0.0.1]/",
            "http://[64:ff9b::10.0.0.1]/",
            "https://printer.local/",
            "https://service.internal/",
        ] {
            let parsed = normalize_target(blocked).unwrap();
            assert!(
                validate_target_network(&parsed, SsrfPolicy::PublicOnly).is_err(),
                "atteso blocco SSRF per {blocked}"
            );
        }
    }

    #[test]
    fn resolves_relative_and_cross_origin_redirects() {
        let base = normalize_target("https://example.com/docs/intro").unwrap();
        assert_eq!(
            resolve_redirect_target(&base, "/agent-ready.html").unwrap().normalized_url,
            "https://example.com/agent-ready.html"
        );
        assert_eq!(
            resolve_redirect_target(&base, "next.html?v=2").unwrap().normalized_url,
            "https://example.com/docs/next.html?v=2"
        );
        assert_eq!(
            resolve_redirect_target(&base, "//cdn.example.org/x").unwrap().origin,
            "https://cdn.example.org"
        );
        assert!(resolve_redirect_target(&base, "ftp://evil.example/x").is_err());
    }
}

