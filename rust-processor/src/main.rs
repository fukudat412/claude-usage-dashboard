use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use clap::Parser;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;

/// Claude Usage Dashboard Data Processor
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to Claude projects directory
    #[arg(short, long)]
    projects_path: String,
}

#[derive(Debug, Deserialize)]
struct Message {
    #[serde(default)]
    timestamp: Option<String>,
    #[serde(rename = "sessionId")]
    session_id: Option<String>,
    message: Option<MessageContent>,
}

#[derive(Debug, Deserialize)]
struct MessageContent {
    model: Option<String>,
    usage: Option<Usage>,
}

#[derive(Debug, Deserialize)]
struct Usage {
    #[serde(rename = "input_tokens")]
    input_tokens: Option<u64>,
    #[serde(rename = "output_tokens")]
    output_tokens: Option<u64>,
    #[serde(rename = "cache_creation_input_tokens")]
    cache_creation_tokens: Option<u64>,
    #[serde(rename = "cache_read_input_tokens")]
    cache_read_tokens: Option<u64>,
}

#[derive(Debug, Clone)]
struct UsageMetrics {
    input_tokens: u64,
    output_tokens: u64,
    cached_tokens: u64,
    total_tokens: u64,
    cost: f64,
    new_input_tokens: u64,
    cache_creation_tokens: u64,
    cache_read_tokens: u64,
}

// Node.js互換の出力形式
#[derive(Debug, Serialize)]
struct DailyUsage {
    date: String,
    #[serde(rename = "inputTokens")]
    input_tokens: u64,
    #[serde(rename = "outputTokens")]
    output_tokens: u64,
    #[serde(rename = "cachedTokens")]
    cached_tokens: u64,
    #[serde(rename = "totalTokens")]
    total_tokens: u64,
    cost: String,
    sessions: usize,
    #[serde(rename = "newInputTokens")]
    new_input_tokens: u64,
    #[serde(rename = "cacheCreationTokens")]
    cache_creation_tokens: u64,
    #[serde(rename = "cacheReadTokens")]
    cache_read_tokens: u64,
}

#[derive(Debug, Serialize)]
struct MonthlyUsage {
    month: String,
    #[serde(rename = "inputTokens")]
    input_tokens: u64,
    #[serde(rename = "outputTokens")]
    output_tokens: u64,
    #[serde(rename = "cachedTokens")]
    cached_tokens: u64,
    #[serde(rename = "totalTokens")]
    total_tokens: u64,
    messages: usize,
    cost: String,
    sessions: usize,
    #[serde(rename = "newInputTokens")]
    new_input_tokens: u64,
    #[serde(rename = "cacheCreationTokens")]
    cache_creation_tokens: u64,
    #[serde(rename = "cacheReadTokens")]
    cache_read_tokens: u64,
}

#[derive(Debug, Serialize)]
struct ModelUsage {
    model: String,
    #[serde(rename = "inputTokens")]
    input_tokens: u64,
    #[serde(rename = "outputTokens")]
    output_tokens: u64,
    #[serde(rename = "cachedTokens")]
    cached_tokens: u64,
    #[serde(rename = "totalTokens")]
    total_tokens: u64,
    messages: usize,
    cost: String,
    sessions: usize,
    #[serde(rename = "newInputTokens")]
    new_input_tokens: u64,
    #[serde(rename = "cacheCreationTokens")]
    cache_creation_tokens: u64,
    #[serde(rename = "cacheReadTokens")]
    cache_read_tokens: u64,
}

#[derive(Debug, Serialize)]
struct Project {
    name: String,
    path: String,
    #[serde(rename = "totalTokens")]
    total_tokens: u64,
    #[serde(rename = "totalCost")]
    total_cost: String,
    #[serde(rename = "messageCount")]
    message_count: usize,
    #[serde(rename = "lastActivity")]
    last_activity: Option<String>,
}

