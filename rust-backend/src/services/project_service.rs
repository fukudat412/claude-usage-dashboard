use crate::models::*;
use anyhow::{Context, Result};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;

pub fn process_daily_usage(projects_path: &str) -> Result<Vec<DailyUsage>> {
    let project_data = process_all_project_data(projects_path)?;
    Ok(project_data.daily_usage)
}

pub fn process_monthly_usage(projects_path: &str) -> Result<Vec<MonthlyUsage>> {
    let project_data = process_all_project_data(projects_path)?;
    Ok(project_data.monthly_usage)
}

pub fn process_model_usage(projects_path: &str) -> Result<Vec<ModelUsage>> {
    let project_data = process_all_project_data(projects_path)?;
    Ok(project_data.model_usage)
}

pub fn process_projects(projects_path: &str) -> Result<Vec<ProjectData>> {
    let project_data = process_all_project_data(projects_path)?;
    Ok(project_data.projects)
}

pub struct AllProjectData {
    pub daily_usage: Vec<DailyUsage>,
    pub monthly_usage: Vec<MonthlyUsage>,
    pub model_usage: Vec<ModelUsage>,
    pub projects: Vec<ProjectData>,
}

fn process_all_project_data(projects_path: &str) -> Result<AllProjectData> {
    let project_dirs: Vec<PathBuf> = fs::read_dir(projects_path)
        .context("Failed to read projects directory")?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect();

    let mut usage_by_date: HashMap<String, DayData> = HashMap::new();
    let mut usage_by_month: HashMap<String, MonthData> = HashMap::new();
    let mut usage_by_model: HashMap<String, ModelData> = HashMap::new();
    let mut projects: Vec<ProjectInternal> = Vec::new();

    for project_dir in &project_dirs {
        let project_name = project_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
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

        let mut project_total_tokens = 0u64;
        let mut project_total_cost = 0.0f64;
        let mut project_message_count = 0usize;
        let mut project_last_activity: Option<String> = None;

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

                if let (Some(message_content), Some(timestamp)) =
                    (msg.message, msg.timestamp.as_ref())
                {
                    project_message_count += 1;

                    // Update last activity
                    if project_last_activity.is_none()
                        || timestamp > project_last_activity.as_ref().unwrap()
                    {
                        project_last_activity = Some(timestamp.clone());
                    }

                    if let Some(usage) = message_content.usage {
                        let metrics = UsageMetrics::from_usage(&usage);
                        let model = message_content.model.unwrap_or_else(|| "unknown".to_string());

                        project_total_tokens += metrics.total_tokens;
                        project_total_cost += metrics.cost;

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
                        let month = {
                            let parts: Vec<&str> = date.split('-').collect();
                            if parts.len() >= 2 {
                                format!("{}-{}", parts[0], parts[1])
                            } else {
                                continue;
                            }
                        };

                        let month_data =
                            usage_by_month.entry(month.clone()).or_insert(MonthData {
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
                        let model_data =
                            usage_by_model.entry(model.clone()).or_insert(ModelData {
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
                    }
                }
            }
        }

        projects.push(ProjectInternal {
            name: project_name,
            total_tokens: project_total_tokens,
            total_cost: project_total_cost,
            message_count: project_message_count,
            last_activity: project_last_activity,
        });
    }

    // Convert to response types
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
            cost: format!("{:.4}", month.cost),
            sessions: month.sessions.len(),
            messages: month.messages,
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
            cost: format!("{:.4}", model.cost),
            sessions: model.sessions.len(),
            messages: model.messages,
            new_input_tokens: model.new_input_tokens,
            cache_creation_tokens: model.cache_creation_tokens,
            cache_read_tokens: model.cache_read_tokens,
        })
        .collect();

    model_usage.sort_by(|a, b| b.total_tokens.cmp(&a.total_tokens));

    let mut project_data: Vec<ProjectData> = projects
        .into_iter()
        .map(|p| ProjectData {
            name: p.name,
            total_tokens: p.total_tokens,
            total_cost: format!("{:.4}", p.total_cost),
            message_count: p.message_count,
            last_activity: p.last_activity,
        })
        .collect();

    project_data.sort_by(|a, b| {
        b.last_activity
            .as_ref()
            .unwrap_or(&String::new())
            .cmp(a.last_activity.as_ref().unwrap_or(&String::new()))
    });

    Ok(AllProjectData {
        daily_usage,
        monthly_usage,
        model_usage,
        projects: project_data,
    })
}
