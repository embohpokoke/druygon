'use strict';

const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const argon2 = require('argon2');

const PLAYERS_DB = path.join(__dirname, '..', '..', '..', 'druygon_players.db');

const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const FAIL_LIMIT = 5;
const LOCK_BASE_MIN = 15;

function db() {
  const d = new Database(PLAYERS_DB);
  d.pragma('journal_mode = WAL');
  d.exec(`
    CREATE TABLE IF NOT EXISTS parent_auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hash TEXT,
      updated_at TEXT NOT NULL,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      lock_level INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS parent_auth_ip (
      ip TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      lock_level INTEGER NOT NULL DEFAULT 0
    );
  `);
  return d;
}

function nowIso() { return new Date().toISOString(); }

function envBootstrapPin() {
  return String(process.env.PARENT_DASHBOARD_PIN || '').trim();
}

function hashIsSet() {
  const d = db();
  try {
    const row = d.prepare('SELECT hash FROM parent_auth WHERE id = 1').get();
    return !!(row && row.hash);
  } finally { d.close(); }
}

function envBootstrapPresent() {
  return !!envBootstrapPin();
}

function authMode() {
  if (hashIsSet()) return 'hash';
  if (envBootstrapPresent()) return 'env';
  return 'none';
}

function lockRemainingMs(lockedUntil) {
  if (!lockedUntil) return 0;
  const t = Date.parse(lockedUntil);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, t - Date.now());
}

function lockMinutes(level) {
  const n = Math.max(0, Number(level) || 0);
  return LOCK_BASE_MIN * Math.pow(2, Math.min(n, 6));
}

function normalizeIp(ip) {
  const raw = String(ip || '').trim();
  if (!raw) return 'unknown';
  if (raw.startsWith('::ffff:')) return raw.slice(7);
  return raw.slice(0, 64);
}

function isValidPin(pin) {
  if (typeof pin !== 'string') return false;
  if (pin.length < 4 || pin.length > 32) return false;
  if (/\s/.test(pin)) return false;
  return [...pin].every((c) => {
    const code = c.charCodeAt(0);
    return code >= 32 && code <= 126;
  });
}

