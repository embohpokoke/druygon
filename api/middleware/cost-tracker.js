const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../logs/cost.jsonl');
const COSTS = {
  // Per 1M tokens
  gemini: { input: 0, output: 0 }, // Free
  openai: { input: 0.15, output: 0.60 }, // gpt-4o-mini
  anthropic: { input: 0.80, output: 4.00 } // claude-haiku-4-5
};

let monthlyTotal = 0;
let providerTotals = { gemini: 0, openai: 0, anthropic: 0 };

function ensureLogDir() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function calculateCost(provider, inputTokens, outputTokens) {
  const rates = COSTS[provider] || { input: 0, output: 0 };
  const inputCost = (inputTokens / 1_000_000) * rates.input;
  const outputCost = (outputTokens / 1_000_000) * rates.output;
  return inputCost + outputCost;
}

function recordRequest(data) {
  const { provider, inputTokens, outputTokens, endpoint } = data;
  const cost = calculateCost(provider, inputTokens, outputTokens);

  monthlyTotal += cost;
  providerTotals[provider] = (providerTotals[provider] || 0) + cost;

  const logEntry = {
    timestamp: new Date().toISOString(),
    provider,
    endpoint,
    inputTokens,
    outputTokens,
    cost,
    monthlyTotal
  };

  ensureLogDir();
  fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');

  const budgetCap = parseFloat(process.env.MONTHLY_BUDGET_CAP || '6.00');
  if (monthlyTotal > budgetCap * 0.8) {
    console.warn(`⚠️  Budget warning: $${monthlyTotal.toFixed(4)} / $${budgetCap} (${(monthlyTotal / budgetCap * 100).toFixed(1)}%)`);
  }

  return cost;
}

function getSummary() {
  const budgetCap = parseFloat(process.env.MONTHLY_BUDGET_CAP || '6.00');
  return {
    monthlyTotal: parseFloat(monthlyTotal.toFixed(4)),
    budgetCap,
    remaining: parseFloat((budgetCap - monthlyTotal).toFixed(4)),
    percentUsed: parseFloat(((monthlyTotal / budgetCap) * 100).toFixed(2)),
    byProvider: {
      gemini: parseFloat((providerTotals.gemini || 0).toFixed(4)),
      openai: parseFloat((providerTotals.openai || 0).toFixed(4)),
      anthropic: parseFloat((providerTotals.anthropic || 0).toFixed(4))
    }
  };
}

function getRemainingBudget() {
  const budgetCap = parseFloat(process.env.MONTHLY_BUDGET_CAP || '6.00');
  return parseFloat((budgetCap - monthlyTotal).toFixed(4));
}

module.exports = {
  recordRequest,
  getSummary,
  getRemainingBudget
};
