/**
 * EXAMPLE: OpenAI ChatGPT OAuth Flow (OpenClaw Pattern)
 * WARNING: This requires user interaction (browser login)
 * NOT recommended for Druygon (single-user, child audience)
 */

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');

const router = express.Router();

// OAuth Configuration
const OAUTH_CONFIG = {
  client_id: process.env.OPENAI_CLIENT_ID, // From OpenAI Platform
  client_secret: process.env.OPENAI_CLIENT_SECRET,
  redirect_uri: 'https://druygon.my.id/api/oauth/callback',
  auth_url: 'https://auth.openai.com/authorize',
  token_url: 'https://api.openai.com/v1/oauth/token'
};

// Step 1: Initiate OAuth
router.get('/oauth/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const authUrl = new URL(OAUTH_CONFIG.auth_url);
  authUrl.searchParams.set('client_id', OAUTH_CONFIG.client_id);
  authUrl.searchParams.set('redirect_uri', OAUTH_CONFIG.redirect_uri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openai.api');
  authUrl.searchParams.set('state', state);

  res.redirect(authUrl.toString());
});

// Step 2: OAuth Callback
router.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;

  // Verify state (CSRF protection)
  if (state !== req.session.oauthState) {
    return res.status(400).json({ error: 'Invalid state' });
  }

  try {
    // Exchange code for tokens
    const response = await fetch(OAUTH_CONFIG.token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: OAUTH_CONFIG.redirect_uri,
        client_id: OAUTH_CONFIG.client_id,
        client_secret: OAUTH_CONFIG.client_secret
      })
    });

    const tokens = await response.json();
    // tokens = { access_token, refresh_token, expires_in, token_type }

    // Store tokens securely (encrypted storage recommended)
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    req.session.tokenExpiry = Date.now() + (tokens.expires_in * 1000);

    res.redirect('/ai-learn/?oauth=success');
  } catch (error) {
    res.status(500).json({ error: 'OAuth failed', message: error.message });
  }
});

// Step 3: Token Refresh (auto-called before expiry)
async function refreshAccessToken(refreshToken) {
  const response = await fetch(OAUTH_CONFIG.token_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OAUTH_CONFIG.client_id,
      client_secret: OAUTH_CONFIG.client_secret
    })
  });

  return await response.json();
}

// Middleware: Ensure valid token
async function ensureAuth(req, res, next) {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated', redirect: '/api/oauth/login' });
  }

  // Auto-refresh if expiring soon (< 5 min)
  if (req.session.tokenExpiry - Date.now() < 5 * 60 * 1000) {
    try {
      const newTokens = await refreshAccessToken(req.session.refreshToken);
      req.session.accessToken = newTokens.access_token;
      req.session.tokenExpiry = Date.now() + (newTokens.expires_in * 1000);
    } catch (error) {
      return res.status(401).json({ error: 'Token refresh failed' });
    }
  }

  next();
}

// Example protected endpoint
router.post('/ai/generate', ensureAuth, async (req, res) => {
  // Use req.session.accessToken for OpenAI API calls
  const openai = new OpenAI({ apiKey: req.session.accessToken });
  // ... rest of logic
});

module.exports = router;
