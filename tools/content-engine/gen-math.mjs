#!/usr/bin/env node
// gen-math.mjs — PROCEDURAL math content for the "5 Menit Matematika" curriculum region.
// Answers + distractors are computed in code (no LLM) → arithmetic is guaranteed correct.
// Output: out-math/regions.json + out-math/questions.json  (drop-in for seed.mjs).
// Usage: node gen-math.mjs [N_per_zone] [outDir]

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const N = parseInt(process.argv[2], 10) || 12;
const outDir = process.argv[3] || join(__dirname, 'out-math');
mkdirSync(outDir, { recursive: true });

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));            // int in [a,b]
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function shuffleWithAnswer(correct, distractors) {
  const opts = [correct, ...distractors];
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return { opts, a: opts.indexOf(correct) };
}
// build 3 distinct distractors from candidate fns, avoiding the correct answer
function distract(correct, cands) {
  const out = [];
  for (const c of cands) { const v = String(c); if (v !== correct && !out.includes(v) && v !== 'NaN' && !v.includes('-')) out.push(v); if (out.length === 3) break; }
  let k = 1; while (out.length < 3) { const v = String(Number(correct.replace?.(/[^0-9.]/g, '') ?? correct) + k); if (v !== correct && !out.includes(v)) out.push(v); k++; if (k > 50) break; }
  return out.slice(0, 3);
}

const Q = (q, expr, correct, distractors, hint, difficulty) => {
  const { opts, a } = shuffleWithAnswer(String(correct), distractors.map(String));
  return { q, expr, opts, a, hint, difficulty };
};

const GEN = {
  penjumlahan: () => { const a = ri(12, 89), b = ri(12, 89), s = a + b; return Q('Berapa hasilnya?', `${a} + ${b} = ?`, s, distract(String(s), [a + b + 1, a + b - 1, a + b + 10, (a + b) - 10]), 'Jumlahkan satuan dulu, lalu puluhan.', 'easy'); },
  pengurangan: () => { const a = ri(40, 99), b = ri(10, a - 1), s = a - b; return Q('Berapa hasilnya?', `${a} − ${b} = ?`, s, distract(String(s), [s + 1, s - 1, s + 10, a + b]), 'Kurangi satuan dulu; pinjam dari puluhan bila perlu.', 'easy'); },
  perkalian: () => { const a = ri(3, 12), b = ri(3, 12), s = a * b; return Q('Berapa hasilnya?', `${a} × ${b} = ?`, s, distract(String(s), [a * b + a, a * b - b, a * b + 1, a * (b + 1)]), 'Ingat tabel perkalian; kali itu penjumlahan berulang.', 'medium'); },
  pembagian: () => { const b = ri(2, 12), q = ri(2, 12), a = b * q; return Q('Berapa hasilnya?', `${a} ÷ ${b} = ?`, q, distract(String(q), [q + 1, q - 1, b, q + 2]), 'Tanya: dikali berapa biar dapat angka itu?', 'medium'); },
  pecahan: () => {
    const den = [4, 5, 6, 8, 10][ri(0, 4)];
    if (ri(0, 1) === 0) { // like-denominator addition, result strictly < den
      const x = ri(1, den - 2), y = ri(1, den - 1 - x); const s = `${x + y}/${den}`;
      return Q('Pecahan berpenyebut sama — jumlahkan.', `${x}/${den} + ${y}/${den} = ?`, s, distract(s, [`${x + y}/${den + den}`, `${x + y + 1}/${den}`, `${x}/${den}`]), 'Penyebut sama → pembilang dijumlah, penyebut tetap.', 'medium');
    } else { // like-denominator subtraction, result strictly > 0
      const hi = ri(2, den - 1), lo = ri(1, hi - 1), d = hi - lo; const s = `${d}/${den}`;
      return Q('Pecahan berpenyebut sama — kurangkan.', `${hi}/${den} − ${lo}/${den} = ?`, s, distract(s, [`${d}/${den + den}`, `${hi + lo}/${den}`, `${d + 1}/${den}`]), 'Penyebut sama → pembilang dikurang, penyebut tetap.', 'medium');
    }
  },
  desimal: () => {
    const a = ri(1, 9) / 10, b = ri(1, 9) / 10, s = Math.round((a + b) * 10) / 10;
    return Q('Jumlahkan desimal berikut.', `${a.toFixed(1)} + ${b.toFixed(1)} = ?`, s.toFixed(1), distract(s.toFixed(1), [(s + 0.1).toFixed(1), (s - 0.1).toFixed(1), (a + b + 1).toFixed(1), ((a * 10 + b * 10)).toFixed(1)]), 'Sejajarkan koma; jumlahkan per tempat desimal.', 'hard');
  },
};

