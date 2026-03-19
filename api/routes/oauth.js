/**
 * OAuth Routes (Optional Authentication)
 * Users can login with Google/OpenAI to use their own API quotas
 */

const express = require('express');
const router = express.Router();

// OAuth enabled via env var
const OAUTH_ENABLED = process.env.OAUTH_ENABLED === 'true';

/**
 * GET /api/oauth/status
 * Check OAuth availability and user session
 */
router.get('/status', (req, res) => {
  if (!OAUTH_ENABLED) {
    return res.json({
      enabled: false,
      message: 'OAuth not enabled. Using server API keys.'
    });
  }

  const authManager = require('../auth-manager');
  const status = authManager.getAuthStatus(req);

  res.json({
    enabled: true,
    providers: status,
    message: 'OAuth available. Login optional - API key fallback active.'
  });
});

/**
 * Google OAuth Flow
 */

// Initiate Google OAuth
router.get('/google/login', (req, res) => {
  if (!OAUTH_ENABLED) {
    return res.status(403).json({ error: 'OAuth not enabled' });
  }

  // TODO: Implement Google OAuth initiation
  // For now, return not implemented
  res.status(501).json({
    error: 'Not implemented yet',
    message: 'Google OAuth coming soon. Use API key for now.'
  });
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  if (!OAUTH_ENABLED) {
    return res.status(403).json({ error: 'OAuth not enabled' });
  }

  // TODO: Implement Google OAuth callback
  res.status(501).json({
    error: 'Not implemented yet',
    message: 'Google OAuth coming soon.'
  });
});

/**
 * OpenAI OAuth Flow
 */

// Initiate OpenAI OAuth
router.get('/openai/login', (req, res) => {
  if (!OAUTH_ENABLED) {
    return res.status(403).json({ error: 'OAuth not enabled' });
  }

  // TODO: Implement OpenAI OAuth initiation
  res.status(501).json({
    error: 'Not implemented yet',
    message: 'OpenAI OAuth coming soon. Use API key for now.'
  });
});

// OpenAI OAuth callback
router.get('/openai/callback', async (req, res) => {
  if (!OAUTH_ENABLED) {
    return res.status(403).json({ error: 'OAuth not enabled' });
  }

  // TODO: Implement OpenAI OAuth callback
  res.status(501).json({
    error: 'Not implemented yet',
    message: 'OpenAI OAuth coming soon.'
  });
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    // Clear OAuth tokens
    delete req.session.googleTokens;
    delete req.session.openaiTokens;

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } else {
    res.json({ success: true, message: 'No active session' });
  }
});

module.exports = router;
