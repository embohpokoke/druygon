'use strict';
const express  = require('express');
const router   = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const path     = require('path');
const Database = require('better-sqlite3');
const pool     = require('../runtime/db');
const { buildNovaSystemPrompt } = require('../runtime/nova_soul');
const { requireParentAuth, parentAuthStatus, loginParent, logoutParent } = require('../middleware/parent-auth');

const PLAYERS_DB = path.join(__dirname, '..', '..', '..', 'druygon_players.db');

function getPlayersDb() { return new Database(PLAYERS_DB); }

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5';

let _anthropic = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

const LEARNER_ID = '00000000-0000-0000-0000-000000000001';

// Parent auth
router.get('/auth/status', parentAuthStatus);
router.post('/auth/pin', loginParent);
router.post('/auth/logout', logoutParent);

router.use(requireParentAuth);

// GET /api/parent/materials
router.get('/materials', async (req, res) => {
  const { learner_id = LEARNER_ID, period } = req.query;
  try {
    let q = 'SELECT * FROM druygon.parent_materials WHERE learner_id = $1';
    const params = [learner_id];
    if (period) { q += ' AND period = $2'; params.push(period); }
    q += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(q, params);
    res.json({ materials: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/parent/materials
router.post('/materials', async (req, res) => {
  const { learner_id = LEARNER_ID, period, subject_id, title, content } = req.body;
  if (!period || !title || !content) return res.status(400).json({ error: 'period, title, content required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO druygon.parent_materials (learner_id, period, subject_id, title, content)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [learner_id, period, subject_id || null, title, content]
    );
    res.json({ material: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/parent/materials/:id
router.delete('/materials/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM druygon.parent_materials WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/parent/chat
router.post('/chat', async (req, res) => {
  const { learner_id = LEARNER_ID, message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  try {
    const [learnerRows, masteryRows, materialsRows, historyRows] = await Promise.all([
      pool.query('SELECT * FROM druygon.learner_profiles WHERE learner_id = $1', [learner_id]),
      pool.query('SELECT * FROM druygon.topic_mastery WHERE learner_id = $1', [learner_id]),
      pool.query('SELECT * FROM druygon.parent_materials WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 20', [learner_id]),
      pool.query('SELECT role, content FROM druygon.parent_chat_history WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 10', [learner_id])
    ]);

    const context = {
      learner: learnerRows.rows[0] || {},
      topicMastery: masteryRows.rows,
      parentControls: {}
    };
    const materials = materialsRows.rows;
    const history   = historyRows.rows.reverse();

    const systemPrompt = buildNovaSystemPrompt(context, materials);

    const messages = [
      ...history.map(h => ({ role: h.role === 'nova' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: message }
    ];

    const response = await getAnthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.6,
      system: systemPrompt,
      messages
    });

    const reply = response.content[0].text;

    await pool.query(
      'INSERT INTO druygon.parent_chat_history (learner_id, role, content) VALUES ($1,$2,$3)',
      [learner_id, 'parent', message]
    );
    await pool.query(
      'INSERT INTO druygon.parent_chat_history (learner_id, role, content) VALUES ($1,$2,$3)',
      [learner_id, 'nova', reply]
    );

    res.json({ reply });
  } catch (e) {
    console.error('Nova chat error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/parent/chat/history
router.get('/chat/history', async (req, res) => {
  const { learner_id = LEARNER_ID } = req.query;
  try {
    const { rows } = await pool.query(
      'SELECT role, content, created_at FROM druygon.parent_chat_history WHERE learner_id = $1 ORDER BY created_at ASC LIMIT 50',
      [learner_id]
    );
    res.json({ history: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/parent/players ───────────────────────────────────────────────────
// Read-only summary of all 5 redesign player slots.
router.get('/players', (req, res) => {
  try {
    const db = getPlayersDb();

    const rows = db.prepare(
      'SELECT slot, name, profile_json, updated_at FROM players ORDER BY slot'
    ).all();

    const players = rows.map(r => {
      let p = {};
      try { p = JSON.parse(r.profile_json); } catch { /* use defaults */ }

      const caughtCount = db.prepare(
        'SELECT COUNT(*) as n FROM caught_v2 WHERE slot=?'
      ).get(r.slot).n;

      const clearedZones = db.prepare(
        "SELECT COUNT(*) as n FROM zone_progress WHERE slot=? AND status='cleared'"
      ).get(r.slot).n;

      return {
        slot:      r.slot,
        name:      r.name,
        level:     p.level    ?? 1,
        xp:        p.xp       ?? 0,
        xpToNext:  p.xpToNext ?? (r.slot === 1 ? 700 : 100),
        coins:     p.coins    ?? 0,
        caught:    caughtCount,
        cleared:   clearedZones,
        updatedAt: r.updated_at,
      };
    });

    db.close();
    res.json({ success: true, players });
  } catch (err) {
    console.error('[parent/players]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/parent/player/:slot ──────────────────────────────────────────────
// Detailed read-only view of one redesign player slot.
router.get('/player/:slot', (req, res) => {
  const slot = parseInt(req.params.slot, 10);
  if (isNaN(slot) || slot < 1 || slot > 5) {
    return res.status(400).json({ success: false, error: 'slot must be 1–5' });
  }

  try {
    const db = getPlayersDb();

    const player = db.prepare(
      'SELECT slot, name, profile_json, updated_at FROM players WHERE slot=?'
    ).get(slot);
    if (!player) { db.close(); return res.status(404).json({ success: false, error: `No player at slot ${slot}` }); }

    let p = {};
    try { p = JSON.parse(player.profile_json); } catch { /* use defaults */ }

    // Catches grouped by region (subject) → zone
    const allCatches = db.prepare(
      'SELECT dex, zone_id, caught_at FROM caught_v2 WHERE slot=? ORDER BY zone_id, caught_at'
    ).all(slot);

    const catchesByRegion = {};
    for (const c of allCatches) {
      const zoneId = c.zone_id || 'unknown';
      const region = zoneId.includes('_') ? zoneId.split('_')[0] : 'unknown';
      if (!catchesByRegion[region]) catchesByRegion[region] = {};
      if (!catchesByRegion[region][zoneId]) catchesByRegion[region][zoneId] = [];
      catchesByRegion[region][zoneId].push({ dex: c.dex, caughtAt: c.caught_at });
    }

    const regionLabels = {
      science: 'Science', compsci: 'Computer Science', curriculum: 'Curriculum',
      math: 'Mathematics', language: 'Language', social: 'Social Studies',
    };

    const catchesGrouped = Object.entries(catchesByRegion).map(([region, zones]) => ({
      region,
      label: regionLabels[region] || region,
      zones: Object.entries(zones).map(([zoneId, mons]) => ({
        zoneId,
        count: mons.length,
        pokemon: mons,
      })),
    }));

    // Zone progress
    const progress = db.prepare(
      'SELECT zone_id, status, cleared_at FROM zone_progress WHERE slot=? ORDER BY zone_id'
    ).all(slot);

    // Recent activity (last 20 events from profile_history)
    const recentActivity = db.prepare(
      'SELECT id, event, created_at FROM profile_history WHERE slot=? ORDER BY created_at DESC LIMIT 20'
    ).all(slot);

    // Accuracy from stats in profile_json
    const stats = p.stats || {};
    const totalAnswers = (stats.totalCorrect || 0) + (stats.totalWrong || 0);
    const accuracy = totalAnswers > 0 ? Math.round((stats.totalCorrect || 0) / totalAnswers * 100) : 0;

    // Pokeball balances from ledger
    const ledgerRows = db.prepare(
      'SELECT ball_type, SUM(delta) as bal FROM pokeball_ledger WHERE slot=? GROUP BY ball_type'
    ).all(slot);
    const pokeballs = { pokeball: 0, greatball: 0, ultraball: 0, masterball: 0 };
    for (const r of ledgerRows) {
      if (r.ball_type in pokeballs) pokeballs[r.ball_type] = Math.max(0, r.bal);
    }

    db.close();

    res.json({
      success: true,
      slot: player.slot,
      name: player.name,
      updatedAt: player.updated_at,
      profile: {
        level:    p.level    ?? 1,
        xp:       p.xp       ?? 0,
        xpToNext: p.xpToNext ?? 100,
        coins:    p.coins    ?? 0,
        stats:    { ...stats, accuracy },
        pokeballs,
      },
      catchesByRegion: catchesGrouped,
      progress: progress.map(z => ({ zoneId: z.zone_id, status: z.status, clearedAt: z.cleared_at })),
      recentActivity: recentActivity.map(a => ({ id: a.id, event: a.event, at: a.created_at })),
    });
  } catch (err) {
    console.error('[parent/player/:slot]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
