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
    models::ModelUsage,
    services::process_model_usage,
};

#[derive(Debug, Deserialize)]
pub struct ModelsParams {
    #[serde(default = "default_sort_by")]
    #[serde(rename = "sortBy")]
    sort_by: String,
    #[serde(default = "default_sort_order")]
    #[serde(rename = "sortOrder")]
    sort_order: String,
}

fn default_sort_by() -> String {
    "totalTokens".to_string()
}

fn default_sort_order() -> String {
    "desc".to_string()
}

#[derive(Serialize)]
pub struct ModelsStats {
    #[serde(rename = "totalModels")]
    total_models: usize,
    #[serde(rename = "totalTokens")]
    total_tokens: u64,
    #[serde(rename = "totalCost")]
    total_cost: String,
    #[serde(rename = "totalMessages")]
    total_messages: usize,
    #[serde(rename = "totalSessions")]
    total_sessions: usize,
    #[serde(rename = "mostUsedModel")]
    most_used_model: Option<String>,
}

#[derive(Serialize)]
pub struct ModelsResponse {
    data: Vec<ModelUsage>,
    stats: ModelsStats,
}

pub async fn get_models(
    State(config): State<Arc<Config>>,
    Query(params): Query<ModelsParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut model_usage = process_model_usage(&config.projects_path)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Apply sorting
    match params.sort_by.as_str() {
        "totalTokens" => {
            if params.sort_order == "asc" {
                model_usage.sort_by(|a, b| a.total_tokens.cmp(&b.total_tokens));
            } else {
                model_usage.sort_by(|a, b| b.total_tokens.cmp(&a.total_tokens));
            }
        }
        "cost" => {
            if params.sort_order == "asc" {
                model_usage.sort_by(|a, b| a.cost.partial_cmp(&b.cost).unwrap());
            } else {
                model_usage.sort_by(|a, b| b.cost.partial_cmp(&a.cost).unwrap());
            }
        }
        "messages" => {
            if params.sort_order == "asc" {
                model_usage.sort_by(|a, b| a.messages.cmp(&b.messages));
            } else {
                model_usage.sort_by(|a, b| b.messages.cmp(&a.messages));
            }
        }
        "sessions" => {
            if params.sort_order == "asc" {
                model_usage.sort_by(|a, b| a.sessions.cmp(&b.sessions));
            } else {
                model_usage.sort_by(|a, b| b.sessions.cmp(&a.sessions));
            }
        }
        "model" => {
            if params.sort_order == "asc" {
                model_usage.sort_by(|a, b| a.model.to_lowercase().cmp(&b.model.to_lowercase()));
            } else {
                model_usage.sort_by(|a, b| b.model.to_lowercase().cmp(&a.model.to_lowercase()));
            }
        }
        _ => {}
    }

    // Calculate stats
    let total_tokens: u64 = model_usage.iter().map(|m| m.total_tokens).sum();
    let total_cost: f64 = model_usage
        .iter()
        .map(|m| m.cost.parse::<f64>().unwrap_or(0.0))
        .sum();
    let total_messages: usize = model_usage.iter().map(|m| m.messages).sum();
    let total_sessions: usize = model_usage.iter().map(|m| m.sessions).sum();
    let most_used_model = model_usage.first().map(|m| m.model.clone());

    let stats = ModelsStats {
        total_models: model_usage.len(),
        total_tokens,
        total_cost: format!("{:.2}", total_cost),
        total_messages,
        total_sessions,
        most_used_model,
    };

    let response = ModelsResponse {
        data: model_usage,
        stats,
    };

    Ok(Json(response))
}
