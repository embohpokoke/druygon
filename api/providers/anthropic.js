const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function isConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getClient() {
  if (!client && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

async function complete(prompt, options = {}) {
  const anthropic = getClient();
  if (!anthropic) {
    throw new Error('Anthropic not configured');
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: options.maxTokens || 800,
    temperature: options.temperature || 0.7,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0]?.text || '';

  return {
    text: text.trim(),
    inputTokens: response.usage?.input_tokens || 0,
    outputTokens: response.usage?.output_tokens || 0
  };
}

function getDescription() {
  return 'Anthropic Claude Haiku 4.5';
}

module.exports = {
  isConfigured,
  complete,
  getDescription
};
