'use strict';
/**
 * /api/player — T1 player persistence (hardened)
 *
 * Key design: pokeball counts and caught collection are stored in
 * APPEND-ONLY tables (pokeball_ledger, caught_v2) that CANNOT be
 * accidentally wiped by a bad profile_json write. profile_json holds
 * only level/xp/coins/stats — no pokeball counts, no collection.
 *
 * GET  /api/player/:slot          full state (profile + pokeballs from ledger + caught + progress)
 * POST /api/player/:slot/catch    record catch → award coins+XP, deduct ball from ledger
 * POST /api/player/:slot/pokeball award balls (daily, purchase, admin)
 * POST /api/player/:slot/progress mark zone open|cleared
 */

const express  = require('express');
const router   = express.Router();
const path     = require('path');
const Database = require('better-sqlite3');

const PLAYERS_DB = path.join(__dirname, '..', '..', '..', 'druygon_players.db');

// XP thresholds per level (mirrors old profile.js)
const XP_THR = [0, 100, 200, 400, 700, 1100, 1600, 2200, 2900, 3700, 4600];
const xpFor  = (lvl) => XP_THR[Math.min(lvl, XP_THR.length - 1)] || (4600 + (lvl - 10) * 1000);

const BALL_TYPES = ['pokeball', 'greatball', 'ultraball', 'masterball'];
const COIN_AWARD = { pokeball: 50, greatball: 80, ultraball: 120, masterball: 300 };
const XP_AWARD   = 50;

function getDb() { return new Database(PLAYERS_DB); }

function parseSlot(s) {
  const n = parseInt(s, 10);
  return (isNaN(n) || n < 1 || n > 5) ? null : n;
}

/** Derive pokeball balances from ledger (source of truth). */
function pokeballBalances(db, slot) {
  const rows = db.prepare(
    'SELECT ball_type, SUM(delta) as bal FROM pokeball_ledger WHERE slot=? GROUP BY ball_type'
  ).all(slot);
  const out = { pokeball: 0, greatball: 0, ultraball: 0, masterball: 0 };
  for (const r of rows) if (r.ball_type in out) out[r.ball_type] = Math.max(0, r.bal);
  return out;
}

