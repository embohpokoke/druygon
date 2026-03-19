/**
 * Hybrid Authentication Manager
 * Supports both OAuth (optional) and API Key (default)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Get provider client - checks OAuth session first, fallback to API key
 */
function getProviderClient(providerName, req) {
  const session = req?.session;

  switch (providerName) {
    case 'gemini':
      // Check OAuth session first
      if (session?.googleTokens?.access_token) {
        return {
          type: 'oauth',
          client: createGeminiOAuthClient(session.googleTokens.access_token),
          source: 'user-oauth'
        };
      }
      // Fallback to API key
      if (process.env.GEMINI_API_KEY) {
        return {
          type: 'apikey',
          client: new GoogleGenerativeAI(process.env.GEMINI_API_KEY),
          source: 'server-apikey'
        };
      }
      return null;

    case 'openai':
      // Check OAuth session first
      if (session?.openaiTokens?.access_token) {
        return {
          type: 'oauth',
          client: new OpenAI({ apiKey: session.openaiTokens.access_token }),
          source: 'user-oauth'
        };
      }
      // Fallback to API key
      if (process.env.OPENAI_API_KEY) {
        return {
          type: 'apikey',
          client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
          source: 'server-apikey'
        };
      }
      return null;

    case 'anthropic':
      // Anthropic OAuth banned - API key only
      if (process.env.ANTHROPIC_API_KEY) {
        return {
          type: 'apikey',
          client: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
          source: 'server-apikey'
        };
      }
      return null;

    default:
      return null;
  }
}

/**
 * Create Gemini OAuth client (placeholder - requires google-auth-library)
 */
function createGeminiOAuthClient(accessToken) {
  // TODO: Implement Google OAuth client with access token
  // For now, return null (API key fallback will be used)
  return null;
}

/**
 * Check if user has active OAuth session
 */
function hasOAuthSession(req, providerName) {
  if (!req?.session) return false;

  switch (providerName) {
    case 'gemini':
      return !!req.session.googleTokens?.access_token;
    case 'openai':
      return !!req.session.openaiTokens?.access_token;
    case 'anthropic':
      return false; // OAuth banned
    default:
      return false;
  }
}

/**
 * Get authentication status for frontend
 */
function getAuthStatus(req) {
  return {
    gemini: {
      oauth: hasOAuthSession(req, 'gemini'),
      apikey: !!process.env.GEMINI_API_KEY,
      available: hasOAuthSession(req, 'gemini') || !!process.env.GEMINI_API_KEY
    },
    openai: {
      oauth: hasOAuthSession(req, 'openai'),
      apikey: !!process.env.OPENAI_API_KEY,
      available: hasOAuthSession(req, 'openai') || !!process.env.OPENAI_API_KEY
    },
    anthropic: {
      oauth: false, // Always false - OAuth banned
      apikey: !!process.env.ANTHROPIC_API_KEY,
      available: !!process.env.ANTHROPIC_API_KEY
    }
  };
}

module.exports = {
  getProviderClient,
  hasOAuthSession,
  getAuthStatus
};
