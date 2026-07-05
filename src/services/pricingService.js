// モデル別単価の単一情報源は src/config/model-pricing.json。
// Rust実装(rust-processor)も同じJSONを読むため、単価の変更はJSONの編集だけで両実装に反映される。
const pricingConfig = require('../config/model-pricing.json');

const PER_TOKEN = 1 / 1_000_000; // JSONは$/1Mトークン表記

// { model: { input, output } } を $/トークン に変換して保持
const PRICING = Object.fromEntries(
  Object.entries(pricingConfig.models).map(([model, price]) => [
    model,
    { input: price.input * PER_TOKEN, output: price.output * PER_TOKEN },
  ])
);

const CACHE_CREATION_MULTIPLIER = pricingConfig.cache.creationMultiplier;
const CACHE_READ_MULTIPLIER = pricingConfig.cache.readMultiplier;
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

function calculateCost(model, inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0) {
  const pricing = getPricingForModel(model);

  const inputCost = inputTokens * pricing.input;
  const cacheReadCost = cacheReadTokens * pricing.input * CACHE_READ_MULTIPLIER;
  const cacheCreationCost = cacheCreationTokens * pricing.input * CACHE_CREATION_MULTIPLIER;
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

  // Corrected calculations
  const totalInputTokens = newInputTokens + cacheCreationTokens; // Only tokens charged at full price
  const totalCacheTokens = cacheReadTokens; // Tokens charged at read-multiplier price
  const totalTokens = totalInputTokens + totalCacheTokens + outputTokens;

  const cost = calculateCost(model, newInputTokens, outputTokens, cacheReadTokens, cacheCreationTokens);

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
