use chrono::{DateTime, Utc};
use glob::glob;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;
use std::time::Instant;

#[derive(Debug, Deserialize, Serialize)]
struct Message {
    #[serde(default)]
    timestamp: Option<String>,
    #[serde(rename = "sessionId")]
    session_id: Option<String>,
    message: Option<MessageContent>,
}

#[derive(Debug, Deserialize, Serialize)]
struct MessageContent {
    model: Option<String>,
    usage: Option<Usage>,
}

#[derive(Debug, Deserialize, Serialize)]
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

#[derive(Debug)]
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

struct PerformanceProfiler {
    name: String,
    start: Instant,
    last_mark: Instant,
    timings: Vec<(String, f64, f64)>,
}

impl PerformanceProfiler {
    fn new(name: &str) -> Self {
        let now = Instant::now();
        Self {
            name: name.to_string(),
            start: now,
            last_mark: now,
            timings: Vec::new(),
        }
    }

    fn mark(&mut self, label: &str) -> f64 {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_mark).as_secs_f64() * 1000.0;
        let total = now.duration_since(self.start).as_secs_f64() * 1000.0;
        self.timings.push((label.to_string(), elapsed, total));
        self.last_mark = now;
        elapsed
    }

    fn report(&self) -> f64 {
        let total = Instant::now()
            .duration_since(self.start)
            .as_secs_f64()
            * 1000.0;

        println!("\n{}", "=".repeat(60));
        println!("Performance Report: {}", self.name);
        println!("{}", "=".repeat(60));
        for (label, elapsed, total) in &self.timings {
            println!(
                "  {:<40} {:.2}ms (累計: {:.2}ms)",
                label, elapsed, total
            );
        }
        println!("{}", "=".repeat(60));
        println!("  {:<40} {:.2}ms", "TOTAL", total);
        println!("{}", "=".repeat(60));
        println!();
        total
    }
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

fn benchmark_file_io(projects_path: &str) -> (f64, (usize, u64, usize)) {
    let mut profiler = PerformanceProfiler::new("File I/O Operations");

    profiler.mark("Start");

    let project_dirs: Vec<PathBuf> = fs::read_dir(projects_path)
        .unwrap()
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect();

    profiler.mark(&format!("Read {} project directories", project_dirs.len()));

    let mut total_files = 0;
    let mut total_size = 0u64;
    let mut total_lines = 0;

    for project_dir in &project_dirs {
        let files: Vec<PathBuf> = fs::read_dir(project_dir)
            .unwrap()
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path())
            .filter(|path| {
                path.extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| ext == "jsonl")
                    .unwrap_or(false)
            })
            .collect();

        total_files += files.len();

        for file in files {
            if let Ok(metadata) = fs::metadata(&file) {
                total_size += metadata.len();
            }

            if let Ok(content) = fs::read_to_string(&file) {
                total_lines += content.lines().filter(|line| !line.trim().is_empty()).count();
            }
        }
    }

    profiler.mark(&format!(
        "Read {} files ({:.2} KB, {} lines)",
        total_files,
        total_size as f64 / 1024.0,
        total_lines
    ));

    let total_time = profiler.report();
    (total_time, (total_files, total_size, total_lines))
}

fn benchmark_json_parsing(projects_path: &str) -> (f64, (usize, usize)) {
    let mut profiler = PerformanceProfiler::new("JSON Parsing");

    profiler.mark("Start");

    let project_dirs: Vec<PathBuf> = fs::read_dir(projects_path)
        .unwrap()
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect();

    let mut total_parsed = 0;
    let mut total_failed = 0;

    for project_dir in &project_dirs {
        let files: Vec<PathBuf> = fs::read_dir(project_dir)
            .unwrap()
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path())
            .filter(|path| {
                path.extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| ext == "jsonl")
                    .unwrap_or(false)
            })
            .collect();

        for file in files {
            if let Ok(content) = fs::read_to_string(&file) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }

                    match serde_json::from_str::<Message>(trimmed) {
                        Ok(_) => total_parsed += 1,
                        Err(_) => total_failed += 1,
                    }
                }
            }
        }
    }

    profiler.mark(&format!(
        "Parsed {} JSON objects ({} failures)",
        total_parsed, total_failed
    ));

    let total_time = profiler.report();
    (total_time, (total_parsed, total_failed))
}

