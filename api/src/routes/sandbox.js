'use strict';
/**
 * /api/sandbox — proxy to sandboxd, the code-execution daemon running on
 * the home Linux box (elitebook, Tailscale 100.83.7.10:8570).
 *
 * The VPS never executes learner code itself: snippets are forwarded over
 * the Tailscale mesh to sandboxd, which isolates them (bubblewrap when the
 * kernel allows user namespaces, otherwise rlimits + Python audit hooks).
 *
 * Config (in /root/.wallet/druygon-api.env):
 *   SANDBOX_URL    default http://100.83.7.10:8570
 *   SANDBOX_TOKEN  shared Bearer token (matches ~/sandboxd/token on the box)
 *
 * POST /api/sandbox/run     { language, code, timeout? } -> sandboxd result
 * GET  /api/sandbox/health  -> upstream health (isolation mode, languages)
 */

const express = require('express');
const router  = express.Router();

const SANDBOX_URL   = process.env.SANDBOX_URL || 'http://100.83.7.10:8570';
const SANDBOX_TOKEN = process.env.SANDBOX_TOKEN || '';
const UPSTREAM_TIMEOUT_MS = 15000; // sandboxd caps runs at 10s

const MAX_CODE_BYTES = 32 * 1024;

async function callUpstream(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(SANDBOX_URL + path, {
      ...options,
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${SANDBOX_TOKEN}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return { status: res.status, body: await res.json() };
  } finally {
    clearTimeout(timer);
  }
}

router.get('/health', async (req, res) => {
  try {
    const { status, body } = await callUpstream('/health');
    res.status(status).json(body);
  } catch (err) {
    res.status(503).json({ ok: false, error: 'sandbox unreachable', detail: String(err.cause || err.message || err) });
  }
});

router.post('/run', async (req, res) => {
  if (!SANDBOX_TOKEN) {
    return res.status(503).json({ ok: false, error: 'sandbox not configured' });
  }
  const { language = 'python3', code, timeout } = req.body || {};
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ ok: false, error: 'code required' });
  }
  if (Buffer.byteLength(code) > MAX_CODE_BYTES) {
    return res.status(413).json({ ok: false, error: 'code too large' });
  }
  try {
    const { status, body } = await callUpstream('/run', {
      method: 'POST',
      body: JSON.stringify({ language, code, timeout }),
    });
    res.status(status).json(body);
  } catch (err) {
    res.status(503).json({ ok: false, error: 'sandbox unreachable', detail: String(err.cause || err.message || err) });
  }
});

module.exports = router;
