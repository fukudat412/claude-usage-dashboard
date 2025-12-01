use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::{
    config::Config,
    models::{DailyResponse, Pagination},
    services::process_daily_usage,
};

#[derive(Debug, Deserialize)]
pub struct DailyParams {
    #[serde(default = "default_page")]
    page: usize,
    #[serde(default = "default_limit")]
    limit: usize,
}

fn default_page() -> usize {
    1
}

fn default_limit() -> usize {
    50
}

pub async fn get_daily(
    State(config): State<Arc<Config>>,
    Query(params): Query<DailyParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let daily_usage = process_daily_usage(&config.projects_path)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total_items = daily_usage.len();
    let items_per_page = params.limit;
    let current_page = params.page.max(1);
    let total_pages = (total_items + items_per_page - 1) / items_per_page;

    let start = (current_page - 1) * items_per_page;
    let end = (start + items_per_page).min(total_items);

    let data = if start < total_items {
        daily_usage[start..end].to_vec()
    } else {
        Vec::new()
    };

    let response = DailyResponse {
        data,
        pagination: Pagination {
            current_page,
            total_pages,
            total_items,
            items_per_page,
            has_next: current_page < total_pages,
            has_prev: current_page > 1,
        },
    };

    Ok(Json(response))
}