#[derive(Debug, Serialize)]
struct DetailedUsage {
    timestamp: String,
    #[serde(rename = "sessionId")]
    session_id: String,
    model: String,
    #[serde(rename = "inputTokens")]
    input_tokens: u64,
    #[serde(rename = "outputTokens")]
    output_tokens: u64,
    #[serde(rename = "cachedTokens")]
    cached_tokens: u64,
    #[serde(rename = "totalTokens")]
    total_tokens: u64,
    cost: f64,
    #[serde(rename = "newInputTokens")]
    new_input_tokens: u64,
    #[serde(rename = "cacheCreationTokens")]
    cache_creation_tokens: u64,
    #[serde(rename = "cacheReadTokens")]
    cache_read_tokens: u64,
}

#[derive(Debug, Serialize)]
struct ProcessedData {
    #[serde(rename = "dailyUsage")]
    daily_usage: Vec<DailyUsage>,
    #[serde(rename = "monthlyUsage")]
    monthly_usage: Vec<MonthlyUsage>,
    #[serde(rename = "modelUsage")]
    model_usage: Vec<ModelUsage>,
    projects: Vec<Project>,
    #[serde(rename = "detailedUsage")]
    detailed_usage: Vec<DetailedUsage>,
    #[serde(rename = "totalSessions")]
    total_sessions: usize,
}

struct DayData {
    date: String,
    input_tokens: u64,
    output_tokens: u64,
    cached_tokens: u64,
    total_tokens: u64,
    cost: f64,
    sessions: HashSet<String>,
    new_input_tokens: u64,
    cache_creation_tokens: u64,
    cache_read_tokens: u64,
}

struct MonthData {
    month: String,
    input_tokens: u64,
    output_tokens: u64,
    cached_tokens: u64,
    total_tokens: u64,
    cost: f64,
    sessions: HashSet<String>,
    messages: usize,
    new_input_tokens: u64,
    cache_creation_tokens: u64,
    cache_read_tokens: u64,
}

struct ModelData {
    model: String,
    input_tokens: u64,
    output_tokens: u64,
    cached_tokens: u64,
    total_tokens: u64,
    cost: f64,
    sessions: HashSet<String>,
    messages: usize,
    new_input_tokens: u64,
    cache_creation_tokens: u64,
    cache_read_tokens: u64,
}

