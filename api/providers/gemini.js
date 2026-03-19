const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

function isConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

function getClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

async function complete(prompt, options = {}) {
  const client = getClient();
  if (!client) {
    throw new Error('Gemini not configured');
  }

  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature || 0.7,
      maxOutputTokens: options.maxTokens || 800,
    }
  });

  const response = result.response;
  const text = response.text();

  return {
    text: text.trim(),
    inputTokens: response.usageMetadata?.promptTokenCount || 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount || 0
  };
}

function getDescription() {
  return 'Google Gemini 2.0 Flash (Free Tier)';
}

module.exports = {
  isConfigured,
  complete,
  getDescription
};