function secureCompare(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function setPin(pin) {
  if (!isValidPin(pin)) {
    const err = new Error('PIN parent harus 4–32 karakter, tanpa spasi');
    err.code = 'INVALID_PIN';
    throw err;
  }
  const hash = await argon2.hash(pin, ARGON2_OPTS);
  const d = db();
  try {
    d.prepare(`
      INSERT INTO parent_auth (id, hash, updated_at, failed_count, locked_until, lock_level)
      VALUES (1, ?, ?, 0, NULL, 0)
      ON CONFLICT(id) DO UPDATE SET
        hash = excluded.hash,
        updated_at = excluded.updated_at,
        failed_count = 0,
        locked_until = NULL,
        lock_level = 0
    `).run(hash, nowIso());
  } finally { d.close(); }
}

function clearHash() {
  const d = db();
  try {
    d.prepare('DELETE FROM parent_auth WHERE id = 1').run();
    d.prepare('DELETE FROM parent_auth_ip').run();
  } finally { d.close(); }
}

function activeLock(row) {
  if (!row) return 0;
  return lockRemainingMs(row.locked_until);
}

function getLockState(ip) {
  const d = db();
  try {
    const acct = d.prepare('SELECT hash, failed_count, locked_until, lock_level FROM parent_auth WHERE id = 1').get();
    const ipRow = d.prepare('SELECT failed_count, locked_until, lock_level FROM parent_auth_ip WHERE ip = ?').get(normalizeIp(ip));
    const ms = Math.max(activeLock(acct), activeLock(ipRow));
    return {
      hashSet: !!(acct && acct.hash),
      mode: (acct && acct.hash) ? 'hash' : (envBootstrapPresent() ? 'env' : 'none'),
      locked: ms > 0,
      retryAfterSec: Math.ceil(ms / 1000),
    };
  } finally { d.close(); }
}

function applyFailure(d, table, keyVal) {
  const row = table === 'parent_auth'
    ? d.prepare('SELECT failed_count, locked_until, lock_level FROM parent_auth WHERE id = 1').get()
    : d.prepare('SELECT failed_count, locked_until, lock_level FROM parent_auth_ip WHERE ip = ?').get(keyVal);
  const nowLock = activeLock(row);
  if (nowLock > 0) return nowLock;
  const failed = (row ? row.failed_count : 0) + 1;
  let level = row ? row.lock_level : 0;
  let until = null;
  if (failed >= FAIL_LIMIT) {
    until = new Date(Date.now() + lockMinutes(level) * 60 * 1000).toISOString();
    level = level + 1;
  }
  const storedFails = failed >= FAIL_LIMIT ? 0 : failed;
  if (table === 'parent_auth') {
    d.prepare(`
      INSERT INTO parent_auth (id, hash, updated_at, failed_count, locked_until, lock_level)
      VALUES (1, NULL, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        failed_count = excluded.failed_count,
        locked_until = excluded.locked_until,
        lock_level = excluded.lock_level
    `).run(nowIso(), storedFails, until, level);
  } else {
    d.prepare(`
      INSERT INTO parent_auth_ip (ip, failed_count, locked_until, lock_level)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(ip) DO UPDATE SET
        failed_count = excluded.failed_count,
        locked_until = excluded.locked_until,
        lock_level = excluded.lock_level
    `).run(keyVal, storedFails, until, level);
  }
  return until ? lockRemainingMs(until) : 0;
}

async function matchesStored(pin) {
  const d = db();
  let hash = null;
  try {
    const row = d.prepare('SELECT hash FROM parent_auth WHERE id = 1').get();
    hash = row && row.hash ? row.hash : null;
  } finally { d.close(); }
  if (hash) return argon2.verify(hash, pin);
  const expected = envBootstrapPin();
  if (!expected) return false;
  return secureCompare(pin, expected);
}

async function verifyPin(pin, ip) {
  const addr = normalizeIp(ip);
  const d = db();
  try {
    const acct = d.prepare('SELECT hash, failed_count, locked_until, lock_level FROM parent_auth WHERE id = 1').get();
    const ipRow = d.prepare('SELECT failed_count, locked_until, lock_level FROM parent_auth_ip WHERE ip = ?').get(addr);
    const ms = Math.max(activeLock(acct), activeLock(ipRow));
    if (ms > 0) {
      const err = new Error('Terlalu banyak percobaan. Coba lagi nanti.');
      err.code = 'LOCKED';
      err.retryAfterSec = Math.ceil(ms / 1000);
      throw err;
    }
    const mode = (acct && acct.hash) ? 'hash' : (envBootstrapPresent() ? 'env' : 'none');
    if (mode === 'none') {
      const err = new Error('PIN parent belum dikonfigurasi');
      err.code = 'PIN_NOT_SET';
      throw err;
    }
    if (typeof pin !== 'string' || !pin) {
      const err = new Error('PIN wajib diisi');
      err.code = 'INVALID_PIN';
      throw err;
    }
    let ok = false;
    if (mode === 'hash') {
      ok = await argon2.verify(acct.hash, pin);
    } else {
      ok = secureCompare(pin, envBootstrapPin());
    }
    if (!ok) {
      applyFailure(d, 'parent_auth', 1);
      const lockMs = applyFailure(d, 'parent_auth_ip', addr);
      const err = new Error('PIN salah');
      err.code = 'PIN_WRONG';
      if (lockMs > 0) {
        err.code = 'LOCKED';
        err.retryAfterSec = Math.ceil(lockMs / 1000);
        err.message = 'Terlalu banyak percobaan. Coba lagi nanti.';
      }
      throw err;
    }
    if (acct) {
      d.prepare('UPDATE parent_auth SET failed_count = 0, locked_until = NULL WHERE id = 1').run();
    }
    d.prepare('DELETE FROM parent_auth_ip WHERE ip = ?').run(addr);
    return true;
  } finally { d.close(); }
}

module.exports = {
  PLAYERS_DB,
  FAIL_LIMIT,
  hashIsSet,
  envBootstrapPresent,
  authMode,
  isValidPin,
  setPin,
  clearHash,
  getLockState,
  matchesStored,
  verifyPin,
  normalizeIp,
};