const ZONES = [
  { zone: 1, topic: 'penjumlahan', name: 'Padang Tambah',     minLevel: 1,  mons: [{ dex: 19, name: 'Rattata', type: 'Normal', rarity: 'common' }, { dex: 16, name: 'Pidgey', type: 'Flying', rarity: 'common' }, { dex: 10, name: 'Caterpie', type: 'Bug', rarity: 'common' }] },
  { zone: 2, topic: 'pengurangan', name: 'Lembah Kurang',     minLevel: 3,  mons: [{ dex: 21, name: 'Spearow', type: 'Flying', rarity: 'common' }, { dex: 129, name: 'Magikarp', type: 'Water', rarity: 'common' }, { dex: 13, name: 'Weedle', type: 'Bug', rarity: 'common' }] },
  { zone: 3, topic: 'perkalian',   name: 'Bukit Kali',        minLevel: 5,  mons: [{ dex: 52, name: 'Meowth', type: 'Normal', rarity: 'common' }, { dex: 56, name: 'Mankey', type: 'Fighting', rarity: 'common' }, { dex: 54, name: 'Psyduck', type: 'Water', rarity: 'uncommon' }] },
  { zone: 4, topic: 'pembagian',   name: 'Ngarai Bagi',       minLevel: 8,  mons: [{ dex: 66, name: 'Machop', type: 'Fighting', rarity: 'common' }, { dex: 74, name: 'Geodude', type: 'Rock', rarity: 'common' }, { dex: 27, name: 'Sandshrew', type: 'Ground', rarity: 'uncommon' }] },
  { zone: 5, topic: 'pecahan',     name: 'Telaga Pecahan',    minLevel: 11, mons: [{ dex: 7, name: 'Squirtle', type: 'Water', rarity: 'uncommon' }, { dex: 4, name: 'Charmander', type: 'Fire', rarity: 'uncommon' }, { dex: 1, name: 'Bulbasaur', type: 'Grass', rarity: 'uncommon' }, { dex: 133, name: 'Eevee', type: 'Normal', rarity: 'rare' }] },
  { zone: 6, topic: 'desimal',     name: 'Puncak Desimal',    minLevel: 14, mons: [{ dex: 25, name: 'Pikachu', type: 'Electric', rarity: 'rare' }, { dex: 63, name: 'Abra', type: 'Psychic', rarity: 'uncommon' }, { dex: 147, name: 'Dratini', type: 'Dragon', rarity: 'rare' }, { dex: 39, name: 'Jigglypuff', type: 'Fairy', rarity: 'uncommon' }] },
];

const questions = {};
for (const z of ZONES) {
  const seen = new Set(); const items = [];
  let guard = 0;
  while (items.length < N && guard < N * 40) {
    guard++;
    const it = GEN[z.topic]();
    // structural validity + dedupe by expr
    if (!(it.a >= 0 && it.a < it.opts.length) || it.opts.length !== 4 || new Set(it.opts).size !== 4) continue;
    if (seen.has(it.expr)) continue;
    seen.add(it.expr); items.push(it);
  }
  questions[z.topic] = items;
}

const regions = [{
  id: 'curriculum', name: '5 Menit Matematika', accent: '#FFCB05', status: 'active',
  zones: ZONES.map(z => ({ zone: z.zone, id: `curriculum_${z.zone}`, name: z.name, topic: z.topic, min_level: z.minLevel, mons: z.mons })),
}];

writeFileSync(join(outDir, 'regions.json'), JSON.stringify(regions, null, 2));
writeFileSync(join(outDir, 'questions.json'), JSON.stringify(questions, null, 2));
console.log('zones:', ZONES.length, '| per-zone counts:', Object.fromEntries(Object.entries(questions).map(([k, v]) => [k, v.length])));
console.log('out:', outDir);
