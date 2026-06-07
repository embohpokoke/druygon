#!/usr/bin/env node
// dump.mjs — snapshot the live content DB into seed JSON (the inverse of seed.mjs).
// Uses the `sqlite3` CLI (no native module). Usage:  node dump.mjs [outDir]
// Writes regions.json + questions.json + knowledge.<region>.jsonl — reproducible seed of current content.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB = join(__dirname, '..', '..', 'api', 'druygon_content.db');
const outDir = process.argv[2] || join(__dirname, 'seed-batch1');
mkdirSync(outDir, { recursive: true });

const q = (sql) => JSON.parse(execFileSync('sqlite3', ['-json', DB, sql]).toString() || '[]');

const subs   = q('SELECT id,name,accent,status FROM subject ORDER BY id');
const zones  = q('SELECT id,subject_id,ord,name,topic,min_level FROM zone ORDER BY subject_id,ord');
const mons   = q('SELECT zone_id,dex,name,type,rarity FROM zone_pokemon');
const items  = q('SELECT zone_id,q,expr,opts_json,a,hint,difficulty,knowledge FROM item');

const monByZone = {};
for (const m of mons) (monByZone[m.zone_id] ||= []).push({ dex: m.dex, name: m.name, type: m.type, rarity: m.rarity });
const topicByZone = {};
for (const z of zones) topicByZone[z.id] = z.topic;

const regions = subs.map(s => ({
  id: s.id, name: s.name, accent: s.accent, status: s.status,
  zones: zones.filter(z => z.subject_id === s.id).map(z => ({
    zone: z.ord, id: z.id, name: z.name, topic: z.topic, min_level: z.min_level, mons: monByZone[z.id] || [],
  })),
}));

const questions = {}, knowledge = {};
for (const it of items) {
  const t = topicByZone[it.zone_id];
  (questions[t] ||= []).push({ q: it.q, expr: it.expr || '', opts: JSON.parse(it.opts_json), a: it.a, hint: it.hint, difficulty: it.difficulty });
  const reg = it.zone_id.split('_')[0];
  if (it.knowledge) (knowledge[reg] ||= []).push({ region: reg, topic: t, text: it.knowledge });
}

writeFileSync(join(outDir, 'regions.json'), JSON.stringify(regions, null, 2));
writeFileSync(join(outDir, 'questions.json'), JSON.stringify(questions, null, 2));
for (const [r, a] of Object.entries(knowledge))
  writeFileSync(join(outDir, `knowledge.${r}.jsonl`), a.map(x => JSON.stringify(x)).join('\n') + '\n');

console.log(`dumped -> ${outDir}: subjects ${regions.length} | zones ${zones.length} | items ${items.length} | topics ${Object.keys(questions).length}`);
