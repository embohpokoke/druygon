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
// Content DB readonly — sumber rarity legendary + zona legendary (SPEC v2 §3.2/§4.2)
const CONTENT_DB = path.join(__dirname, '..', '..', 'druygon_content.db');

// XP thresholds per level (mirrors old profile.js)
const XP_THR = [0, 100, 200, 400, 700, 1100, 1600, 2200, 2900, 3700, 4600];
const xpFor  = (lvl) => XP_THR[Math.min(lvl, XP_THR.length - 1)] || (4600 + (lvl - 10) * 1000);

const BALL_TYPES = ['pokeball', 'greatball', 'ultraball', 'masterball'];
const COIN_AWARD = { pokeball: 50, greatball: 80, ultraball: 120, masterball: 300 };
const XP_AWARD   = 50;
const SHINY_XP_AWARD = 20;   // shiny baru untuk base yang sudah tertangkap
const BALL_PRICE = { pokeball: 100, greatball: 200, ultraball: 500, masterball: 2000 };

// Trainer Rank (SPEC v2 §3.3) — selalu derived, tidak disimpan di profile_json.
const RANKS = [
  { id: 'rookie',    name: 'Rookie',        title: 'Rookie Trainer', tier: 1, points: 0,    charm: false, perks: [] },
  { id: 'youngster', name: 'Youngster',     title: 'Youngster',      tier: 2, points: 120,  charm: false, perks: ['+2 Great Ball'] },
  { id: 'ace',       name: 'Ace Trainer',   title: 'Ace Trainer',    tier: 3, points: 300,  charm: true,  perks: ['+1 Great Ball', 'Shiny Charm'] },
  { id: 'gym',       name: 'Gym Leader',    title: 'Gym Leader',     tier: 4, points: 600,  charm: true,  perks: ['+5 Ultra Ball'] },
  { id: 'elite',     name: 'Elite Four',    title: 'Elite Four',     tier: 5, points: 1000, charm: true,  perks: ['+1 Master Ball'] },
  { id: 'champion',  name: 'Champion',      title: 'Champion',       tier: 6, points: 1500, charm: true,  perks: ['+3 Ultra Ball', '+2 Great Ball'] },
  { id: 'dragon',    name: 'Dragon Master', title: 'Dragon Master',  tier: 7, points: 2200, charm: true,  perks: ['+1 Master Ball'] },
];

// Hadiah sekali klaim per rank (ditulis ke pokeball_ledger, reason 'rank_up').
const RANK_REWARDS = {
  rookie:    {},
  youngster: { greatball: 2 },
  ace:       { greatball: 1 },
  gym:       { ultraball: 5 },
  elite:     { masterball: 1 },
  champion:  { ultraball: 3, greatball: 2 },
  dragon:    { masterball: 1 },
};

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

/** Tabel v2 (SPEC §4.1) — idempoten, dipanggil di GET/catch/rank-claim. */
function ensureGameTables(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS caught_shiny (
      slot INTEGER NOT NULL,
      dex INTEGER NOT NULL,
      zone_id TEXT NOT NULL DEFAULT '',
      caught_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (slot, dex)
    )
  `).run();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS rank_awards (
      slot INTEGER NOT NULL,
      rank_id TEXT NOT NULL,
      claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (slot, rank_id)
    )
  `).run();
}

/** Baca content DB readonly: dex legendary + zona legendary (beserta dex-nya).
 *  Gagal / kolom belum di-seed → null / daftar kosong; rank tetap jalan. */
function loadLegendaryContent() {
  let cdb = null;
  try {
    cdb = new Database(CONTENT_DB, { readonly: true });

    const legendaryDex = new Set();
    try {
      const rows = cdb.prepare("SELECT DISTINCT dex FROM zone_pokemon WHERE rarity='legendary'").all();
      for (const r of rows) legendaryDex.add(r.dex);
    } catch { /* zone_pokemon tidak terbaca → fallback 0 */ }

    const legendaryZones = [];
    try {
      // kolom zone.legendary ditambah oleh seed; kalau belum ada, throw → diabaikan
      const zones = cdb.prepare('SELECT id FROM zone WHERE legendary=1').all();
      for (const z of zones) {
        let dexes = [];
        try {
          dexes = cdb.prepare('SELECT dex FROM zone_pokemon WHERE zone_id=?').all(z.id).map(r => r.dex);
        } catch { dexes = []; }
        legendaryZones.push({ id: z.id, dexes });
      }
    } catch { /* kolom legendary belum ada → zona legendary diabaikan */ }

    return { legendaryDex, legendaryZones };
  } catch (err) {
    console.warn('[player/content-db] legendary data unavailable:', err.message);
    return null;
  } finally {
    if (cdb) { try { cdb.close(); } catch { /* ignore */ } }
  }
}

