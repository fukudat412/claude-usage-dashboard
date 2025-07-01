const PRICING = {
  'claude-3-opus-20240229': {
    input: 15.00 / 1_000_000,
    output: 75.00 / 1_000_000
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

function calculateCost(model, inputTokens = 0, outputTokens = 0, cachedTokens = 0) {
  const pricing = PRICING[model];
  if (!pricing) {
    console.warn(`Unknown model: ${model}`);
    return 0;
  }

  const inputCost = (inputTokens - cachedTokens) * pricing.input;
  const cachedCost = cachedTokens * pricing.input * 0.1;
  const outputCost = outputTokens * pricing.output;

  return inputCost + cachedCost + outputCost;
}

function getModelPrice(model) {
  return PRICING[model] || null;
}

function getAllModels() {
  return Object.keys(PRICING);
}

module.exports = {
  calculateCost,
  getModelPrice,
  getAllModels,
  PRICING
};