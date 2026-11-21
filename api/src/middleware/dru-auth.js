'use strict';

const store = require('../runtime/dru_auth_store');

function isAuthed(req) {
  return !!(req.session && (req.session.druAuth === true || req.session.parentAuth === true));
}

function authRole(req) {
  if (req.session && req.session.parentAuth === true) return 'parent';
  if (req.session && req.session.druAuth === true) return 'dru';
  return null;
}

function safeNext(raw) {
  const value = String(raw || '/').trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('://')) {
    return '/';
  }
  return value.slice(0, 512);
}

function isApiRequest(req) {
  const url = String(req.originalUrl || req.url || '').split('?')[0];
  if (url.startsWith('/api/')) return true;
  if (String(req.baseUrl || '').startsWith('/api')) return true;
  if (String(req.path || '').startsWith('/api/')) return true;
  return false;
}

function wantsHtml(req) {
  if (isApiRequest(req)) return false;
  if (String(req.headers['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest') return false;
  const accept = String(req.headers.accept || '');
  if (accept.includes('application/json') && !accept.includes('text/html')) return false;
  return accept.includes('text/html') || accept.includes('application/xhtml') || accept === '' || req.method === 'GET';
}

function loginUrl(req) {
  const next = safeNext(req.originalUrl || req.url || '/');
  return '/dru-login.html?next=' + encodeURIComponent(next);
}

function reject(req, res, pinSet) {
  if (!pinSet) {
    if (wantsHtml(req) && req.method === 'GET') {
      return res.redirect(302, '/dru-login.html?reason=not-set&next=' + encodeURIComponent(safeNext(req.originalUrl || '/')));
    }
    return res.status(401).json({ error: 'PIN belum diatur', code: 'PIN_NOT_SET' });
  }
  if (wantsHtml(req) && req.method === 'GET') {
    return res.redirect(302, loginUrl(req));
  }
  return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
}

function requireDruAuth(req, res, next) {
  if (isAuthed(req)) return next();
  return reject(req, res, store.pinIsSet());
}

function isProtectedPage(req) {
  const host = String(req.hostname || req.headers.host || '').toLowerCase().split(':')[0];
  const p = req.path || '';
  if (host === 'draco.druygon.my.id') {
    if (p === '/dru-login.html' || p === '/dru-login' || p.startsWith('/api/dru') || p === '/api/health' || p === '/parent' || p.startsWith('/api/parent')) {
      return false;
    }
    // allow login assets
    if (p.startsWith('/assets/') || p.startsWith('/css/') || p === '/favicon.ico') return false;
    return true;
  }
  if (p === '/tutor' || p === '/tutor.html' || p.startsWith('/tutor/')) return true;
  if (p === '/weekly' || p.startsWith('/weekly/')) return true;
  if (p === '/ai-learn' || p.startsWith('/ai-learn/')) return true;
  return false;
}

function pageGate(req, res, next) {
  if (!isProtectedPage(req)) return next();
  if (isAuthed(req)) return next();
  return reject(req, res, store.pinIsSet());
}

module.exports = {
  isAuthed,
  authRole,
  safeNext,
  requireDruAuth,
  pageGate,
  isProtectedPage,
};
