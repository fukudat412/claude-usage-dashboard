use anyhow::{Context, Result};
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

    /// Path to model-pricing.json (省略時はビルド時に埋め込んだコピーを使用)
    #[arg(long)]
    pricing_path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Message {
    #[serde(default)]
    timestamp: Option<String>,
    #[serde(rename = "sessionId")]
    session_id: Option<String>,
    #[serde(rename = "requestId")]
    request_id: Option<String>,
    message: Option<MessageContent>,
}

#[derive(Debug, Deserialize)]
struct MessageContent {
    id: Option<String>,
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
    // TTL別の内訳。古いログには無い(その場合は全量を5分TTLとみなす)
    cache_creation: Option<CacheCreation>,
}

#[derive(Debug, Deserialize)]
struct CacheCreation {
    ephemeral_1h_input_tokens: Option<u64>,
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

// ==== 価格設定 ====
// 単一情報源は src/config/model-pricing.json。実行時に --pricing-path で渡されたファイルを読み、
// 無ければビルド時に埋め込んだ同ファイルのコピーを使う(Node側 pricingService.js も同じJSONを読む)。
const EMBEDDED_PRICING: &str = include_str!("../../src/config/model-pricing.json");

#[derive(Debug, Deserialize, Clone, Copy)]
struct ModelPrice {
    input: f64,  // $/1Mトークン
    output: f64, // $/1Mトークン
    // モデル固有のキャッシュ読み取り単価($/1M)。無ければ input × readMultiplier
    #[serde(rename = "cacheRead")]
    cache_read: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct CachePricing {
    #[serde(rename = "write5mMultiplier")]
    write_5m_multiplier: f64,
    #[serde(rename = "write1hMultiplier")]
    write_1h_multiplier: f64,
    #[serde(rename = "readMultiplier")]
    read_multiplier: f64,
}

#[derive(Debug, Deserialize)]
struct FallbackRule {
    keywords: Vec<String>,
    #[serde(rename = "use")]
    use_model: String,
}

#[derive(Debug, Deserialize)]
struct FallbackConfig {
    rules: Vec<FallbackRule>,
    #[serde(rename = "default")]
    default_model: String,
}

#[derive(Debug, Deserialize)]
struct PricingConfig {
    cache: CachePricing,
    models: HashMap<String, ModelPrice>,
    fallbacks: FallbackConfig,
}

fn load_pricing_config(pricing_path: Option<&str>) -> Result<PricingConfig> {
    let raw = match pricing_path {
        Some(path) => fs::read_to_string(path)
            .context(format!("Failed to read pricing config: {}", path))?,
        None => EMBEDDED_PRICING.to_string(),
    };
    serde_json::from_str(&raw).context("Failed to parse pricing config")
}

fn pricing_for_model(cfg: &PricingConfig, model: Option<&str>) -> ModelPrice {
    let name = model.unwrap_or("");
    if let Some(price) = cfg.models.get(name) {
        return *price;
    }
    let lower = name.to_lowercase();
    if !(lower.contains("synthetic") || lower.starts_with('<')) {
        for rule in &cfg.fallbacks.rules {
            if rule.keywords.iter().any(|k| lower.contains(k.as_str())) {
                if let Some(price) = cfg.models.get(&rule.use_model) {
                    return *price;
                }
            }
        }
    }
    cfg.models[&cfg.fallbacks.default_model]
}

fn calculate_usage_metrics(cfg: &PricingConfig, usage: &Usage, model: Option<&str>) -> UsageMetrics {
    let new_input = usage.input_tokens.unwrap_or(0);
    let output_tokens = usage.output_tokens.unwrap_or(0);
    let cache_creation_tokens = usage.cache_creation_tokens.unwrap_or(0);
    let cache_read_tokens = usage.cache_read_tokens.unwrap_or(0);
    let cache_creation_1h = usage
        .cache_creation
        .as_ref()
        .and_then(|c| c.ephemeral_1h_input_tokens)
        .unwrap_or(0)
        .min(cache_creation_tokens);
    let cache_creation_5m = cache_creation_tokens - cache_creation_1h;

    // Node実装と同じ定義:
    //   inputTokens  = 新規入力 + キャッシュ作成（フル価格帯）
    //   cachedTokens = キャッシュ読み取り
    let input_tokens = new_input + cache_creation_tokens;
    let cached_tokens = cache_read_tokens;
    let total_tokens = input_tokens + cached_tokens + output_tokens;

    let price = pricing_for_model(cfg, model);
    let per_token = 1.0e-6; // JSONは$/1Mトークン表記
    let in_price = price.input * per_token;
    let out_price = price.output * per_token;
    let cache_read_price = price
        .cache_read
        .map(|p| p * per_token)
        .unwrap_or(in_price * cfg.cache.read_multiplier);
    let cost = (new_input as f64) * in_price
        + (cache_read_tokens as f64) * cache_read_price
        + (cache_creation_5m as f64) * in_price * cfg.cache.write_5m_multiplier
        + (cache_creation_1h as f64) * in_price * cfg.cache.write_1h_multiplier
        + (output_tokens as f64) * out_price;

    UsageMetrics {
        input_tokens,
        output_tokens,
        cached_tokens,
        total_tokens,
        cost,
        new_input_tokens: new_input,
        cache_creation_tokens,
        cache_read_tokens,
    }
}

struct DedupEntry {
    project_name: String,
    session_id: Option<String>,
    timestamp: Option<String>,
    model: Option<String>,
    usage: Usage,
    usage_total: u64,
}

/// サブエージェントのトランスクリプト(<sessionId>/subagents/agent-*.jsonl)も含めるため、
/// プロジェクト配下の .jsonl を再帰的に収集する
fn collect_jsonl_files(dir: &PathBuf, out: &mut Vec<PathBuf>) -> Result<()> {
    for entry in fs::read_dir(dir).context(format!("Failed to read dir: {:?}", dir))? {
        let path = entry?.path();
        if path.is_dir() {
            collect_jsonl_files(&path, out)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
            out.push(path);
        }
    }
    Ok(())
}

fn usage_total_of(usage: &Usage) -> u64 {
    usage.input_tokens.unwrap_or(0)
        + usage.output_tokens.unwrap_or(0)
        + usage.cache_creation_tokens.unwrap_or(0)
        + usage.cache_read_tokens.unwrap_or(0)
}

fn process_project_data(projects_path: &str, pricing: &PricingConfig) -> Result<ProcessedData> {
    let project_dirs: Vec<PathBuf> = fs::read_dir(projects_path)
        .context("Failed to read projects directory")?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect();

    // ---- Phase A: 収集 + 重複排除 ----
    // ストリーミング中に同じAPI応答(message.id + requestId)がusage漸増で複数回書かれ、
    // fork/resume/compactでも同一ターンが複製されるため、キーごとに
    // トークン合計が最大のエントリ(=最終値)だけを採用する。
    let mut dedup: HashMap<String, DedupEntry> = HashMap::new();
    let mut project_meta: Vec<(String, String, usize, Option<String>)> = Vec::new(); // (name, path, message_count, last_activity)
    let mut fallback_key = 0u64;

    for project_dir in &project_dirs {
        let project_name = project_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        let mut files: Vec<PathBuf> = Vec::new();
        collect_jsonl_files(project_dir, &mut files)?;

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
                    if last_activity.is_none() || timestamp > last_activity.as_ref().unwrap() {
                        last_activity = Some(timestamp.clone());
                    }
                }

                if let Some(message_content) = msg.message {
                    if let Some(usage) = message_content.usage {
                        let key = match (&message_content.id, &msg.request_id) {
                            (None, None) => {
                                fallback_key += 1;
                                format!("__nokey__:{}", fallback_key)
                            }
                            (mid, rid) => format!(
                                "{}:{}",
                                mid.as_deref().unwrap_or(""),
                                rid.as_deref().unwrap_or("")
                            ),
                        };

                        let candidate = DedupEntry {
                            project_name: project_name.clone(),
                            session_id: msg.session_id.clone(),
                            timestamp: msg.timestamp.clone(),
                            model: message_content.model.clone(),
                            usage_total: usage_total_of(&usage),
                            usage,
                        };

                        match dedup.get(&key) {
                            Some(existing) if existing.usage_total > candidate.usage_total => {}
                            _ => {
                                dedup.insert(key, candidate);
                            }
                        }
                    }
                }
            }
        }

