use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Deserialize)]
pub struct Message {
    #[serde(default)]
    pub timestamp: Option<String>,
    #[serde(rename = "sessionId")]
    pub session_id: Option<String>,
    pub message: Option<MessageContent>,
}

#[derive(Debug, Deserialize)]
pub struct MessageContent {
    pub model: Option<String>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Deserialize)]
pub struct Usage {
    #[serde(rename = "input_tokens")]
    pub input_tokens: Option<u64>,
    #[serde(rename = "output_tokens")]
    pub output_tokens: Option<u64>,
    #[serde(rename = "cache_creation_input_tokens")]
    pub cache_creation_tokens: Option<u64>,
    #[serde(rename = "cache_read_input_tokens")]
    pub cache_read_tokens: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct UsageMetrics {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cached_tokens: u64,
    pub total_tokens: u64,
    pub cost: f64,
    pub new_input_tokens: u64,
    pub cache_creation_tokens: u64,
    pub cache_read_tokens: u64,
}

// API Response Types
#[derive(Debug, Clone, Serialize)]
pub struct DailyUsage {
    pub date: String,
    #[serde(rename = "inputTokens")]
    pub input_tokens: u64,
    #[serde(rename = "outputTokens")]
    pub output_tokens: u64,
    #[serde(rename = "cachedTokens")]
    pub cached_tokens: u64,
    #[serde(rename = "totalTokens")]
    pub total_tokens: u64,
    pub cost: String,
    pub sessions: usize,
    #[serde(rename = "newInputTokens")]
    pub new_input_tokens: u64,
    #[serde(rename = "cacheCreationTokens")]
    pub cache_creation_tokens: u64,
    #[serde(rename = "cacheReadTokens")]
    pub cache_read_tokens: u64,
}

#[derive(Debug, Serialize)]
pub struct DailyResponse {
    pub data: Vec<DailyUsage>,
    pub pagination: Pagination,
}

#[derive(Debug, Serialize)]
pub struct Pagination {
    #[serde(rename = "currentPage")]
    pub current_page: usize,
    #[serde(rename = "totalPages")]
    pub total_pages: usize,
    #[serde(rename = "totalItems")]
    pub total_items: usize,
    #[serde(rename = "itemsPerPage")]
    pub items_per_page: usize,
    #[serde(rename = "hasNext")]
    pub has_next: bool,
    #[serde(rename = "hasPrev")]
    pub has_prev: bool,
}

// Monthly usage data
#[derive(Debug, Clone, Serialize)]
pub struct MonthlyUsage {
    pub month: String,
    #[serde(rename = "inputTokens")]
    pub input_tokens: u64,
    #[serde(rename = "outputTokens")]
    pub output_tokens: u64,
    #[serde(rename = "cachedTokens")]
    pub cached_tokens: u64,
    #[serde(rename = "totalTokens")]
    pub total_tokens: u64,
    pub cost: String,
    pub sessions: usize,
    pub messages: usize,
    #[serde(rename = "newInputTokens")]
    pub new_input_tokens: u64,
    #[serde(rename = "cacheCreationTokens")]
    pub cache_creation_tokens: u64,
    #[serde(rename = "cacheReadTokens")]
    pub cache_read_tokens: u64,
}

// Model usage data
#[derive(Debug, Clone, Serialize)]
pub struct ModelUsage {
    pub model: String,
    #[serde(rename = "inputTokens")]
    pub input_tokens: u64,
    #[serde(rename = "outputTokens")]
    pub output_tokens: u64,
    #[serde(rename = "cachedTokens")]
    pub cached_tokens: u64,
    #[serde(rename = "totalTokens")]
    pub total_tokens: u64,
    pub cost: String,
    pub sessions: usize,
    pub messages: usize,
    #[serde(rename = "newInputTokens")]
    pub new_input_tokens: u64,
    #[serde(rename = "cacheCreationTokens")]
    pub cache_creation_tokens: u64,
    #[serde(rename = "cacheReadTokens")]
    pub cache_read_tokens: u64,
}

// Project data
#[derive(Debug, Clone, Serialize)]
pub struct ProjectData {
    pub name: String,
    #[serde(rename = "totalTokens")]
    pub total_tokens: u64,
    #[serde(rename = "totalCost")]
    pub total_cost: String,
    #[serde(rename = "messageCount")]
    pub message_count: usize,
    #[serde(rename = "lastActivity")]
    pub last_activity: Option<String>,
}

// Internal data structures
pub struct DayData {
    pub date: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cached_tokens: u64,
    pub total_tokens: u64,
    pub cost: f64,
    pub sessions: HashSet<String>,
    pub new_input_tokens: u64,
    pub cache_creation_tokens: u64,
    pub cache_read_tokens: u64,
}

pub struct MonthData {
    pub month: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cached_tokens: u64,
    pub total_tokens: u64,
    pub cost: f64,
    pub sessions: HashSet<String>,
    pub messages: usize,
    pub new_input_tokens: u64,
    pub cache_creation_tokens: u64,
    pub cache_read_tokens: u64,
}

pub struct ModelData {
    pub model: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cached_tokens: u64,
    pub total_tokens: u64,
    pub cost: f64,
    pub sessions: HashSet<String>,
    pub messages: usize,
    pub new_input_tokens: u64,
    pub cache_creation_tokens: u64,
    pub cache_read_tokens: u64,
}

pub struct ProjectInternal {
    pub name: String,
    pub total_tokens: u64,
    pub total_cost: f64,
    pub message_count: usize,
    pub last_activity: Option<String>,
}

impl UsageMetrics {
    pub fn from_usage(usage: &Usage) -> Self {
        let input_tokens = usage.input_tokens.unwrap_or(0);
        let output_tokens = usage.output_tokens.unwrap_or(0);
        let cache_creation_tokens = usage.cache_creation_tokens.unwrap_or(0);
        let cache_read_tokens = usage.cache_read_tokens.unwrap_or(0);

        let new_input_tokens = input_tokens.saturating_sub(cache_creation_tokens);
        let cached_tokens = cache_creation_tokens + cache_read_tokens;
        let total_tokens = input_tokens + output_tokens + cached_tokens;

        let cost = (input_tokens as f64 * 0.003 / 1000.0)
            + (output_tokens as f64 * 0.015 / 1000.0)
            + (cache_creation_tokens as f64 * 0.00375 / 1000.0)
            + (cache_read_tokens as f64 * 0.0003 / 1000.0);

        UsageMetrics {
            input_tokens,
            output_tokens,
            cached_tokens,
            total_tokens,
            cost,
            new_input_tokens,
            cache_creation_tokens,
            cache_read_tokens,
        }
    }
}
