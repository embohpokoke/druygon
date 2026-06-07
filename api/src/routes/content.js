'use strict';
/**
 * /api/content — Phase B read-only content endpoints
 *
 * GET /api/content/regions
 *   Returns regions + zones + zone_pokemon, shaped like the REGIONS global in data.jsx.
 *   Only returns subjects with status != 'locked'.
 *
 * GET /api/content/questions?topic=<topic>
 *   Returns [{q, expr, opts, a, hint, difficulty}] for the requested topic.
 *   `a` is the 0-based index of the correct option (same shape as QUESTIONS in data.jsx).
 */

const express = require('express');
const router  = express.Router();
const path    = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '..', 'druygon_content.db');

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

// ── GET /api/content/regions ─────────────────────────────────────────────────
router.get('/regions', (req, res) => {
  try {
    const db = getDb();

    const subjects = db.prepare(
      "SELECT id, name, accent, status FROM subject WHERE status != 'locked' ORDER BY id"
    ).all();

    const zones = db.prepare(
      "SELECT z.id, z.subject_id, z.ord, z.name, z.topic, z.min_level FROM zone z"
    ).all();

    const pokemon = db.prepare(
      "SELECT zone_id, dex, name, type, rarity FROM zone_pokemon ORDER BY zone_id, rarity DESC, dex"
    ).all();

    db.close();

    // Build a lookup: zone_id -> [pokemon]
    const pokemonByZone = {};
    for (const p of pokemon) {
      if (!pokemonByZone[p.zone_id]) pokemonByZone[p.zone_id] = [];
      pokemonByZone[p.zone_id].push({
        dex:    p.dex,
        name:   p.name,
        type:   p.type,
        rarity: p.rarity,
        sprite: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${p.dex}.png`
      });
    }

    // Shape: { [subject_id]: { id, name, accent, zones: [...] } }
    const result = {};
    for (const s of subjects) {
      const subjectZones = zones
        .filter(z => z.subject_id === s.id)
        .sort((a, b) => a.ord - b.ord)
        .map(z => ({
          zone:     z.ord,
          id:       z.id,
          name:     z.name,
          topic:    z.topic,
          minLevel: z.min_level,
          mons:     pokemonByZone[z.id] || []
        }));

      result[s.id] = {
        id:     s.id,
        name:   s.name,
        accent: s.accent,
        zones:  subjectZones
      };
    }

    res.json({ success: true, regions: result });
  } catch (err) {
    console.error('[content/regions]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/content/questions?topic= ────────────────────────────────────────
router.get('/questions', (req, res) => {
  const topic = (req.query.topic || '').trim();
  if (!topic) {
    return res.status(400).json({ success: false, error: 'topic param required' });
  }

  try {
    const db = getDb();

    // Resolve topic -> zone
    const zone = db.prepare("SELECT id FROM zone WHERE topic = ?").get(topic);
    if (!zone) {
      db.close();
      return res.status(404).json({ success: false, error: `No zone for topic '${topic}'` });
    }

    const rows = db.prepare(
      "SELECT q, expr, opts_json, a, hint, difficulty FROM item WHERE zone_id = ? ORDER BY id"
    ).all(zone.id);

    db.close();

    const questions = rows.map(r => ({
      q:          r.q,
      expr:       r.expr || '',
      opts:       JSON.parse(r.opts_json),
      a:          r.a,
      hint:       r.hint || '',
      difficulty: r.difficulty
    }));

    res.json({ success: true, topic, questions });
  } catch (err) {
    console.error('[content/questions]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