fn benchmark_data_aggregation(projects_path: &str) -> (f64, (usize, usize, usize)) {
    let mut profiler = PerformanceProfiler::new("Data Aggregation");

    profiler.mark("Start processProjectData");

    let project_dirs: Vec<PathBuf> = fs::read_dir(projects_path)
        .unwrap()
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect();

    let mut usage_by_date: HashMap<String, DayData> = HashMap::new();
    let mut usage_by_month: HashMap<String, DayData> = HashMap::new();

    for project_dir in &project_dirs {
        let files: Vec<PathBuf> = fs::read_dir(project_dir)
            .unwrap()
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path())
            .filter(|path| {
                path.extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| ext == "jsonl")
                    .unwrap_or(false)
            })
            .collect();

        for file in files {
            if let Ok(content) = fs::read_to_string(&file) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }

                    if let Ok(msg) = serde_json::from_str::<Message>(trimmed) {
                        if let (Some(message_content), Some(timestamp)) =
                            (msg.message, msg.timestamp.as_ref())
                        {
                            if let Some(usage) = message_content.usage {
                                let metrics = calculate_usage_metrics(&usage, None);

                                // 日毎データ
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

                                // 月毎データ（簡易実装）
                                let month = format!("{}-{}", &date[..4], &date[5..7]);
                                let month_data =
                                    usage_by_month.entry(month.clone()).or_insert(DayData {
                                        date: month,
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

                                month_data.input_tokens += metrics.input_tokens;
                                month_data.output_tokens += metrics.output_tokens;
                                month_data.cached_tokens += metrics.cached_tokens;
                                month_data.total_tokens += metrics.total_tokens;
                                month_data.cost += metrics.cost;
                                month_data.new_input_tokens += metrics.new_input_tokens;
                                month_data.cache_creation_tokens += metrics.cache_creation_tokens;
                                month_data.cache_read_tokens += metrics.cache_read_tokens;

                                if let Some(session_id) = &msg.session_id {
                                    month_data.sessions.insert(session_id.clone());
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let days = usage_by_date.len();
    let months = usage_by_month.len();
    let projects = project_dirs.len();

    profiler.mark(&format!(
        "Processed {} days, {} months, {} projects",
        days, months, projects
    ));

    let total_time = profiler.report();
    (total_time, (days, months, projects))
}

fn main() {
    println!("\n{}", "=".repeat(60));
    println!("Starting Comprehensive Performance Benchmark (Rust)");
    println!("{}", "=".repeat(60));
    println!();

    // プロジェクトパスを環境変数またはデフォルトから取得
    let projects_path = std::env::var("CLAUDE_PROJECTS_PATH")
        .unwrap_or_else(|_| {
            format!(
                "{}/.local/share/claude/projects",
                std::env::var("HOME").unwrap()
            )
        });

    println!("Projects path: {}\n", projects_path);

    // 1. File I/O Benchmark
    let (file_io_time, (total_files, total_size, total_lines)) =
        benchmark_file_io(&projects_path);

    // 2. JSON Parsing Benchmark
    let (json_parsing_time, (total_parsed, total_failed)) =
        benchmark_json_parsing(&projects_path);

    // 3. Data Aggregation Benchmark
    let (data_aggregation_time, (days, months, projects)) =
        benchmark_data_aggregation(&projects_path);

    // Summary
    println!("\n{}", "=".repeat(60));
    println!("BENCHMARK SUMMARY");
    println!("{}", "=".repeat(60));
    println!("File I/O Operations:        {:.2}ms", file_io_time);
    println!("JSON Parsing:               {:.2}ms", json_parsing_time);
    println!("Data Aggregation:           {:.2}ms", data_aggregation_time);
    println!("{}", "=".repeat(60));

    let total = file_io_time + json_parsing_time + data_aggregation_time;
    println!("TOTAL:                      {:.2}ms", total);
    println!("{}", "=".repeat(60));
    println!();

    // Data Statistics
    println!("\n{}", "=".repeat(60));
    println!("DATA STATISTICS");
    println!("{}", "=".repeat(60));
    println!("Total JSONL Files:          {}", total_files);
    println!(
        "Total File Size:            {:.2} KB",
        total_size as f64 / 1024.0
    );
    println!("Total Lines:                {}", total_lines);
    println!("Total JSON Objects Parsed:  {}", total_parsed);
    println!("Parse Failures:             {}", total_failed);
    println!("Days Processed:             {}", days);
    println!("Months Processed:           {}", months);
    println!("Projects:                   {}", projects);
    println!("{}", "=".repeat(60));
    println!();
}
