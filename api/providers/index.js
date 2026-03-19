const gemini = require('./gemini');
const openai = require('./openai');
const anthropic = require('./anthropic');

const PROVIDERS = {
  gemini,
  openai,
  anthropic
};

const providerHealth = {
  gemini: { available: true, lastError: null, lastCheck: null },
  openai: { available: true, lastError: null, lastCheck: null },
  anthropic: { available: true, lastError: null, lastCheck: null }
};

function getFallbackOrder() {
  const order = process.env.FALLBACK_ORDER || 'gemini,openai,anthropic';
  return order.split(',').map(p => p.trim()).filter(p => PROVIDERS[p]);
}

function markProviderDown(providerName, error) {
  providerHealth[providerName] = {
    available: false,
    lastError: error.message,
    lastCheck: new Date().toISOString()
  };
  console.warn(`❌ Provider ${providerName} marked down: ${error.message}`);
}

function markProviderUp(providerName) {
  if (!providerHealth[providerName].available) {
    console.log(`✅ Provider ${providerName} back online`);
  }
  providerHealth[providerName] = {
    available: true,
    lastError: null,
    lastCheck: new Date().toISOString()
  };
}

async function complete(prompt, options = {}) {
  const fallbackOrder = getFallbackOrder();
  const errors = [];

  for (const providerName of fallbackOrder) {
    // Skip if provider marked down recently (< 5 min ago)
    const health = providerHealth[providerName];
    if (!health.available && health.lastCheck) {
      const timeSinceCheck = Date.now() - new Date(health.lastCheck).getTime();
      if (timeSinceCheck < 5 * 60 * 1000) {
        console.log(`⏭️  Skipping ${providerName} (recently failed)`);
        continue;
      }
    }

    const provider = PROVIDERS[providerName];
    if (!provider || !provider.isConfigured()) {
      console.log(`⏭️  Skipping ${providerName} (not configured)`);
      continue;
    }

    try {
      console.log(`🔄 Trying provider: ${providerName}`);
      const result = await provider.complete(prompt, options);
      markProviderUp(providerName);

      return {
        ...result,
        provider: providerName
      };
    } catch (error) {
      console.error(`❌ Provider ${providerName} failed:`, error.message);
      errors.push({ provider: providerName, error: error.message });
      markProviderDown(providerName, error);
    }
  }

  // All providers failed
  throw new Error(`All providers failed. Errors: ${JSON.stringify(errors)}`);
}

async function getStatus() {
  const status = {};

  for (const [name, provider] of Object.entries(PROVIDERS)) {
    status[name] = {
      configured: provider.isConfigured(),
      health: providerHealth[name],
      description: provider.getDescription ? provider.getDescription() : name
    };
  }

  return status;
}

module.exports = {
  complete,
  getStatus,
  getFallbackOrder
};
