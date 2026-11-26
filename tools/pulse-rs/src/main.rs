//! Siliceo Pulse — server di telemetria etica, in Rust.
//!
//! Porting 1:1 del server Python (`tools/pulse/pulse_server.py`):
//! zero cookie, zero IP, contatori aggregati su SQLite.
//! Endpoint: POST /pulse, GET /stats, GET /dashboard, GET /health.

use axum::{
    extract::State,
    http::StatusCode,
    response::{Html, IntoResponse, Json},
    routing::{get, post},
    Router,
};
use rusqlite::Connection;
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    date TEXT NOT NULL,
    path TEXT NOT NULL,
    lang TEXT NOT NULL,
    referrer TEXT NOT NULL,
    device TEXT NOT NULL,
    title TEXT
);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(date);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
"#;

#[derive(Clone)]
struct AppState {
    db: Arc<Mutex<Connection>>,
}

#[derive(Deserialize)]
struct PulsePayload {
    #[serde(default = "d_path")]
    p: String,
    #[serde(default = "d_lang")]
    l: String,
    #[serde(default = "d_ref")]
    r: String,
    #[serde(default = "d_device")]
    d: String,
    #[serde(default)]
    t: String,
    #[serde(default)]
    ts: Option<i64>,
}

fn d_path() -> String { "/".into() }
fn d_lang() -> String { "it".into() }
fn d_ref() -> String { "direct".into() }
fn d_device() -> String { "desktop".into() }

fn clip(s: &str, n: usize) -> String {
    s.chars().take(n).collect()
}

fn record(db: &Connection, p: &PulsePayload) -> rusqlite::Result<()> {
    let mut path = p.p.clone();
    if let Some(x) = path.split('?').next() { path = x.to_string(); }
    if let Some(x) = path.split('#').next() { path = x.to_string(); }
    if !path.starts_with('/') { path = format!("/{path}"); }
    let lang = clip(&p.l, 5).to_lowercase();
    let r = clip(&p.r, 30).to_lowercase();
    let d = clip(&p.d, 10).to_lowercase();
    let t = clip(&p.t, 80);
    let ts = p.ts.unwrap_or_else(|| chrono::Utc::now().timestamp_millis());
    let date = chrono::DateTime::from_timestamp_millis(ts)
        .map(|d| d.format("%Y-%m-%d").to_string())
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());
    db.execute(
        "INSERT INTO page_views (timestamp,date,path,lang,referrer,device,title) \
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        rusqlite::params![ts, date, path, lang, r, d, t],
    )?;
    Ok(())
}

fn agg(db: &Connection, key: &str, sql: &str) -> Vec<Value> {
    let mut out = Vec::new();
    let Ok(mut stmt) = db.prepare(sql) else { return out };
    let Ok(rows) = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    }) else { return out };
    for r in rows.flatten() {
        let mut m = serde_json::Map::new();
        m.insert(key.to_string(), json!(r.0));
        m.insert("count".to_string(), json!(r.1));
        out.push(Value::Object(m));
    }
    out
}

async fn pulse(State(st): State<AppState>, body: String) -> impl IntoResponse {
    let p: PulsePayload = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error":"json"}))),
    };
    let db = st.db.lock().unwrap();
    match record(&db, &p) {
        Ok(()) => (StatusCode::OK, Json(json!({"status":"ok"}))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))),
    }
}

async fn stats(State(st): State<AppState>) -> impl IntoResponse {
    let db = st.db.lock().unwrap();
    let total: i64 = db
        .query_row("SELECT COUNT(*) FROM page_views", [], |r| r.get(0))
        .unwrap_or(0);
    let by_path = agg(&db, "path", "SELECT path, COUNT(*) c FROM page_views GROUP BY path ORDER BY c DESC LIMIT 50");
    let by_lang = agg(&db, "lang", "SELECT lang, COUNT(*) c FROM page_views GROUP BY lang ORDER BY c DESC");
    let by_ref = agg(&db, "referrer", "SELECT referrer, COUNT(*) c FROM page_views GROUP BY referrer ORDER BY c DESC LIMIT 50");
    let by_device = agg(&db, "device", "SELECT device, COUNT(*) c FROM page_views GROUP BY device ORDER BY c DESC");
    let by_date = agg(&db, "date", "SELECT date, COUNT(*) c FROM page_views GROUP BY date ORDER BY date DESC LIMIT 60");
    Json(json!({
        "total_views": total,
        "by_path": by_path,
        "by_lang": by_lang,
        "by_referrer": by_ref,
        "by_device": by_device,
        "by_date": by_date,
    }))
}

async fn dashboard() -> Html<&'static str> {
    Html(include_str!("dashboard.html"))
}

async fn health() -> impl IntoResponse {
    Json(json!({"status":"ok","service":"siliceo-pulse-rs","version":"0.1.0"}))
}

#[tokio::main]
async fn main() {
    let db_path = std::env::var("PULSE_DB")
        .unwrap_or_else(|_| "data/pulse.db".to_string());
    if let Some(parent) = std::path::Path::new(&db_path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let conn = Connection::open(&db_path).expect("apertura DB");
    conn.execute_batch(SCHEMA).expect("schema");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/pulse", post(pulse))
        .route("/api/pulse", post(pulse))
        .route("/stats", get(stats))
        .route("/api/pulse/stats", get(stats))
        .route("/dashboard", get(dashboard))
        .route("/api/pulse/dashboard", get(dashboard))
        .route("/", get(dashboard))
        .route("/health", get(health))
        .layer(cors)
        .with_state(AppState { db: Arc::new(Mutex::new(conn)) });

    let bind = std::env::var("PULSE_BIND").unwrap_or_else(|_| "127.0.0.1:8091".to_string());
    let listener = tokio::net::TcpListener::bind(&bind).await.expect("bind");
    println!("pulse-rs in ascolto su http://{bind} (db: {db_path})");
    axum::serve(listener, app).await.expect("server");
}
