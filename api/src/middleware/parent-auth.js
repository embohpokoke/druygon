'use strict';

const store = require('../runtime/parent_auth_store');

function requireParentAuth(req, res, next) {
  if (req.session && req.session.parentAuth === true) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

function parentAuthStatus(req, res) {
  const lock = store.getLockState(req.ip);
  res.json({
    authenticated: !!(req.session && req.session.parentAuth === true),
    hashSet: lock.hashSet,
    mode: lock.mode,
    locked: lock.locked,
    retryAfterSec: lock.locked ? lock.retryAfterSec : 0,
  });
}

async function loginParent(req, res) {
  const provided = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
  try {
    await store.verifyPin(provided, req.ip);
  } catch (err) {
    if (err.code === 'PIN_NOT_SET') {
      console.error('PARENT_DASHBOARD_PIN is not configured and no parent_auth hash is set');
      return res.status(500).json({ error: 'PIN parent belum dikonfigurasi', code: 'PIN_NOT_SET' });
    }
    if (err.code === 'LOCKED') {
      res.set('Retry-After', String(err.retryAfterSec || 60));
      return res.status(429).json({
        error: err.message,
        code: 'LOCKED',
        retryAfterSec: err.retryAfterSec || 60,
      });
    }
    if (err.code === 'INVALID_PIN') {
      return res.status(400).json({ error: 'PIN wajib diisi', code: 'INVALID_PIN' });
    }
    if (err.code === 'PIN_WRONG') {
      return res.status(401).json({ error: 'PIN salah', code: 'PIN_WRONG' });
    }
    console.error('Parent login failed:', err.code || 'error');
    return res.status(500).json({ error: 'Gagal masuk' });
  }

  if (!req.session) {
    return res.status(500).json({ error: 'Sesi tidak tersedia' });
  }
  req.session.regenerate((err) => {
    if (err) {
      console.error('Parent auth session regenerate failed:', err);
      return res.status(500).json({ error: 'Gagal membuat sesi' });
    }
    req.session.parentAuth = true;
    req.session.parentAuthAt = new Date().toISOString();
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Parent auth session save failed:', saveErr);
        return res.status(500).json({ error: 'Gagal menyimpan sesi' });
      }
      return res.json({ success: true });
    });
  });
}

function logoutParent(req, res) {
  if (!req.session) return res.json({ success: true });
  req.session.destroy((err) => {
    if (err) {
      console.error('Parent logout failed:', err);
      return res.status(500).json({ error: 'Gagal logout' });
    }
    res.clearCookie('connect.sid', { domain: '.druygon.my.id', path: '/' });
    return res.json({ success: true });
  });
}

module.exports = {
  requireParentAuth,
  parentAuthStatus,
  loginParent,
  logoutParent
};
