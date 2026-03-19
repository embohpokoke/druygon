/**
 * EXAMPLE: Google Gemini OAuth 2.0 Flow
 * Source: https://ai.google.dev/gemini-api/docs/oauth
 *
 * Use Case: Stricter access control, model tuning, semantic retrieval
 * NOT recommended for basic Gemini API calls (use API key instead)
 */

const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// OAuth2 Client Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,     // From Google Cloud Console
  process.env.GOOGLE_CLIENT_SECRET,
  'https://druygon.my.id/api/oauth/google/callback'
);

// Required scopes for Gemini API
const SCOPES = [
  'https://www.googleapis.com/auth/generative-language.tuning', // Model tuning
  'https://www.googleapis.com/auth/generative-language.retriever' // Semantic retrieval
];

/**
 * Step 1: Generate OAuth URL
 */
function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: SCOPES,
    prompt: 'consent' // Force consent screen to get refresh token
  });
}

/**
 * Step 2: Handle OAuth Callback
 */
async function handleCallback(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Store tokens securely
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date
  };
}

/**
 * Step 3: Use OAuth token with Gemini API
 */
async function callGeminiWithOAuth(accessToken, prompt) {
  // Option A: Using googleapis (for tuning/retrieval)
  const genai = google.generativelanguage({
    version: 'v1',
    auth: oauth2Client
  });

  // Option B: Using GoogleGenerativeAI SDK
  // NOTE: SDK primarily uses API keys, not OAuth
  // For basic generation, API key is recommended

  const response = await genai.models.generateContent({
    model: 'models/gemini-2.0-flash',
    contents: [{ parts: [{ text: prompt }] }]
  });

  return response.data;
}

/**
 * Express Routes
 */
const express = require('express');
const router = express.Router();

// Initiate OAuth
router.get('/oauth/google/login', (req, res) => {
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
});

// OAuth Callback
router.get('/oauth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const tokens = await handleCallback(code);

    // Store tokens in session or database
    req.session.googleTokens = tokens;

    res.redirect('/ai-learn/?oauth=success');
  } catch (error) {
    res.status(500).json({ error: 'Google OAuth failed', message: error.message });
  }
});

// Protected endpoint using OAuth
router.post('/ai/gemini-tuning', async (req, res) => {
  if (!req.session.googleTokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  oauth2Client.setCredentials(req.session.googleTokens);

  // Use OAuth for advanced features (tuning, retrieval)
  // For basic generation, use API key instead
  const genai = google.generativelanguage({
    version: 'v1',
    auth: oauth2Client
  });

  // Example: Create tuned model
  const tunedModel = await genai.tunedModels.create({
    requestBody: {
      displayName: 'Druygon Math Tutor',
      baseModel: 'models/gemini-2.0-flash',
      tuningTask: {
        trainingData: {
          // Training examples
        }
      }
    }
  });

  res.json({ success: true, model: tunedModel.data });
});

module.exports = router;

/**
 * IMPORTANT NOTES:
 *
 * 1. OAuth for Gemini is ONLY needed for:
 *    - Model tuning (custom fine-tuned models)
 *    - Semantic retrieval (RAG with grounding)
 *
 * 2. For basic generation (what Druygon needs), use API key:
 *    - Simpler setup
 *    - No user interaction required
 *    - Free tier available
 *
 * 3. Setup OAuth credentials:
 *    - Go to Google Cloud Console
 *    - Enable Generative Language API
 *    - Create OAuth 2.0 credentials
 *    - Add authorized redirect URIs
 *
 * 4. User Experience:
 *    - OAuth requires user to login with Google account
 *    - Not ideal for kids (Dru doesn't have Google account)
 *    - API key is transparent to end users
 */
