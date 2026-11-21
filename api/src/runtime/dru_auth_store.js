'use strict';

const path = require('path');
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
    CREATE TABLE IF NOT EXISTS dru_auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hash TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      lock_level INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS dru_auth_ip (
      ip TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      lock_level INTEGER NOT NULL DEFAULT 0
    );
  `);
  return d;
}

function nowIso() { return new Date().toISOString(); }

function pinIsSet() {
  const d = db();
  try {
    const row = d.prepare('SELECT hash FROM dru_auth WHERE id = 1').get();
    return !!(row && row.hash);
  } finally { d.close(); }
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
  return typeof pin === 'string' && /^\d{4,10}$/.test(pin);
}

async function setPin(pin) {
  if (!isValidPin(pin)) {
    const err = new Error('PIN harus 4–10 digit angka');
    err.code = 'INVALID_PIN';
    throw err;
  }
  const hash = await argon2.hash(pin, ARGON2_OPTS);
  const d = db();
  try {
    d.prepare(`
      INSERT INTO dru_auth (id, hash, updated_at, failed_count, locked_until, lock_level)
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

function clearPin() {
  const d = db();
  try {
    d.prepare('DELETE FROM dru_auth WHERE id = 1').run();
    d.prepare('DELETE FROM dru_auth_ip').run();
  } finally { d.close(); }
}

function activeLock(row) {
  if (!row) return 0;
  return lockRemainingMs(row.locked_until);
}

function getLockState(ip) {
  const d = db();
  try {
    const acct = d.prepare('SELECT hash, failed_count, locked_until, lock_level FROM dru_auth WHERE id = 1').get();
    const ipRow = d.prepare('SELECT failed_count, locked_until, lock_level FROM dru_auth_ip WHERE ip = ?').get(normalizeIp(ip));
    const acctMs = activeLock(acct);
    const ipMs = activeLock(ipRow);
    const ms = Math.max(acctMs, ipMs);
    return {
      pinSet: !!(acct && acct.hash),
      locked: ms > 0,
      retryAfterSec: Math.ceil(ms / 1000),
    };
  } finally { d.close(); }
}

function applyFailure(d, table, keyCol, keyVal) {
  const row = d.prepare(`SELECT failed_count, locked_until, lock_level FROM ${table} WHERE ${keyCol} = ?`).get(keyVal);
  const nowLock = activeLock(row);
  if (nowLock > 0) return nowLock;
  const failed = (row ? row.failed_count : 0) + 1;
  let level = row ? row.lock_level : 0;
  let until = null;
  if (failed >= FAIL_LIMIT) {
    until = new Date(Date.now() + lockMinutes(level) * 60 * 1000).toISOString();
    level = level + 1;
  }
  if (table === 'dru_auth') {
    d.prepare('UPDATE dru_auth SET failed_count = ?, locked_until = ?, lock_level = ? WHERE id = 1')
      .run(failed >= FAIL_LIMIT ? 0 : failed, until, level);
  } else {
    d.prepare(`
      INSERT INTO dru_auth_ip (ip, failed_count, locked_until, lock_level)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(ip) DO UPDATE SET
        failed_count = excluded.failed_count,
        locked_until = excluded.locked_until,
        lock_level = excluded.lock_level
    `).run(keyVal, failed >= FAIL_LIMIT ? 0 : failed, until, level);
  }
  return until ? lockRemainingMs(until) : 0;
}

async function verifyPin(pin, ip) {
  const addr = normalizeIp(ip);
  const d = db();
  try {
    const acct = d.prepare('SELECT hash, failed_count, locked_until, lock_level FROM dru_auth WHERE id = 1').get();
    if (!acct || !acct.hash) {
      const err = new Error('PIN belum diatur');
      err.code = 'PIN_NOT_SET';
      throw err;
    }
    const ipRow = d.prepare('SELECT failed_count, locked_until, lock_level FROM dru_auth_ip WHERE ip = ?').get(addr);
    const ms = Math.max(activeLock(acct), activeLock(ipRow));
    if (ms > 0) {
      const err = new Error('Terlalu banyak percobaan. Coba lagi nanti.');
      err.code = 'LOCKED';
      err.retryAfterSec = Math.ceil(ms / 1000);
      throw err;
    }
    if (typeof pin !== 'string' || !pin) {
      const err = new Error('PIN wajib diisi');
      err.code = 'INVALID_PIN';
      throw err;
    }
    const ok = await argon2.verify(acct.hash, pin);
    if (!ok) {
      applyFailure(d, 'dru_auth', 'id', 1);
      const lockMs = applyFailure(d, 'dru_auth_ip', 'ip', addr);
      const err = new Error('PIN salah');
      err.code = 'PIN_WRONG';
      if (lockMs > 0) {
        err.code = 'LOCKED';
        err.retryAfterSec = Math.ceil(lockMs / 1000);
        err.message = 'Terlalu banyak percobaan. Coba lagi nanti.';
      }
      throw err;
    }
    d.prepare('UPDATE dru_auth SET failed_count = 0, locked_until = NULL WHERE id = 1').run();
    d.prepare('DELETE FROM dru_auth_ip WHERE ip = ?').run(addr);
    return true;
  } finally { d.close(); }
}

module.exports = {
  PLAYERS_DB,
  FAIL_LIMIT,
  pinIsSet,
  isValidPin,
  setPin,
  clearPin,
  getLockState,
  verifyPin,
  normalizeIp,
};