fn calculate_usage_metrics(usage: &Usage, _model: Option<&str>) -> UsageMetrics {
    let input_tokens = usage.input_tokens.unwrap_or(0);
    let output_tokens = usage.output_tokens.unwrap_or(0);
    let cache_creation_tokens = usage.cache_creation_tokens.unwrap_or(0);
    let cache_read_tokens = usage.cache_read_tokens.unwrap_or(0);

    let new_input_tokens = input_tokens.saturating_sub(cache_creation_tokens);
    let cached_tokens = cache_creation_tokens + cache_read_tokens;
    let total_tokens = input_tokens + output_tokens + cached_tokens;

    // 簡易的なコスト計算（モデル別の価格は省略）
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

fn process_project_data(projects_path: &str) -> Result<ProcessedData> {
    let project_dirs: Vec<PathBuf> = fs::read_dir(projects_path)
        .context("Failed to read projects directory")?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect();

    let mut usage_by_date: HashMap<String, DayData> = HashMap::new();
    let mut usage_by_month: HashMap<String, MonthData> = HashMap::new();
    let mut usage_by_model: HashMap<String, ModelData> = HashMap::new();
    let mut projects = Vec::new();
    let mut detailed_usage = Vec::new();

    for project_dir in &project_dirs {
        let project_name = project_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        let files: Vec<PathBuf> = fs::read_dir(project_dir)
            .context(format!("Failed to read project directory: {:?}", project_dir))?
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path())
            .filter(|path| {
                path.extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| ext == "jsonl")
                    .unwrap_or(false)
            })
            .collect();

        let mut total_tokens = 0u64;
        let mut total_cost = 0.0f64;
        let mut message_count = 0usize;
        let mut last_activity: Option<String> = None;

        for file in files {
            let content = fs::read_to_string(&file)
                .context(format!("Failed to read file: {:?}", file))?;

            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }

                let msg: Message = match serde_json::from_str(trimmed) {
                    Ok(m) => m,
                    Err(_) => continue,
                };

                message_count += 1;

                if let Some(timestamp) = &msg.timestamp {
                    if last_activity.is_none()
                        || timestamp > last_activity.as_ref().unwrap()
                    {
                        last_activity = Some(timestamp.clone());
                    }
                }

                if let (Some(message_content), Some(timestamp)) =
                    (msg.message, msg.timestamp.as_ref())
                {
                    if let Some(usage) = message_content.usage {
                        let model = message_content.model.clone().unwrap_or_else(|| "unknown".to_string());
                        let metrics = calculate_usage_metrics(&usage, Some(&model));

                        // Detailed usage
                        if let Some(session_id) = &msg.session_id {
                            detailed_usage.push(DetailedUsage {
                                timestamp: timestamp.clone(),
                                session_id: session_id.clone(),
                                model: model.clone(),
                                input_tokens: metrics.input_tokens,
                                output_tokens: metrics.output_tokens,
                                cached_tokens: metrics.cached_tokens,
                                total_tokens: metrics.total_tokens,
                                cost: metrics.cost,
                                new_input_tokens: metrics.new_input_tokens,
                                cache_creation_tokens: metrics.cache_creation_tokens,
                                cache_read_tokens: metrics.cache_read_tokens,
                            });
                        }

                        // Daily data
                        let date = timestamp.split('T').next().unwrap_or("").to_string();
                        let day_data = usage_by_date.entry(date.clone()).or_insert(DayData {
                            date: date.clone(),
                            input_tokens: 0,
                            output_tokens: 0,
                            cached_tokens: 0,
                            total_tokens: 0,
                            cost: 0.0,
                            sessions: HashSet::new(),
                            new_input_tokens: 0,
                            cache_creation_tokens: 0,
                            cache_read_tokens: 0,
                        });

                        day_data.input_tokens += metrics.input_tokens;
                        day_data.output_tokens += metrics.output_tokens;
                        day_data.cached_tokens += metrics.cached_tokens;
                        day_data.total_tokens += metrics.total_tokens;
                        day_data.cost += metrics.cost;
                        day_data.new_input_tokens += metrics.new_input_tokens;
                        day_data.cache_creation_tokens += metrics.cache_creation_tokens;
                        day_data.cache_read_tokens += metrics.cache_read_tokens;

                        if let Some(session_id) = &msg.session_id {
                            day_data.sessions.insert(session_id.clone());
                        }

                        // Monthly data
                        let month = if date.len() >= 7 {
                            format!("{}-{}", &date[..4], &date[5..7])
                        } else {
                            "unknown".to_string()
                        };

                        let month_data = usage_by_month.entry(month.clone()).or_insert(MonthData {
                            month: month.clone(),
                            input_tokens: 0,
                            output_tokens: 0,
                            cached_tokens: 0,
                            total_tokens: 0,
                            cost: 0.0,
                            sessions: HashSet::new(),
                            messages: 0,
                            new_input_tokens: 0,
                            cache_creation_tokens: 0,
                            cache_read_tokens: 0,
                        });

                        month_data.input_tokens += metrics.input_tokens;
                        month_data.output_tokens += metrics.output_tokens;
                        month_data.cached_tokens += metrics.cached_tokens;
                        month_data.total_tokens += metrics.total_tokens;
                        month_data.cost += metrics.cost;
                        month_data.messages += 1;
                        month_data.new_input_tokens += metrics.new_input_tokens;
                        month_data.cache_creation_tokens += metrics.cache_creation_tokens;
                        month_data.cache_read_tokens += metrics.cache_read_tokens;

                        if let Some(session_id) = &msg.session_id {
                            month_data.sessions.insert(session_id.clone());
                        }

                        // Model data
                        let model_data = usage_by_model.entry(model.clone()).or_insert(ModelData {
                            model: model.clone(),
                            input_tokens: 0,
                            output_tokens: 0,
                            cached_tokens: 0,
                            total_tokens: 0,
                            cost: 0.0,
                            sessions: HashSet::new(),
                            messages: 0,
                            new_input_tokens: 0,
                            cache_creation_tokens: 0,
                            cache_read_tokens: 0,
                        });

                        model_data.input_tokens += metrics.input_tokens;
                        model_data.output_tokens += metrics.output_tokens;
                        model_data.cached_tokens += metrics.cached_tokens;
                        model_data.total_tokens += metrics.total_tokens;
                        model_data.cost += metrics.cost;
                        model_data.messages += 1;
                        model_data.new_input_tokens += metrics.new_input_tokens;
                        model_data.cache_creation_tokens += metrics.cache_creation_tokens;
                        model_data.cache_read_tokens += metrics.cache_read_tokens;

                        if let Some(session_id) = &msg.session_id {
                            model_data.sessions.insert(session_id.clone());
                        }

                        // Project totals
                        total_tokens += metrics.total_tokens;
                        total_cost += metrics.cost;
                    }
                }
            }
        }

        projects.push(Project {
            name: project_name,
            path: project_dir.to_string_lossy().to_string(),
            total_tokens,
            total_cost: format!("{:.4}", total_cost),
            message_count,
            last_activity,
        });
    }

    // Convert to output format
    let mut daily_usage: Vec<DailyUsage> = usage_by_date
        .into_iter()
        .map(|(_, day)| DailyUsage {
            date: day.date,
            input_tokens: day.input_tokens,
            output_tokens: day.output_tokens,
            cached_tokens: day.cached_tokens,
            total_tokens: day.total_tokens,
            cost: format!("{:.4}", day.cost),
            sessions: day.sessions.len(),
            new_input_tokens: day.new_input_tokens,
            cache_creation_tokens: day.cache_creation_tokens,
            cache_read_tokens: day.cache_read_tokens,
        })
        .collect();
    daily_usage.sort_by(|a, b| a.date.cmp(&b.date));

    let mut monthly_usage: Vec<MonthlyUsage> = usage_by_month
        .into_iter()
        .map(|(_, month)| MonthlyUsage {
            month: month.month,
            input_tokens: month.input_tokens,
            output_tokens: month.output_tokens,
            cached_tokens: month.cached_tokens,
            total_tokens: month.total_tokens,
            messages: month.messages,
            cost: format!("{:.4}", month.cost),
            sessions: month.sessions.len(),
            new_input_tokens: month.new_input_tokens,
            cache_creation_tokens: month.cache_creation_tokens,
            cache_read_tokens: month.cache_read_tokens,
        })
        .collect();
    monthly_usage.sort_by(|a, b| a.month.cmp(&b.month));

    let mut model_usage: Vec<ModelUsage> = usage_by_model
        .into_iter()
        .map(|(_, model)| ModelUsage {
            model: model.model,
            input_tokens: model.input_tokens,
            output_tokens: model.output_tokens,
            cached_tokens: model.cached_tokens,
            total_tokens: model.total_tokens,
            messages: model.messages,
            cost: format!("{:.4}", model.cost),
            sessions: model.sessions.len(),
            new_input_tokens: model.new_input_tokens,
            cache_creation_tokens: model.cache_creation_tokens,
            cache_read_tokens: model.cache_read_tokens,
        })
        .collect();
    model_usage.sort_by(|a, b| b.total_tokens.cmp(&a.total_tokens));

    projects.sort_by(|a, b| {
        b.last_activity
            .as_ref()
            .cmp(&a.last_activity.as_ref())
    });

    detailed_usage.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

    // Calculate total sessions
    let mut all_sessions = HashSet::new();
    for entry in &detailed_usage {
        all_sessions.insert(entry.session_id.clone());
    }

    Ok(ProcessedData {
        daily_usage,
        monthly_usage,
        model_usage,
        projects,
        detailed_usage,
        total_sessions: all_sessions.len(),
    })
}

fn main() -> Result<()> {
    let args = Args::parse();

    let data = process_project_data(&args.projects_path)
        .context("Failed to process project data")?;

    let json = serde_json::to_string(&data)
        .context("Failed to serialize data to JSON")?;

    println!("{}", json);

    Ok(())
}
