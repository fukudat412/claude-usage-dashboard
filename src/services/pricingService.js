// モデル別単価の単一情報源は src/config/model-pricing.json。
// Rust実装(rust-processor)も同じJSONを読むため、単価の変更はJSONの編集だけで両実装に反映される。
const pricingConfig = require('../config/model-pricing.json');

const PER_TOKEN = 1 / 1_000_000; // JSONは$/1Mトークン表記

const CACHE_WRITE_5M_MULTIPLIER = pricingConfig.cache.write5mMultiplier;
const CACHE_WRITE_1H_MULTIPLIER = pricingConfig.cache.write1hMultiplier;
const CACHE_READ_MULTIPLIER = pricingConfig.cache.readMultiplier;

// { model: { input, output, cacheRead? } } を $/トークン に変換して保持
// cacheRead はモデル固有の読み取り単価(Fable 5.1 / Opus 5.5 など)。無ければ入力単価×readMultiplier
const PRICING = Object.fromEntries(
  Object.entries(pricingConfig.models).map(([model, price]) => [
    model,
    {
      input: price.input * PER_TOKEN,
      output: price.output * PER_TOKEN,
      cacheRead: (price.cacheRead ?? price.input * CACHE_READ_MULTIPLIER) * PER_TOKEN,
    },
  ])
);
const FALLBACK_RULES = pricingConfig.fallbacks.rules;
const DEFAULT_MODEL = pricingConfig.fallbacks.default;

function getPricingForModel(model) {
  if (!model) {
    return PRICING[DEFAULT_MODEL];
  }

  // 完全一致を最優先
  if (PRICING[model]) {
    return PRICING[model];
  }

  const normalizedModel = model.toLowerCase();

  // synthetic等の内部プレースホルダは警告なしでデフォルト
  if (normalizedModel.includes('synthetic') || normalizedModel.startsWith('<')) {
    return PRICING[DEFAULT_MODEL];
  }

  // ファミリー名によるフォールバック（JSONのrulesを上から順に適用）
  for (const rule of FALLBACK_RULES) {
    if (rule.keywords.some((keyword) => normalizedModel.includes(keyword))) {
      return PRICING[rule.use];
    }
  }

  console.warn(`Unknown model: ${model} — falling back to ${DEFAULT_MODEL} pricing`);
  return PRICING[DEFAULT_MODEL];
}

// cacheCreation1hTokens は cacheCreationTokens の内数(1時間TTL書き込み分)
function calculateCost(model, inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0, cacheCreation1hTokens = 0) {
  const pricing = getPricingForModel(model);
  const cacheCreation5mTokens = Math.max(cacheCreationTokens - cacheCreation1hTokens, 0);

  const inputCost = inputTokens * pricing.input;
  const cacheReadCost = cacheReadTokens * pricing.cacheRead;
  const cacheCreationCost =
    cacheCreation5mTokens * pricing.input * CACHE_WRITE_5M_MULTIPLIER +
    cacheCreation1hTokens * pricing.input * CACHE_WRITE_1H_MULTIPLIER;
  const outputCost = outputTokens * pricing.output;

  return inputCost + cacheReadCost + cacheCreationCost + outputCost;
}

function getModelPrice(model) {
  return PRICING[model] || null;
}

function getAllModels() {
  return Object.keys(PRICING);
}

function calculateUsageMetrics(usage, model) {
  // Raw token counts from API
  const newInputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheReadTokens = usage.cache_read_input_tokens || 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
  // TTL別内訳が無い古いログは全量を5分TTLとみなす
  const cacheCreation1hTokens = Math.min(usage.cache_creation?.ephemeral_1h_input_tokens || 0, cacheCreationTokens);

  // Corrected calculations
  const totalInputTokens = newInputTokens + cacheCreationTokens; // Only tokens charged at full price
  const totalCacheTokens = cacheReadTokens; // Tokens charged at read-multiplier price
  const totalTokens = totalInputTokens + totalCacheTokens + outputTokens;

  const cost = calculateCost(model, newInputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, cacheCreation1hTokens);

  return {
    inputTokens: totalInputTokens, // New input + cache creation (full price)
    outputTokens: outputTokens,
    cachedTokens: totalCacheTokens, // Cache read tokens

    newInputTokens,
    cacheCreationTokens,
    cacheReadTokens,

    totalTokens,
    cost
  };
}

module.exports = {
  calculateCost,
  getModelPrice,
  getAllModels,
  calculateUsageMetrics,
  PRICING
};
