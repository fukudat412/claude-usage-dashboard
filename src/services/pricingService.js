const PRICING = {
  'claude-3-opus-20240229': {
    input: 15.00 / 1_000_000,
    output: 75.00 / 1_000_000
  },
  'claude-opus-4-20250514': {
    input: 15.00 / 1_000_000,
    output: 75.00 / 1_000_000
  },
  'claude-sonnet-4-20250514': {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000
  },
  'claude-3-5-sonnet-20241022': {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000
  },
  'claude-3-5-sonnet-20240620': {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000
  },
  'claude-3-5-haiku-20241022': {
    input: 1.00 / 1_000_000,
    output: 5.00 / 1_000_000
  },
  'claude-3-haiku-20240307': {
    input: 0.25 / 1_000_000,
    output: 1.25 / 1_000_000
  },
  'claude-3-sonnet-20240229': {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000
  },
  'gpt-4': {
    input: 30.00 / 1_000_000,
    output: 60.00 / 1_000_000
  },
  'gpt-4-turbo': {
    input: 10.00 / 1_000_000,
    output: 30.00 / 1_000_000
  },
  'gpt-3.5-turbo': {
    input: 0.50 / 1_000_000,
    output: 1.50 / 1_000_000
  }
};

function calculateCost(model, inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0) {
  const pricing = PRICING[model];
  if (!pricing) {
    console.warn(`Unknown model: ${model}`);
    return 0;
  }

  // New input tokens cost (full price)
  const inputCost = inputTokens * pricing.input;
  
  // Cache read tokens cost (10% of input price)
  const cacheReadCost = cacheReadTokens * pricing.input * 0.1;
  
  // Cache creation tokens cost (full price for creation)
  const cacheCreationCost = cacheCreationTokens * pricing.input;
  
  // Output tokens cost
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
  const totalCacheTokens = cacheReadTokens; // Tokens charged at 10% (read from cache)
  const totalTokens = totalInputTokens + totalCacheTokens + outputTokens;
  
  const cost = calculateCost(model, newInputTokens, outputTokens, cacheReadTokens, cacheCreationTokens);
  
  return {
    // Clarified token breakdown
    inputTokens: totalInputTokens, // New input + cache creation (full price)
    outputTokens: outputTokens, // Output tokens
    cachedTokens: totalCacheTokens, // Cache read tokens (10% price)
    
    // Detailed breakdown for analysis
    newInputTokens, // Only new input tokens
    cacheCreationTokens, // Cache creation tokens
    cacheReadTokens, // Cache read tokens
    
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