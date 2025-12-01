use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{
    config::Config,
    models::{Pagination, ProjectData},
    services::process_projects,
};

#[derive(Debug, Deserialize)]
pub struct ProjectsParams {
    #[serde(default = "default_page")]
    page: usize,
    #[serde(default = "default_limit")]
    limit: usize,
    #[serde(rename = "sortBy", default = "default_sort_by")]
    sort_by: String,
    #[serde(rename = "sortOrder", default = "default_sort_order")]
    sort_order: String,
    #[serde(rename = "minCost")]
    min_cost: Option<f64>,
    search: Option<String>,
}

fn default_page() -> usize {
    1
}

fn default_limit() -> usize {
    20
}

fn default_sort_by() -> String {
    "lastActivity".to_string()
}

fn default_sort_order() -> String {
    "desc".to_string()
}

#[derive(Serialize)]
pub struct ProjectsStats {
    #[serde(rename = "totalProjects")]
    total_projects: usize,
    #[serde(rename = "totalCost")]
    total_cost: String,
    #[serde(rename = "totalTokens")]
    total_tokens: u64,
    #[serde(rename = "totalMessages")]
    total_messages: usize,
}

#[derive(Serialize)]
pub struct ProjectsResponse {
    data: Vec<ProjectData>,
    pagination: Pagination,
    stats: ProjectsStats,
}

pub async fn get_projects(
    State(config): State<Arc<Config>>,
    Query(params): Query<ProjectsParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut projects = process_projects(&config.projects_path)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Apply filters
    if let Some(min_cost) = params.min_cost {
        projects.retain(|p| {
            p.total_cost
                .parse::<f64>()
                .unwrap_or(0.0) >= min_cost
        });
    }

    if let Some(search) = &params.search {
        let search_lower = search.to_lowercase();
        projects.retain(|p| p.name.to_lowercase().contains(&search_lower));
    }

    // Apply sorting
    match params.sort_by.as_str() {
        "lastActivity" => {
            if params.sort_order == "asc" {
                projects.sort_by(|a, b| {
                    a.last_activity
                        .as_ref()
                        .unwrap_or(&String::new())
                        .cmp(b.last_activity.as_ref().unwrap_or(&String::new()))
                });
            } else {
                projects.sort_by(|a, b| {
                    b.last_activity
                        .as_ref()
                        .unwrap_or(&String::new())
                        .cmp(a.last_activity.as_ref().unwrap_or(&String::new()))
                });
            }
        }
        "totalCost" => {
            if params.sort_order == "asc" {
                projects.sort_by(|a, b| {
                    a.total_cost
                        .parse::<f64>()
                        .unwrap_or(0.0)
                        .partial_cmp(&b.total_cost.parse::<f64>().unwrap_or(0.0))
                        .unwrap()
                });
            } else {
                projects.sort_by(|a, b| {
                    b.total_cost
                        .parse::<f64>()
                        .unwrap_or(0.0)
                        .partial_cmp(&a.total_cost.parse::<f64>().unwrap_or(0.0))
                        .unwrap()
                });
            }
        }
        "totalTokens" => {
            if params.sort_order == "asc" {
                projects.sort_by(|a, b| a.total_tokens.cmp(&b.total_tokens));
            } else {
                projects.sort_by(|a, b| b.total_tokens.cmp(&a.total_tokens));
            }
        }
        "messageCount" => {
            if params.sort_order == "asc" {
                projects.sort_by(|a, b| a.message_count.cmp(&b.message_count));
            } else {
                projects.sort_by(|a, b| b.message_count.cmp(&a.message_count));
            }
        }
        "name" => {
            if params.sort_order == "asc" {
                projects.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
            } else {
                projects.sort_by(|a, b| b.name.to_lowercase().cmp(&a.name.to_lowercase()));
            }
        }
        _ => {}
    }

    // Calculate stats
    let total_cost: f64 = projects
        .iter()
        .map(|p| p.total_cost.parse::<f64>().unwrap_or(0.0))
        .sum();
    let total_tokens: u64 = projects.iter().map(|p| p.total_tokens).sum();
    let total_messages: usize = projects.iter().map(|p| p.message_count).sum();

    let stats = ProjectsStats {
        total_projects: projects.len(),
        total_cost: format!("{:.2}", total_cost),
        total_tokens,
        total_messages,
    };

    // Apply pagination
    let total_items = projects.len();
    let items_per_page = params.limit.max(1).min(200);
    let current_page = params.page.max(1);
    let total_pages = (total_items + items_per_page - 1) / items_per_page;

    let start = (current_page - 1) * items_per_page;
    let end = (start + items_per_page).min(total_items);

    let data = if start < total_items {
        projects[start..end].to_vec()
    } else {
        Vec::new()
    };

    let response = ProjectsResponse {
        data,
        pagination: Pagination {
            current_page,
            total_pages,
            total_items,
            items_per_page,
            has_next: current_page < total_pages,
            has_prev: current_page > 1,
        },
        stats,
    };

    Ok(Json(response))
}
