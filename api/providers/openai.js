const OpenAI = require('openai');

let client = null;

function isConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

async function complete(prompt, options = {}) {
  const openai = getClient();
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 800
  });

  const choice = response.choices[0];

  return {
    text: choice.message.content.trim(),
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0
  };
}

function getDescription() {
  return 'OpenAI GPT-4o-mini';
}

module.exports = {
  isConfigured,
  complete,
  getDescription
};
