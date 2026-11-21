'use strict';

const express = require('express');
const store = require('../runtime/dru_auth_store');
const { isAuthed, authRole, safeNext } = require('../middleware/dru-auth');

const router = express.Router();

router.get('/status', (req, res) => {
  const lock = store.getLockState(req.ip);
  res.json({
    authenticated: isAuthed(req),
    role: authRole(req),
    pinSet: lock.pinSet,
    locked: lock.locked,
    retryAfterSec: lock.locked ? lock.retryAfterSec : 0,
  });
});

router.post('/login', async (req, res) => {
  try {
    await store.verifyPin(typeof req.body?.pin === 'string' ? req.body.pin : '', req.ip);
  } catch (err) {
    if (err.code === 'PIN_NOT_SET') {
      return res.status(401).json({ error: 'PIN belum diatur', code: 'PIN_NOT_SET' });
    }
    if (err.code === 'LOCKED') {
      res.set('Retry-After', String(err.retryAfterSec || 60));
      return res.status(429).json({
        error: err.message,
        code: 'LOCKED',
        retryAfterSec: err.retryAfterSec || 60,
      });
    }
    if (err.code === 'INVALID_PIN' || err.code === 'PIN_WRONG') {
      return res.status(401).json({ error: 'PIN salah', code: 'PIN_WRONG' });
    }
    console.error('Dru login failed:', err.code || err.message);
    return res.status(500).json({ error: 'Gagal masuk' });
  }

  if (!req.session) {
    return res.status(500).json({ error: 'Sesi tidak tersedia' });
  }
  req.session.regenerate((err) => {
    if (err) {
      console.error('Dru session regenerate failed:', err);
      return res.status(500).json({ error: 'Gagal membuat sesi' });
    }
    req.session.druAuth = true;
    req.session.druAuthAt = new Date().toISOString();
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Dru session save failed:', saveErr);
        return res.status(500).json({ error: 'Gagal menyimpan sesi' });
      }
      const next = safeNext(req.body?.next || req.query?.next);
      return res.json({ success: true, next });
    });
  });
});

router.post('/logout', (req, res) => {
  if (!req.session) return res.json({ success: true });
  req.session.destroy((err) => {
    if (err) {
      console.error('Dru logout failed:', err);
      return res.status(500).json({ error: 'Gagal logout' });
    }
    res.clearCookie('connect.sid', { domain: '.druygon.my.id', path: '/' });
    return res.json({ success: true });
  });
});

module.exports = router;