/**
 * Hitung Trainer Rank dari state nyata (SPEC v2 §3.3).
 * points = level*10 + caught*3 + shiny*25 + legendary*40 + zonesCleared*15 + badges*2
 * opts: { profile, caught, progress, contentInfo } — opsional, supaya GET/claim
 * tidak query ulang. Return shape mengikuti §4.3.
 */
function computeRank(db, slot, opts = {}) {
  let p = opts.profile;
  if (!p) {
    const row = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
    if (row) { try { p = JSON.parse(row.profile_json); } catch { p = {}; } }
  }
  p = p || {};

  const caught   = opts.caught   || db.prepare('SELECT dex, zone_id FROM caught_v2 WHERE slot=?').all(slot);
  const progress = opts.progress || db.prepare('SELECT zone_id, status FROM zone_progress WHERE slot=?').all(slot);
  const contentInfo = opts.contentInfo !== undefined ? opts.contentInfo : loadLegendaryContent();

  // Shiny count — tabel dijamin ada oleh ensureGameTables()
  let shinyCount = 0;
  try {
    shinyCount = db.prepare('SELECT COUNT(*) AS cnt FROM caught_shiny WHERE slot=?').get(slot).cnt;
  } catch { shinyCount = 0; }

  // Legendary count + zona legendary yang dex-nya tertangkap
  const caughtDex = new Set(caught.map(c => c.dex));
  const clearedZones = new Set();
  let legendaryCount = 0;
  if (contentInfo) {
    for (const dex of caughtDex) if (contentInfo.legendaryDex.has(dex)) legendaryCount++;
    for (const z of contentInfo.legendaryZones) {
      if ((z.dexes || []).some(d => caughtDex.has(d))) clearedZones.add(z.id);
    }
  }

  // Zona non-legendary: >=2 dex berbeda di zone_id yang sama
  const dexByZone = new Map();
  for (const c of caught) {
    if (!c.zone_id) continue;
    if (!dexByZone.has(c.zone_id)) dexByZone.set(c.zone_id, new Set());
    dexByZone.get(c.zone_id).add(c.dex);
  }
  for (const [zoneId, dexes] of dexByZone) {
    if (dexes.size >= 2) clearedZones.add(zoneId);
  }

  const badges = computeBadges(caught, progress, p);
  const level  = p.level ?? 1;
  const points = level * 10
    + caught.length * 3
    + shinyCount * 25
    + legendaryCount * 40
    + clearedZones.size * 15
    + badges.length * 2;

  let rank = RANKS[0];
  for (const r of RANKS) if (points >= r.points) rank = r;

  const next = RANKS.find(r => r.points > points) || null;
  let progressPct = 100;
  if (next) {
    const span = next.points - rank.points;
    progressPct = span > 0
      ? Math.max(0, Math.min(100, Math.round(((points - rank.points) / span) * 100)))
      : 100;
  }

  let awards = [];
  try {
    const rows = db.prepare('SELECT rank_id FROM rank_awards WHERE slot=?').all(slot);
    const claimed = new Set(rows.map(r => r.rank_id));
    awards = RANKS.filter(r => claimed.has(r.id)).map(r => r.id);
  } catch { awards = []; }

  return {
    id:      rank.id,
    name:    rank.name,
    title:   rank.title,
    tier:    rank.tier,
    points,
    next:    next ? { id: next.id, name: next.name, points: next.points } : null,
    progressPct,
    charm:   !!(rank.charm && awards.includes('ace')),
    perks:   rank.perks.slice(),
    awards,
  };
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

/** Grant pokéball rewards for level-up. Writes to pokeball_ledger.
 *  Returns { pokeball, greatball, ultraball } counts awarded. */
function grantLevelUpBalls(db, slot, oldLevel, newLevel) {
  const rewards = { pokeball: 0, greatball: 0, ultraball: 0 };
  for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
    if (lv >= 2 && lv <= 4) {
      db.prepare("INSERT INTO pokeball_ledger(slot, ball_type, delta, reason) VALUES (?,?,?,?)").run(slot, 'pokeball', 1, 'level_up');
      rewards.pokeball += 1;
    } else if (lv === 5 || lv === 7 || lv === 9) {
      db.prepare("INSERT INTO pokeball_ledger(slot, ball_type, delta, reason) VALUES (?,?,?,?)").run(slot, 'greatball', 1, 'level_up');
      rewards.greatball += 1;
    } else if (lv === 6 || lv === 8 || lv === 10) {
      db.prepare("INSERT INTO pokeball_ledger(slot, ball_type, delta, reason) VALUES (?,?,?,?)").run(slot, 'pokeball', 2, 'level_up');
      rewards.pokeball += 2;
    } else if (lv >= 11 && (lv - 11) % 5 === 0) {
      db.prepare("INSERT INTO pokeball_ledger(slot, ball_type, delta, reason) VALUES (?,?,?,?)").run(slot, 'ultraball', 1, 'level_up');
      rewards.ultraball += 1;
    }
  }
  return rewards;
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

  let db = null;
  try {
    db = getDb();
    ensureGameTables(db);

    const player = db.prepare(
      'SELECT slot, name, profile_json, updated_at FROM players WHERE slot=?'
    ).get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    const caught   = db.prepare('SELECT dex, zone_id, caught_at FROM caught_v2 WHERE slot=? ORDER BY caught_at').all(slot);
    const progress = db.prepare('SELECT zone_id, status, cleared_at FROM zone_progress WHERE slot=? ORDER BY zone_id').all(slot);
    const pokeballs = pokeballBalances(db, slot);
    const shinyRows = db.prepare(
      'SELECT dex, zone_id, caught_at FROM caught_shiny WHERE slot=? ORDER BY caught_at, dex'
    ).all(slot);

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch { /* use defaults */ }

    const dailyMission = computeDailyMission(db, slot);
    const badges       = computeBadges(caught, progress, p);
    const team         = Array.isArray(p.team) ? p.team : [];

    // Legendary + rank derived on the fly (SPEC v2 §3.2–3.3)
    const contentInfo = loadLegendaryContent();
    const caughtDex   = new Set(caught.map(c => c.dex));
    let legendaryCount = 0;
    if (contentInfo) {
      for (const dex of caughtDex) if (contentInfo.legendaryDex.has(dex)) legendaryCount++;
    }
    const rank       = computeRank(db, slot, { profile: p, caught, progress, contentInfo });
    const rankAwards = rank.awards;

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
      shiny: shinyRows.map(s => ({ dex: s.dex, zoneId: s.zone_id, caughtAt: s.caught_at })),
      shinyCount: shinyRows.length,
      legendaryCount,
      rank,
      rankAwards,
    });
  } catch (err) {
    try { if (db) db.close(); } catch { /* ignore */ }
    console.error('[player/get]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/player/:slot/catch ─────────────────────────────────────────────
// Body: { dex: number, zoneId?: string, ballType?: string, shiny?: boolean }
// Records the catch in caught_v2 (idempotent) + caught_shiny kalau shiny.
// Deducts 1 ball from ledger (if first catch with a thrown ball).
// Awards coins + XP for new catches; shiny baru untuk base lama dapat koin + 20 XP.
router.post('/:slot/catch', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { dex, zoneId = '', ballType = 'pokeball', shiny } = req.body;
  if (!dex || typeof dex !== 'number') return res.status(400).json({ success: false, error: 'dex (number) required' });
  if (!BALL_TYPES.includes(ballType)) return res.status(400).json({ success: false, error: `ballType must be one of ${BALL_TYPES.join('|')}` });
  if (shiny !== undefined && typeof shiny !== 'boolean') return res.status(400).json({ success: false, error: 'shiny must be boolean' });

  const isShiny = shiny === true;

  let db = null;
  try {
    db = getDb();
    ensureGameTables(db);

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

    // Rank sebelum mutasi (untuk deteksi rank-up) + info legendary dari content DB.
    const contentInfo = loadLegendaryContent();
    const isLegendary = !!(contentInfo && contentInfo.legendaryDex.has(dex));
    const rankBefore  = computeRank(db, slot, { contentInfo });

    let isNewBase  = false;
    let shinyNew   = false;
    let levelUp    = false;
    let rewardBalls = {};

    // All mutations in one transaction
    db.transaction(() => {
      // 1. Insert catch (IGNORE if duplicate)
      const r = db.prepare(
        'INSERT OR IGNORE INTO caught_v2(slot, dex, zone_id) VALUES (?,?,?)'
      ).run(slot, dex, zoneId);
      isNewBase = r.changes > 0;

      // 1b. Shiny baru (satu baris per slot+dex)
      if (isShiny) {
        const sr = db.prepare(
          'INSERT OR IGNORE INTO caught_shiny(slot, dex, zone_id) VALUES (?,?,?)'
        ).run(slot, dex, zoneId);
        shinyNew = sr.changes > 0;
      }

      // 2. Always deduct 1 ball (ball was thrown regardless of catch success)
      db.prepare(
        "INSERT INTO pokeball_ledger(slot, ball_type, delta, reason, ref_dex) VALUES (?,?,?,?,?)"
      ).run(slot, ballType, -1, 'use_throw', dex);

      // 3. Award: base baru (koin + 50 XP) atau shiny baru untuk base lama (koin + 20 XP).
      //    Duplikat non-shiny tidak dapat award, seperti sebelumnya.
      if (isNewBase || (isShiny && shinyNew)) {
        const coinAward = COIN_AWARD[ballType] ?? 50;
        p.coins  = (p.coins ?? 0) + coinAward;
        p.xp     = (p.xp ?? 0) + (isNewBase ? XP_AWARD : SHINY_XP_AWARD);
        if (isNewBase) p.caughtCount = (p.caughtCount ?? 0) + 1;

        // Level-up check + reward (GAME-RULES §3)
        const oldLevel = p.level ?? 1;
        while (p.xp >= xpFor(p.level ?? 1)) {
          p.level = (p.level ?? 1) + 1;
        }
        if (p.level > oldLevel) {
          levelUp = true;
          rewardBalls = grantLevelUpBalls(db, slot, oldLevel, p.level);
        }
        p.xpToNext = xpFor(p.level ?? 1);
        db.prepare(
          "UPDATE players SET profile_json=?, updated_at=datetime('now') WHERE slot=?"
        ).run(JSON.stringify(p), slot);

        // History event
        db.prepare(
          "INSERT INTO profile_history(slot, event, profile_json) VALUES (?,?,?)"
        ).run(slot, isNewBase ? `catch-dex${dex}` : `shiny-dex${dex}`, JSON.stringify(p));
      }
    })();

    // Rank sesudah mutasi → rankUp kalau tier naik
    const rank   = computeRank(db, slot, { contentInfo });
    const rankUp = rank.tier > rankBefore.tier;

    // Re-derive balances after mutation
    const pokeballs = pokeballBalances(db, slot);
    db.close();

    res.json({
      success:  true,
      isNew:    true,   // always report true here; UI uses this to trigger celebration
      dex,
      zoneId,
      shiny:    isShiny,
      shinyNew,
      legendary: isLegendary,
      pokeballs,
      coinsNow: p.coins,
      levelNow: p.level,
      xpNow:    p.xp,
      levelUp,
      rewardBalls,
      rank,
      rankUp,
    });
  } catch (err) {
    try { if (db) db.close(); } catch { /* ignore */ }
    console.error('[player/catch]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/player/:slot/rank/claim ───────────────────────────────────────
// Body: { rankId: string, idempotencyKey: string }
// Klaim hadiah rank sekali per (slot, rankId) — PK rank_awards sudah idempoten.
router.post('/:slot/rank/claim', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { rankId, idempotencyKey } = req.body || {};
  const rankDef = RANKS.find(r => r.id === rankId);
  if (!rankDef) return res.status(400).json({ success: false, error: `rankId must be one of ${RANKS.map(r => r.id).join('|')}` });
  if (!idempotencyKey || typeof idempotencyKey !== 'string') return res.status(400).json({ success: false, error: 'idempotencyKey required' });

  let db = null;
  try {
    db = getDb();
    ensureGameTables(db);

    const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    const contentInfo = loadLegendaryContent();
    const current = computeRank(db, slot, { contentInfo });

    // 409 kalau tier rank belum tercapai
    if (rankDef.tier > current.tier) {
      db.close();
      return res.status(409).json({ success: false, error: 'Rank belum tercapai' });
    }

    const reward = RANK_REWARDS[rankDef.id] || {};

    // Idempoten per (slot, rankId)
    const prior = db.prepare('SELECT 1 FROM rank_awards WHERE slot=? AND rank_id=?').get(slot, rankDef.id);
    if (prior) {
      const rank = computeRank(db, slot, { contentInfo });
      const pokeballs = pokeballBalances(db, slot);
      let p = {}; try { p = JSON.parse(player.profile_json); } catch {}
      db.close();
      return res.json({
        success: true, idempotent: true, rankId: rankDef.id, reward, pokeballs,
        coinsNow: p.coins ?? 0, xpNow: p.xp ?? 0, levelNow: p.level ?? 1, rank,
      });
    }

    // Tulis award + hadiah bola (tanpa koin/XP). INSERT OR IGNORE menutup race.
    let alreadyClaimed = false;
    db.transaction(() => {
      const r = db.prepare('INSERT OR IGNORE INTO rank_awards(slot, rank_id) VALUES (?,?)').run(slot, rankDef.id);
      if (r.changes === 0) { alreadyClaimed = true; return; }
      for (const [ballType, delta] of Object.entries(reward)) {
        db.prepare(
          "INSERT INTO pokeball_ledger(slot, ball_type, delta, reason) VALUES (?,?,?,?)"
        ).run(slot, ballType, delta, 'rank_up');
      }
    })();

    const rank = computeRank(db, slot, { contentInfo });
    const pokeballs = pokeballBalances(db, slot);
    let p = {}; try { p = JSON.parse(player.profile_json); } catch {}
    db.close();

    const body = {
      success: true, rankId: rankDef.id, reward, pokeballs,
      coinsNow: p.coins ?? 0, xpNow: p.xp ?? 0, levelNow: p.level ?? 1, rank,
    };
    if (alreadyClaimed) body.idempotent = true;
    res.json(body);
  } catch (err) {
    try { if (db) db.close(); } catch { /* ignore */ }
    console.error('[player/rank/claim]', err);
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

// ── POST /api/player/:slot/mathblitz ─────────────────────────────────────
// Body: { correct: int, total: int, sessionKey: string }
// Idempotent reward for the "5 Menit Matematika" timed practice.
// Awards coins = correct * 2, XP = correct * 5 (capped at 200 / 500).
// Tracks best score in profile_json.mathBlitzBest.
router.post('/:slot/mathblitz', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { correct, total, sessionKey } = req.body;
  if (!Number.isInteger(correct) || correct < 0 || correct > 500) return res.status(400).json({ success: false, error: 'correct must be integer 0–500' });
  if (!Number.isInteger(total)   || total < 0   || total > 500)   return res.status(400).json({ success: false, error: 'total must be integer 0–500' });
  if (correct > total) return res.status(400).json({ success: false, error: 'correct cannot exceed total' });
  if (!sessionKey || typeof sessionKey !== 'string') return res.status(400).json({ success: false, error: 'sessionKey required' });

  const coinsAward = Math.min(correct * 2, 200);
  const xpAward    = Math.min(correct * 5, 500);

  try {
    const db = getDb();

    // Ensure log table exists
    db.prepare(
      "CREATE TABLE IF NOT EXISTS mathblitz_log(session_key TEXT PRIMARY KEY, slot INTEGER NOT NULL, correct INTEGER NOT NULL, total INTEGER NOT NULL, coins_awarded INTEGER NOT NULL, xp_awarded INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')))"
    ).run();

    // Idempotency: already processed → return current state
    const prior = db.prepare('SELECT 1 FROM mathblitz_log WHERE session_key=?').get(sessionKey);
    if (prior) {
      const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
      let p = {}; try { p = JSON.parse(player.profile_json); } catch {}
      const pokeballs = pokeballBalances(db, slot);
      db.close();
      return res.json({ success: true, idempotent: true, coinsNow: p.coins ?? 0, xpNow: p.xp ?? 0, levelNow: p.level ?? 1, pokeballs, best: p.mathBlitzBest ?? 0 });
    }

    const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch {}

    const prevBest = p.mathBlitzBest ?? 0;
    const newBest  = correct > prevBest ? correct : prevBest;

    db.transaction(() => {
      db.prepare('INSERT INTO mathblitz_log(session_key, slot, correct, total, coins_awarded, xp_awarded) VALUES (?,?,?,?,?,?)').run(sessionKey, slot, correct, total, coinsAward, xpAward);
      p.coins  = (p.coins  ?? 0) + coinsAward;
      p.xp     = (p.xp     ?? 0) + xpAward;
      p.mathBlitzBest = newBest;
      while (p.xp >= xpFor(p.level ?? 1)) { p.level = (p.level ?? 1) + 1; }
      p.xpToNext = xpFor(p.level ?? 1);
      db.prepare("UPDATE players SET profile_json=?, updated_at=datetime('now') WHERE slot=?").run(JSON.stringify(p), slot);
    })();

    const pokeballs = pokeballBalances(db, slot);
    db.close();

    res.json({ success: true, coinsAward, xpAward, coinsNow: p.coins, xpNow: p.xp, levelNow: p.level, pokeballs, best: newBest, prevBest });
  } catch (err) {
    console.error('[player/mathblitz]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/player/:slot/answer ───────────────────────────────────────
// Body: { correct: boolean, zoneId?: string }
// Awards +5 coins +5 XP per correct answer (GAME-RULES §2).
// Anti-farming: caps answer-reward coins at 300/day per slot.
// Includes level-up reward pokéballs when XP crosses a level threshold.
router.post('/:slot/answer', (req, res) => {
  const slot = parseSlot(req.params.slot);
  if (!slot) return res.status(400).json({ success: false, error: 'slot must be 1–5' });

  const { correct, zoneId } = req.body;
  if (typeof correct !== 'boolean') return res.status(400).json({ success: false, error: 'correct (boolean) required' });

  const today = new Date().toISOString().slice(0, 10);
  const DAILY_COIN_CAP = 300;

  try {
    const db = getDb();
    const player = db.prepare('SELECT profile_json FROM players WHERE slot=?').get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch {}

    if (!correct) {
      db.close();
      return res.json({ success: true, coinsNow: p.coins ?? 0, xpNow: p.xp ?? 0, levelNow: p.level ?? 1, capped: false, levelUp: false });
    }

    // Daily cap check — reset counter when date rolls over
    const rewardDate = p.answerRewardDate;
    let coinsToday = (rewardDate === today) ? (p.answerCoinsToday ?? 0) : 0;
    const capped = coinsToday >= DAILY_COIN_CAP;

    let levelUp = false;
    let rewardBalls = {};

    if (!capped) {
      const coinsToAdd = Math.min(5, DAILY_COIN_CAP - coinsToday);
      const oldLevel = p.level ?? 1;
      db.transaction(() => {
        p.coins  = (p.coins  ?? 0) + coinsToAdd;
        p.xp     = (p.xp     ?? 0) + 5;
        p.answerRewardDate  = today;
        p.answerCoinsToday  = coinsToday + coinsToAdd;
        while (p.xp >= xpFor(p.level ?? 1)) { p.level = (p.level ?? 1) + 1; }
        p.xpToNext = xpFor(p.level ?? 1);
        // Level-up rewards (GAME-RULES §3)
        if (p.level > oldLevel) {
          levelUp = true;
          rewardBalls = grantLevelUpBalls(db, slot, oldLevel, p.level);
        }
        db.prepare("UPDATE players SET profile_json=?, updated_at=datetime('now') WHERE slot=?").run(JSON.stringify(p), slot);
        db.prepare("INSERT INTO profile_history(slot, event, profile_json) VALUES (?,?,?)").run(slot, `answer-correct-zone${zoneId||''}`, JSON.stringify(p));
      })();
    }

    const pokeballs = pokeballBalances(db, slot);
    db.close();
    res.json({ success: true, coinsNow: p.coins, xpNow: p.xp, levelNow: p.level, capped, coinsAwarded: capped ? 0 : 5, xpAwarded: capped ? 0 : 5, levelUp, rewardBalls, pokeballs });
  } catch (err) {
    console.error('[player/answer]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