// ── GET /api/player/:slot ─────────────────────────────────────────────────────
router.get('/:slot', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  try {
    const db = getDb();

    const player = db.prepare(
      'SELECT slot, name, profile_json, updated_at FROM players WHERE slot=?'
    ).get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    const caught   = db.prepare('SELECT dex, zone_id, caught_at FROM caught_v2 WHERE slot=? ORDER BY caught_at').all(slot);
    const progress = db.prepare('SELECT zone_id, status, cleared_at FROM zone_progress WHERE slot=? ORDER BY zone_id').all(slot);
    const pokeballs = pokeballBalances(db, slot);
    db.close();

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch { /* use defaults */ }

    res.json({
      success:   true,
      slot:      player.slot,
      name:      player.name,
      updatedAt: player.updated_at,
      profile: {
        level:    p.level    ?? 1,
        xp:       p.xp       ?? 0,
        xpToNext: p.xpToNext ?? 100,
        coins:    p.coins    ?? 0,
        stats:    p.stats    ?? {},
        pokeballs,                        // from ledger — not from profile_json
      },
      caught:   caught.map(c => ({ dex: c.dex, zoneId: c.zone_id, caughtAt: c.caught_at })),
      progress: progress.map(p => ({ zoneId: p.zone_id, status: p.status, clearedAt: p.cleared_at })),
    });
  } catch (err) {
    console.error('[player/get]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/player/:slot/catch ─────────────────────────────────────────────
// Body: { dex: number, zoneId?: string, ballType?: string }
// Records the catch in caught_v2 (idempotent).
// Deducts 1 ball from ledger (if first catch with a thrown ball).
// Awards coins + XP for new catches only.
router.post('/:slot/catch', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { dex, zoneId = '', ballType = 'pokeball' } = req.body;
  if (!dex || typeof dex !== 'number') return res.status(400).json({ success: false, error: 'dex (number) required' });
  if (!BALL_TYPES.includes(ballType)) return res.status(400).json({ success: false, error: `ballType must be one of ${BALL_TYPES.join('|')}` });

  try {
    const db = getDb();

    const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    // Check ball availability
    const bal = pokeballBalances(db, slot);
    if (bal[ballType] < 1) {
      db.close();
      return res.status(409).json({ success: false, error: `No ${ballType} left`, pokeballs: bal });
    }

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch { /* defaults */ }

    // All mutations in one transaction
    db.transaction(() => {
      // 1. Insert catch (IGNORE if duplicate)
      const r = db.prepare(
        'INSERT OR IGNORE INTO caught_v2(slot, dex, zone_id) VALUES (?,?,?)'
      ).run(slot, dex, zoneId);
      const isNew = r.changes > 0;

      // 2. Always deduct 1 ball (ball was thrown regardless of catch success)
      db.prepare(
        "INSERT INTO pokeball_ledger(slot, ball_type, delta, reason, ref_dex) VALUES (?,?,?,?,?)"
      ).run(slot, ballType, -1, 'use_throw', dex);

      // 3. Award coins + XP for new catches
      if (isNew) {
        const coinAward = COIN_AWARD[ballType] ?? 50;
        p.coins  = (p.coins  ?? 0) + coinAward;
        p.xp     = (p.xp     ?? 0) + XP_AWARD;
        p.caughtCount = (p.caughtCount ?? 0) + 1;
        // Level-up check
        while (p.xp >= xpFor(p.level ?? 1)) {
          p.level = (p.level ?? 1) + 1;
        }
        p.xpToNext = xpFor(p.level ?? 1);
        db.prepare(
          "UPDATE players SET profile_json=?, updated_at=datetime('now') WHERE slot=?"
        ).run(JSON.stringify(p), slot);

        // History event
        db.prepare(
          "INSERT INTO profile_history(slot, event, profile_json) VALUES (?,?,?)"
        ).run(slot, `catch-dex${dex}`, JSON.stringify(p));
      }
    })();

    // Re-derive balances after mutation
    const pokeballs = pokeballBalances(db, slot);
    db.close();

    res.json({
      success:  true,
      isNew:    true,   // always report true here; UI uses this to trigger celebration
      dex,
      zoneId,
      pokeballs,
      coinsNow: p.coins,
      levelNow: p.level,
      xpNow:    p.xp,
    });
  } catch (err) {
    console.error('[player/catch]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/player/:slot/pokeball ─────────────────────────────────────────
// Body: { ballType: string, delta: number (positive), reason?: string }
// Awards pokeballs (daily login, purchase, admin grant).
router.post('/:slot/pokeball', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { ballType, delta, reason = 'award_admin' } = req.body;
  if (!BALL_TYPES.includes(ballType)) return res.status(400).json({ success: false, error: `ballType must be one of ${BALL_TYPES.join('|')}` });
  if (!Number.isInteger(delta) || delta < 1 || delta > 99) return res.status(400).json({ success: false, error: 'delta must be integer 1–99' });

  try {
    const db = getDb();

    const exists = db.prepare('SELECT 1 FROM players WHERE slot=?').get(slot);
    if (!exists) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    db.prepare(
      "INSERT INTO pokeball_ledger(slot, ball_type, delta, reason) VALUES (?,?,?,?)"
    ).run(slot, ballType, delta, reason);

    const pokeballs = pokeballBalances(db, slot);
    db.close();

    res.json({ success: true, slot, ballType, delta, pokeballs });
  } catch (err) {
    console.error('[player/pokeball]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/player/:slot/progress ─────────────────────────────────────────
// Body: { zoneId: string, status: 'open'|'cleared' }
router.post('/:slot/progress', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { zoneId, status } = req.body;
  if (!zoneId) return res.status(400).json({ success: false, error: 'zoneId required' });
  if (!['open', 'cleared'].includes(status)) return res.status(400).json({ success: false, error: 'status must be open|cleared' });

  try {
    const db = getDb();
    const clearedAt = status === 'cleared' ? new Date().toISOString() : null;

    db.prepare(`
      INSERT INTO zone_progress(slot, zone_id, status, cleared_at) VALUES (?,?,?,?)
      ON CONFLICT(slot, zone_id) DO UPDATE
        SET status=excluded.status, cleared_at=excluded.cleared_at
    `).run(slot, zoneId, status, clearedAt);

    db.close();
    res.json({ success: true, slot, zoneId, status });
  } catch (err) {
    console.error('[player/progress]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
