#!/usr/bin/env node
'use strict';
/**
 * seed-legendary-gates.mjs — v2 Legendary Gates (idempotent)
 *
 * Adds one legendary "gate" zone per region and fills it with a legendary mon.
 * Safe to run repeatedly: existing rows are updated, never duplicated.
 *
 * Usage (on the VPS, cwd = /opt/druygon/api so better-sqlite3 resolves):
 *   cd /opt/druygon/api && node tools/seed-legendary-gates.mjs
 *   node tools/seed-legendary-gates.mjs /path/to/druygon_content.db
 *
 * NOTE: druygon_content.db is runtime data and is NOT tracked in git. Re-run this
 * script after any full content reseed.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.argv[2] || path.join(__dirname, '..', 'druygon_content.db');

const GATES = [
  { subject: 'curriculum', zoneId: 'curriculum_legend', name: 'Legendary Summit', dex: 150, mon: 'Mewtwo',   type: 'Psychic' },
  { subject: 'science',    zoneId: 'science_legend',    name: 'Sky Pillar',      dex: 384, mon: 'Rayquaza', type: 'Dragon'  },
  { subject: 'matpel',     zoneId: 'matpel_legend',     name: 'Golden Bell Tower', dex: 250, mon: 'Ho-Oh',  type: 'Fire'    },
];

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 1. Ensure the legendary column exists.
const cols = db.prepare("PRAGMA table_info(zone)").all().map((c) => c.name);
if (!cols.includes('legendary')) {
  db.exec('ALTER TABLE zone ADD COLUMN legendary INTEGER DEFAULT 0');
  console.log('[seed] added zone.legendary column');
}

const findLastZone = db.prepare(
  "SELECT id, topic FROM zone WHERE subject_id = ? AND COALESCE(legendary,0) = 0 ORDER BY ord DESC LIMIT 1"
);
const upsertZone = db.prepare(`
  INSERT INTO zone (id, subject_id, ord, name, topic, min_level, legendary)
  VALUES (@id, @subject, 99, @name, @topic, 1, 1)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name, topic = excluded.topic, legendary = 1, ord = 99
`);
const hasMon = db.prepare('SELECT 1 FROM zone_pokemon WHERE zone_id = ? AND dex = ?');
const addMon = db.prepare(
  "INSERT INTO zone_pokemon (zone_id, dex, name, type, rarity) VALUES (?,?,?,?,'legendary')"
);

const tx = db.transaction(() => {
  for (const g of GATES) {
    const last = findLastZone.get(g.subject);
    if (!last) {
      console.warn(`[seed] skip ${g.subject}: no base zone`);
      continue;
    }
    upsertZone.run({ id: g.zoneId, subject: g.subject, name: g.name, topic: last.topic });
    if (!hasMon.get(g.zoneId, g.dex)) addMon.run(g.zoneId, g.dex, g.mon, g.type);
    console.log(`[seed] ${g.subject}: ${g.zoneId} -> ${g.mon} (#${g.dex}), topic=${last.topic}`);
  }
});
tx();

const summary = db.prepare(
  "SELECT z.id, z.subject_id, z.legendary, p.dex, p.name, p.rarity FROM zone z LEFT JOIN zone_pokemon p ON p.zone_id = z.id WHERE COALESCE(z.legendary,0)=1 ORDER BY z.subject_id"
).all();
console.log('[seed] legendary gates now:');
for (const r of summary) console.log(`  ${r.id} (${r.subject_id}) dex=${r.dex} ${r.name} ${r.rarity}`);
db.close();
