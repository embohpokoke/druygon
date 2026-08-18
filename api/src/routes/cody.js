'use strict';
/**
 * /api/cody — Cody (DruCode) server-side progress persistence
 *
 * Stores Cody lesson completion per Druygon player slot in the shared
 * players DB, so progress follows the player across browsers/devices.
 * First completion of a lesson awards XP + coins to the shared profile
 * (same thresholds as Study; no pokéball grants). Re-completion is a
 * no-op (idempotent). The Cody frontend keeps its localStorage draft /
 * progress fallback — these routes must never break offline play.
 *
 * GET  /api/cody/progress/:slot           { completed: [lessonId, ...] }
 * POST /api/cody/progress/:slot/complete  { lessonId } → idempotent award
 */

const express  = require('express');
const router   = express.Router();
const path     = require('path');
const Database = require('better-sqlite3');

const PLAYERS_DB = path.join(__dirname, '..', '..', '..', 'druygon_players.db');

// Visual Blocks World 1 lessons 1–6 (fixed mission set, matches modules/drucode).
const MAX_LESSON_ID = 6;
const XP_AWARD   = 20;
const COIN_AWARD = 10;

// XP thresholds per level (mirrors routes/player.js)
const XP_THR = [0, 100, 200, 400, 700, 1100, 1600, 2200, 2900, 3700, 4600];
const xpFor  = (lvl) => XP_THR[Math.min(lvl, XP_THR.length - 1)] || (4600 + (lvl - 10) * 1000);

function getDb() { return new Database(PLAYERS_DB); }

function parseSlot(s) {
  const n = parseInt(s, 10);
  return (isNaN(n) || n < 1 || n > 5) ? null : n;
}

function ensureTable(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS cody_progress(
      slot         INTEGER NOT NULL REFERENCES players(slot),
      lesson_id    INTEGER NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (slot, lesson_id)
    )
  `).run();
}

// ── GET /api/cody/progress/:slot ─────────────────────────────────────────────
router.get('/progress/:slot', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  try {
    const db = getDb();
    ensureTable(db);
    const rows = db.prepare(
      'SELECT lesson_id, completed_at FROM cody_progress WHERE slot=? ORDER BY lesson_id'
    ).all(slot);
    db.close();
    res.json({
      success: true,
      slot,
      completed: rows.map(r => r.lesson_id),
      completedAt: Object.fromEntries(rows.map(r => [r.lesson_id, r.completed_at])),
    });
  } catch (err) {
    console.error('[cody/progress:get]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/cody/progress/:slot/complete ───────────────────────────────────
// Body: { lessonId: number }
// Idempotent: first completion awards XP + coins to the shared profile.
router.post('/progress/:slot/complete', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { lessonId } = req.body;
  if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > MAX_LESSON_ID) {
    return res.status(400).json({ success: false, error: `lessonId must be integer 1–${MAX_LESSON_ID}` });
  }

  try {
    const db = getDb();
    ensureTable(db);

    const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch { /* defaults */ }

    let isNew = false;
    let levelUp = false;

    db.transaction(() => {
      const r = db.prepare(
        'INSERT OR IGNORE INTO cody_progress(slot, lesson_id) VALUES (?,?)'
      ).run(slot, lessonId);
      isNew = r.changes > 0;

      if (isNew) {
        const oldLevel = p.level ?? 1;
        p.coins = (p.coins ?? 0) + COIN_AWARD;
        p.xp    = (p.xp    ?? 0) + XP_AWARD;
        while (p.xp >= xpFor(p.level ?? 1)) { p.level = (p.level ?? 1) + 1; }
        levelUp = p.level > oldLevel;
        p.xpToNext = xpFor(p.level ?? 1);
        db.prepare(
          "UPDATE players SET profile_json=?, updated_at=datetime('now') WHERE slot=?"
        ).run(JSON.stringify(p), slot);
        db.prepare(
          "INSERT INTO profile_history(slot, event, profile_json) VALUES (?,?,?)"
        ).run(slot, `cody-complete-lesson${lessonId}`, JSON.stringify(p));
      }
    })();

    const completed = db.prepare(
      'SELECT lesson_id FROM cody_progress WHERE slot=? ORDER BY lesson_id'
    ).all(slot).map(r => r.lesson_id);
    db.close();

    res.json({
      success: true,
      slot,
      lessonId,
      isNew,
      completed,
      xpNow:    p.xp    ?? 0,
      coinsNow: p.coins ?? 0,
      levelNow: p.level ?? 1,
      levelUp,
    });
  } catch (err) {
    console.error('[cody/progress:complete]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
