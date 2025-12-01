mod config;
mod models;
mod routes;
mod services;

use axum::{
    routing::get,
    Router,
};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Config;
use routes::{get_daily, get_monthly, get_models, get_projects};

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "rust_backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Arc::new(Config::from_env());
    let port = config.port;

    // Setup CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build our application with routes
    let app = Router::new()
        .route("/api/v2/daily", get(get_daily))
        .route("/api/v2/monthly", get(get_monthly))
        .route("/api/v2/models", get(get_models))
        .route("/api/v2/projects", get(get_projects))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(config);

    // Run the server
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .unwrap();

    tracing::info!("Rust backend listening on port {}", port);
    tracing::info!("Endpoint: http://localhost:{}/api/v2/daily", port);

    axum::serve(listener, app).await.unwrap();
}
