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
const BALL_PRICE = { pokeball: 100, greatball: 300, ultraball: 800, masterball: 5000 };

/** Count consecutive days (back from today) with at least 1 catch. */
function computeStreak(db, slot, today) {
  let streak = 0;
  const d = new Date(today + 'T00:00:00Z');
  while (true) {
    const dateStr = d.toISOString().slice(0, 10);
    const row = db.prepare(
      "SELECT COUNT(*) as cnt FROM caught_v2 WHERE slot=? AND date(caught_at)=?"
    ).get(slot, dateStr);
    if (row && row.cnt > 0) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

/** Derive achievements from real player state. */
function computeBadges(caught, progress, profile) {
  const badges = [];
  const caughtCount = (caught || []).length;
  const clearedZones = (progress || []).filter(p => p.status === 'cleared').length;
  const totalCorrect = profile?.stats?.totalCorrect ?? 0;
  const streak = profile?.streak ?? 0;

  if (caughtCount >= 1)  badges.push({ id: 'first_catch',  name: 'First Catch',        description: 'Catch your first Pokémon', icon: 'star' });
  if (caughtCount >= 5)  badges.push({ id: 'collector_5',  name: 'Collector',           description: 'Catch 5 Pokémon',           icon: 'target' });
  if (caughtCount >= 10) badges.push({ id: 'collector_10', name: 'Seasoned Collector',  description: 'Catch 10 Pokémon',          icon: 'target' });
  if (caughtCount >= 20) badges.push({ id: 'collector_20', name: 'Master Collector',    description: 'Catch 20 Pokémon',          icon: 'star' });
  if (clearedZones >= 1) badges.push({ id: 'zone_1',       name: 'Zone Clearer',        description: 'Clear 1 zone',              icon: 'flag' });
  if (clearedZones >= 3) badges.push({ id: 'zone_3',       name: 'Explorer',            description: 'Clear 3 zones',             icon: 'flag' });
  if (streak >= 3)       badges.push({ id: 'streak_3',     name: 'Streak ×3',           description: '3-day streak',              icon: 'flame' });
  if (streak >= 7)       badges.push({ id: 'streak_7',     name: 'Streak ×7',           description: '7-day streak',              icon: 'flame' });
  if (totalCorrect >= 20) badges.push({ id: 'sharp_mind',  name: 'Sharp Mind',          description: '20+ correct answers',       icon: 'zap' });

  return badges;
}

/** Daily mission state: "Catch 3 Pokémon today". */
function computeDailyMission(db, slot) {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM caught_v2 WHERE slot=? AND date(caught_at)=?"
  ).get(slot, today);
  const progress = row ? row.cnt : 0;
  const target = 3;
  const completed = progress >= target;
  const claimed = !!db.prepare(
    'SELECT 1 FROM daily_mission_claims WHERE slot=? AND claim_date=?'
  ).get(slot, today);
  const streak = computeStreak(db, slot, today);
  return { progress, target, completed, claimed, streak };
}

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

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch { /* use defaults */ }

    const dailyMission = computeDailyMission(db, slot);
    const badges       = computeBadges(caught, progress, p);
    const team         = Array.isArray(p.team) ? p.team : [];

    db.close();

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
      team,
      badges,
      dailyMission,
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

// ── POST /api/player/:slot/purchase ──────────────────────────────────────────
// Body: { item: ballType, idempotencyKey: string }
// Atomic: validate price server-side, deduct coins, add 1 ball to ledger. Idempotent.
router.post('/:slot/purchase', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { item, idempotencyKey } = req.body;
  if (!BALL_TYPES.includes(item)) return res.status(400).json({ success: false, error: `item must be one of ${BALL_TYPES.join('|')}` });
  if (!idempotencyKey || typeof idempotencyKey !== 'string') return res.status(400).json({ success: false, error: 'idempotencyKey required' });
  const price = BALL_PRICE[item];

  try {
    const db = getDb();
    db.prepare(
      "CREATE TABLE IF NOT EXISTS purchase_log(idempotency_key TEXT PRIMARY KEY, slot INTEGER, item TEXT, coins_spent INTEGER, created_at TEXT DEFAULT (datetime('now')))"
    ).run();

    const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch { /* defaults */ }

    // Idempotency: already processed → return current state, no double-charge.
    const prior = db.prepare('SELECT 1 FROM purchase_log WHERE idempotency_key=?').get(idempotencyKey);
    if (prior) {
      const pokeballs = pokeballBalances(db, slot);
      db.close();
      return res.json({ success: true, idempotent: true, coinsNow: p.coins ?? 0, pokeballs });
    }

    if ((p.coins ?? 0) < price) {
      const pokeballs = pokeballBalances(db, slot);
      db.close();
      return res.status(409).json({ success: false, error: 'Koin tidak cukup', coinsNow: p.coins ?? 0, pokeballs });
    }

    db.transaction(() => {
      // PRIMARY KEY on idempotency_key makes a concurrent duplicate throw → rolls back (no double-charge).
      db.prepare('INSERT INTO purchase_log(idempotency_key, slot, item, coins_spent) VALUES (?,?,?,?)').run(idempotencyKey, slot, item, price);
      p.coins = (p.coins ?? 0) - price;
      db.prepare("UPDATE players SET profile_json=?, updated_at=datetime('now') WHERE slot=?").run(JSON.stringify(p), slot);
      db.prepare("INSERT INTO pokeball_ledger(slot, ball_type, delta, reason) VALUES (?,?,?,?)").run(slot, item, 1, 'purchase');
    })();

    const pokeballs = pokeballBalances(db, slot);
    db.close();
    res.json({ success: true, item, coinsNow: p.coins, pokeballs });
  } catch (err) {
    console.error('[player/purchase]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/player/:slot/team ──────────────────────────────────────────
// Body: { action: 'add'|'remove'|'replace', dex: number, replaceDex?: number }
// Stores team in profile_json.team[] (max 3). Validates dex is caught.
router.post('/:slot/team', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { action, dex, replaceDex } = req.body;
  if (!['add','remove','replace'].includes(action)) return res.status(400).json({ success: false, error: 'action must be add|remove|replace' });
  if (!dex || typeof dex !== 'number') return res.status(400).json({ success: false, error: 'dex (number) required' });
  if (action === 'replace' && (!replaceDex || typeof replaceDex !== 'number')) return res.status(400).json({ success: false, error: 'replaceDex required for replace action' });

  try {
    const db = getDb();

    const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    // Validate dex is caught (skip for remove — allow cleaning up stale refs)
    if (action !== 'remove') {
      const isCaught = db.prepare('SELECT 1 FROM caught_v2 WHERE slot=? AND dex=?').get(slot, dex);
      if (!isCaught) { db.close(); return res.status(400).json({ success: false, error: 'Pokémon not caught yet' }); }
    }

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch { p = {}; }
    const team = Array.isArray(p.team) ? [...p.team] : [];

    let changed = false;
    if (action === 'add') {
      if (team.length >= 3) { db.close(); return res.status(409).json({ success: false, error: 'Team is full (max 3)' }); }
      if (!team.includes(dex)) { team.push(dex); changed = true; }
    } else if (action === 'remove') {
      const idx = team.indexOf(dex);
      if (idx !== -1) { team.splice(idx, 1); changed = true; }
    } else if (action === 'replace') {
      if (!team.includes(replaceDex)) { db.close(); return res.status(400).json({ success: false, error: 'replaceDex not in team' }); }
      const idx = team.indexOf(replaceDex);
      team[idx] = dex;
      changed = true;
    }

    if (changed) {
      p.team = team;
      db.prepare("UPDATE players SET profile_json=?, updated_at=datetime('now') WHERE slot=?").run(JSON.stringify(p), slot);
    }

    db.close();
    res.json({ success: true, slot, team, updated: changed });
  } catch (err) {
    console.error('[player/team]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/player/:slot/mission/claim ───────────────────────────────
// Body: { idempotencyKey: string }
// Idempotently claims the daily mission reward (50 coins + 25 XP)
// when the player has caught 3+ Pokémon today.
router.post('/:slot/mission/claim', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { idempotencyKey } = req.body;
  if (!idempotencyKey || typeof idempotencyKey !== 'string') return res.status(400).json({ success: false, error: 'idempotencyKey required' });

  const today = new Date().toISOString().slice(0, 10);

  try {
    const db = getDb();

    // Ensure claims table exists
    db.prepare(
      "CREATE TABLE IF NOT EXISTS daily_mission_claims(idempotency_key TEXT PRIMARY KEY, slot INTEGER NOT NULL, claim_date TEXT NOT NULL, coins_awarded INTEGER NOT NULL, xp_awarded INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')))"
    ).run();

    // Idempotency: already processed → return current state
    const prior = db.prepare('SELECT 1 FROM daily_mission_claims WHERE idempotency_key=?').get(idempotencyKey);
    if (prior) {
      const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
      let p = {}; try { p = JSON.parse(player.profile_json); } catch {}
      const pokeballs = pokeballBalances(db, slot);
      db.close();
      return res.json({ success: true, idempotent: true, coinsNow: p.coins ?? 0, xpNow: p.xp ?? 0, levelNow: p.level ?? 1, pokeballs });
    }

    // Check today's mission progress (3 catches today)
    const todayCatches = db.prepare(
      "SELECT COUNT(*) as cnt FROM caught_v2 WHERE slot=? AND date(caught_at)=?"
    ).get(slot, today);
    if (!todayCatches || todayCatches.cnt < 3) {
      db.close();
      return res.status(409).json({ success: false, error: 'Daily mission not completed', progress: todayCatches?.cnt ?? 0, target: 3 });
    }

    // Already claimed today with a different key
    const alreadyClaimed = db.prepare('SELECT 1 FROM daily_mission_claims WHERE slot=? AND claim_date=?').get(slot, today);
    if (alreadyClaimed) {
      const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
      let p = {}; try { p = JSON.parse(player.profile_json); } catch {}
      const pokeballs = pokeballBalances(db, slot);
      db.close();
      return res.json({ success: true, idempotent: true, coinsNow: p.coins ?? 0, xpNow: p.xp ?? 0, levelNow: p.level ?? 1, pokeballs });
    }

    const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch {}

    const coinsAward = 50;
    const xpAward    = 25;

    db.transaction(() => {
      db.prepare('INSERT INTO daily_mission_claims(idempotency_key, slot, claim_date, coins_awarded, xp_awarded) VALUES (?,?,?,?,?)').run(idempotencyKey, slot, today, coinsAward, xpAward);
      p.coins  = (p.coins  ?? 0) + coinsAward;
      p.xp     = (p.xp     ?? 0) + xpAward;
      while (p.xp >= xpFor(p.level ?? 1)) { p.level = (p.level ?? 1) + 1; }
      p.xpToNext = xpFor(p.level ?? 1);
      db.prepare("UPDATE players SET profile_json=?, updated_at=datetime('now') WHERE slot=?").run(JSON.stringify(p), slot);
    })();

    const pokeballs = pokeballBalances(db, slot);
    const streak    = computeStreak(db, slot, today);
    db.close();

    res.json({ success: true, coinsNow: p.coins, xpNow: p.xp, levelNow: p.level, pokeballs, streak });
  } catch (err) {
    console.error('[player/mission/claim]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
