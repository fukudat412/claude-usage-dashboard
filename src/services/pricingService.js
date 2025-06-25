/**
 * 価格計算サービス
 * Claude APIの使用量に基づく価格計算を統一管理
 */

// モデル別価格設定（USD）
const PRICING_RATES = {
  // Claude 3.5 Sonnet（デフォルト）
  'claude-3-5-sonnet': {
    input: 0.000003,        // $3 per MTok
    output: 0.000015,       // $15 per MTok
    cacheCreate: 0.00000375, // $3.75 per MTok
    cacheRead: 0.0000003    // $0.30 per MTok
  },
  
  // Claude 3 Opus
  'claude-3-opus': {
    input: 0.000015,        // $15 per MTok
    output: 0.000075,       // $75 per MTok
    cacheCreate: 0.00001875, // $18.75 per MTok
    cacheRead: 0.0000015    // $1.50 per MTok
  },
  
  // Claude 3 Haiku
  'claude-3-haiku': {
    input: 0.00000025,      // $0.25 per MTok
    output: 0.00000125,     // $1.25 per MTok
    cacheCreate: 0.0000003, // $0.30 per MTok
    cacheRead: 0.00000003   // $0.03 per MTok
  }
};

/**
 * モデル名から価格レートを取得
 * @param {string} model - モデル名
 * @returns {object} 価格レート
 */
function getPricingRates(model) {
  if (!model) {
    return PRICING_RATES['claude-3-5-sonnet']; // デフォルト
  }
  
  // モデル名の正規化
  const normalizedModel = model.toLowerCase();
  
  if (normalizedModel.includes('opus')) {
    return PRICING_RATES['claude-3-opus'];
  } else if (normalizedModel.includes('haiku')) {
    return PRICING_RATES['claude-3-haiku'];
  } else {
    return PRICING_RATES['claude-3-5-sonnet']; // デフォルト
  }
}

/**
 * 使用量データから価格を計算
 * @param {object} usage - 使用量データ
 * @param {string} model - モデル名
 * @returns {number} 計算された価格（USD）
 */
function calculateCost(usage, model = 'claude-3-5-sonnet') {
  const rates = getPricingRates(model);
  
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheCreateTokens = usage.cache_creation_input_tokens || 0;
  const cacheReadTokens = usage.cache_read_input_tokens || 0;
  
  const inputCost = inputTokens * rates.input;
  const outputCost = outputTokens * rates.output;
  const cacheCreateCost = cacheCreateTokens * rates.cacheCreate;
  const cacheReadCost = cacheReadTokens * rates.cacheRead;
  
  return inputCost + outputCost + cacheCreateCost + cacheReadCost;
}

/**
 * 使用量データから各種トークン数を計算
 * @param {object} usage - 使用量データ
 * @returns {object} トークン情報
 */
function calculateTokens(usage) {
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheCreateTokens = usage.cache_creation_input_tokens || 0;
  const cacheReadTokens = usage.cache_read_input_tokens || 0;
  
  return {
    inputTokens,
    outputTokens,
    cachedTokens: cacheCreateTokens + cacheReadTokens,
    totalTokens: inputTokens + outputTokens + cacheCreateTokens + cacheReadTokens
  };
}

/**
 * 価格とトークン情報をまとめて計算
 * @param {object} usage - 使用量データ
 * @param {string} model - モデル名
 * @returns {object} 価格とトークン情報
 */
function calculateUsageMetrics(usage, model) {
  const tokens = calculateTokens(usage);
  const cost = calculateCost(usage, model);
  
  return {
    ...tokens,
    cost,
    model
  };
}

/**
 * 価格レート一覧を取得
 * @returns {object} 全価格レート
 */
function getAllPricingRates() {
  return PRICING_RATES;
}

module.exports = {
  calculateCost,
  calculateTokens,
  calculateUsageMetrics,
  getPricingRates,
  getAllPricingRates
};