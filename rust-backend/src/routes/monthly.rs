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
    models::{Pagination, MonthlyUsage},
    services::process_monthly_usage,
};

#[derive(Debug, Deserialize)]
pub struct MonthlyParams {
    #[serde(default = "default_page")]
    page: usize,
    #[serde(default = "default_limit")]
    limit: usize,
    year: Option<String>,
}

fn default_page() -> usize {
    1
}

fn default_limit() -> usize {
    12
}

#[derive(serde::Serialize)]
pub struct MonthlyResponse {
    data: Vec<MonthlyUsage>,
    pagination: Pagination,
}

pub async fn get_monthly(
    State(config): State<Arc<Config>>,
    Query(params): Query<MonthlyParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut monthly_usage = process_monthly_usage(&config.projects_path)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Filter by year if provided
    if let Some(year) = params.year {
        monthly_usage.retain(|month| month.month.starts_with(&year));
    }

    let total_items = monthly_usage.len();
    let items_per_page = params.limit.max(1).min(120);
    let current_page = params.page.max(1);
    let total_pages = (total_items + items_per_page - 1) / items_per_page;

    let start = (current_page - 1) * items_per_page;
    let end = (start + items_per_page).min(total_items);

    let data = if start < total_items {
        monthly_usage[start..end].to_vec()
    } else {
        Vec::new()
    };

    let response = MonthlyResponse {
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
