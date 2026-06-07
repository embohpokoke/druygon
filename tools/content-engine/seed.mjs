#!/usr/bin/env node
// seed.mjs — load generated content into api/druygon_content.db (the DB /api/content/* reads).
// Uses the `sqlite3` CLI (no native node module — runs on any Node version).
// Usage:  node seed.mjs [out/]
// Reads out/regions.json + out/questions.json, upserts subject/zone/item/zone_pokemon,
// stamps a content_version row. Idempotent per subject (re-running replaces that subject's items).
//
// After this: seed out/knowledge.<region>.jsonl into ChromaDB collection druygon_<region>
// using the project's existing curriculum-seeder pattern. Then restart backend if it caches.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] || join(__dirname, 'out');
const DB_PATH = join(__dirname, '..', '..', 'api', 'druygon_content.db');
const regions = JSON.parse(readFileSync(join(outDir, 'regions.json'), 'utf8'));
const questions = JSON.parse(readFileSync(join(outDir, 'questions.json'), 'utf8'));

const q = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;  // SQL-escape
const now = new Date().toISOString();
const sql = [];
sql.push('PRAGMA foreign_keys=OFF;', 'BEGIN;');
sql.push(`CREATE TABLE IF NOT EXISTS subject(id TEXT PRIMARY KEY, name TEXT, accent TEXT, status TEXT);`);
sql.push(`CREATE TABLE IF NOT EXISTS zone(id TEXT PRIMARY KEY, subject_id TEXT, ord INTEGER, name TEXT, topic TEXT, min_level INTEGER);`);
sql.push(`CREATE TABLE IF NOT EXISTS item(id INTEGER PRIMARY KEY AUTOINCREMENT, zone_id TEXT, q TEXT, expr TEXT, opts_json TEXT, a INTEGER, hint TEXT, difficulty TEXT, knowledge TEXT);`);
sql.push(`CREATE TABLE IF NOT EXISTS zone_pokemon(zone_id TEXT, dex INTEGER, name TEXT, type TEXT, rarity TEXT);`);
sql.push(`CREATE TABLE IF NOT EXISTS content_version(id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id TEXT, built_at TEXT, agent TEXT, source_notes TEXT, status TEXT);`);

let zones = 0, items = 0, mons = 0;
for (const s of regions) {
  sql.push(`INSERT INTO subject(id,name,accent,status) VALUES(${q(s.id)},${q(s.name)},${q(s.accent)},${q(s.status || 'active')}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,accent=excluded.accent,status=excluded.status;`);
  for (const z of s.zones) {
    zones++;
    sql.push(`INSERT INTO zone(id,subject_id,ord,name,topic,min_level) VALUES(${q(z.id)},${q(s.id)},${z.zone},${q(z.name)},${q(z.topic)},${z.min_level}) ON CONFLICT(id) DO UPDATE SET subject_id=excluded.subject_id,ord=excluded.ord,name=excluded.name,topic=excluded.topic,min_level=excluded.min_level;`);
    sql.push(`DELETE FROM zone_pokemon WHERE zone_id=${q(z.id)};`);
    for (const m of (z.mons || [])) { mons++; sql.push(`INSERT INTO zone_pokemon(zone_id,dex,name,type,rarity) VALUES(${q(z.id)},${m.dex},${q(m.name)},${q(m.type)},${q(m.rarity)});`); }
    sql.push(`DELETE FROM item WHERE zone_id=${q(z.id)};`);
    for (const it of (questions[z.topic] || [])) { items++; sql.push(`INSERT INTO item(zone_id,q,expr,opts_json,a,hint,difficulty,knowledge) VALUES(${q(z.id)},${q(it.q)},${q(it.expr || '')},${q(JSON.stringify(it.opts))},${it.a},${q(it.hint || '')},${q(it.difficulty || 'medium')},${q(it.knowledge || '')});`); }
  }
  sql.push(`INSERT INTO content_version(subject_id,built_at,agent,source_notes,status) VALUES(${q(s.id)},${q(now)},'content-engine',${q('seed.mjs from ' + outDir)},${q(s.status || 'active')});`);
}
sql.push('COMMIT;');

const sqlPath = join(outDir, '_seed.sql');
writeFileSync(sqlPath, sql.join('\n'));
execSync(`sqlite3 ${JSON.stringify(DB_PATH)} < ${JSON.stringify(sqlPath)}`, { stdio: 'inherit' });

console.log(`Seeded ${DB_PATH}`);
console.log(`  subjects: ${regions.length} | zones: ${zones} | items: ${items} | zone_pokemon: ${mons}`);
console.log(`\nNext: seed ChromaDB from out/knowledge.<region>.jsonl into collections druygon_<region>.`);
console.log(`Then restart backend if it caches:  sudo systemctl restart druygon.service`);
