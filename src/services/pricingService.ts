/**
 * 価格計算サービス
 * Claude APIの使用量に基づく価格計算を統一管理
 */

interface PricingRate {
  input: number;
  output: number;
  cacheCreate: number;
  cacheRead: number;
}

interface UsageData {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface TokenInfo {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
}

interface UsageMetrics extends TokenInfo {
  cost: number;
  model: string;
}

// モデル別価格設定（USD）
const PRICING_RATES: Record<string, PricingRate> = {
  // Claude 3.5 Sonnet（デフォルト）
  'claude-3-5-sonnet': {
    input: 0.000003,        // $3 per MTok
    output: 0.000015,       // $15 per MTok
    cacheCreate: 0.00000375, // $3.75 per MTok
    cacheRead: 0.0000003    // $0.30 per MTok
  },

  // Claude 3.5 Sonnet (新バージョン)
  'claude-sonnet-4-5-20250929': {
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
  },

  // Claude 3 Haiku (新バージョン)
  'claude-haiku-4-5-20251001': {
    input: 0.00000025,      // $0.25 per MTok
    output: 0.00000125,     // $1.25 per MTok
    cacheCreate: 0.0000003, // $0.30 per MTok
    cacheRead: 0.00000003   // $0.03 per MTok
  }
};

/**
 * モデル名から価格レートを取得
 */
export function getPricingRates(model?: string): PricingRate {
  if (!model) {
    return PRICING_RATES['claude-3-5-sonnet']; // デフォルト
  }

  // モデル名の正規化
  const normalizedModel = model.toLowerCase();

  // 完全一致を優先的にチェック
  if (PRICING_RATES[normalizedModel]) {
    return PRICING_RATES[normalizedModel];
  }

  // パターンマッチング
  if (normalizedModel.includes('opus')) {
    return PRICING_RATES['claude-3-opus'];
  } else if (normalizedModel.includes('haiku')) {
    // 新しいHaikuバージョンを優先
    if (normalizedModel.includes('4-5') || normalizedModel.includes('20251001')) {
      return PRICING_RATES['claude-haiku-4-5-20251001'];
    }
    return PRICING_RATES['claude-3-haiku'];
  } else if (normalizedModel.includes('sonnet')) {
    // 新しいSonnetバージョンを優先
    if (normalizedModel.includes('4-5') || normalizedModel.includes('20250929')) {
      return PRICING_RATES['claude-sonnet-4-5-20250929'];
    }
    return PRICING_RATES['claude-3-5-sonnet'];
  } else {
    // モデル名が認識できない場合は警告を出力
    console.warn(`Unknown model: ${model}`);
    return PRICING_RATES['claude-3-5-sonnet']; // デフォルト
  }
}

/**
 * 使用量データから価格を計算
 */
export function calculateCost(usage: UsageData, model: string = 'claude-3-5-sonnet'): number {
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
 */
export function calculateTokens(usage: UsageData): TokenInfo {
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
 */
export function calculateUsageMetrics(usage: UsageData, model: string): UsageMetrics {
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
 */
export function getAllPricingRates(): Record<string, PricingRate> {
  return PRICING_RATES;
}