        project_meta.push((
            project_name,
            project_dir.to_string_lossy().to_string(),
            message_count,
            last_activity,
        ));
    }

    // ---- Phase B: dedup済みエントリを集計 ----
    let mut usage_by_date: HashMap<String, DayData> = HashMap::new();
    let mut usage_by_month: HashMap<String, MonthData> = HashMap::new();
    let mut usage_by_model: HashMap<String, ModelData> = HashMap::new();
    let mut detailed_usage = Vec::new();
    let mut project_totals: HashMap<String, (u64, f64)> = HashMap::new();

    for entry in dedup.values() {
        let model = entry.model.clone().unwrap_or_else(|| "unknown".to_string());
        let metrics = calculate_usage_metrics(pricing, &entry.usage, Some(&model));

        if let Some(timestamp) = &entry.timestamp {
            if let Some(session_id) = &entry.session_id {
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

            if let Some(session_id) = &entry.session_id {
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

            if let Some(session_id) = &entry.session_id {
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

            if let Some(session_id) = &entry.session_id {
                model_data.sessions.insert(session_id.clone());
            }
        }

        // Project totals
        let totals = project_totals
            .entry(entry.project_name.clone())
            .or_insert((0, 0.0));
        totals.0 += metrics.total_tokens;
        totals.1 += metrics.cost;
    }

    let mut projects: Vec<Project> = project_meta
        .into_iter()
        .map(|(name, path, message_count, last_activity)| {
            let (total_tokens, total_cost) =
                project_totals.get(&name).copied().unwrap_or((0, 0.0));
            Project {
                name,
                path,
                total_tokens,
                total_cost: format!("{:.4}", total_cost),
                message_count,
                last_activity,
            }
        })
        .collect();

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

    let pricing = load_pricing_config(args.pricing_path.as_deref())?;
    let data = process_project_data(&args.projects_path, &pricing)
        .context("Failed to process project data")?;

    let json = serde_json::to_string(&data)
        .context("Failed to serialize data to JSON")?;

    println!("{}", json);

    Ok(())
}
