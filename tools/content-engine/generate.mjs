#!/usr/bin/env node
// generate.mjs — Druygon content generator (for the opencode VPS agent).
// Reads a subjects config, generates N QA'd question-items per zone via the Anthropic API
// (Haiku generate -> Sonnet QA), and writes drop-in seed files to ./out/.
//
// Usage:  node generate.mjs [config.json] [--n 8]
// Providers:
//   Anthropic (default): needs ANTHROPIC_API_KEY from ../../api/.env or environment.
//   Ollama: CONTENT_LLM_PROVIDER=ollama, optional OLLAMA_BASE_URL/GEN_MODEL/QA_MODEL.
// Node 18+ required (global fetch).
//
// Output (./out/):
//   regions.json              <- subjects + zones + zone_pokemon (straight from config; deterministic)
//   questions.json            <- { topic: [ {q,expr,opts,a,hint,difficulty} ] }  (LLM, QA'd)
//   knowledge.<region>.jsonl  <- one factual snippet per line for ChromaDB
// Then run:  node seed.mjs out/    (loads into api/druygon_content.db + prints ChromaDB step)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROVIDER = process.env.CONTENT_LLM_PROVIDER || 'anthropic';
const GEN_MODEL = process.env.GEN_MODEL || (PROVIDER === 'ollama' ? 'qwen3.5:cloud' : 'claude-haiku-4-5');
const QA_MODEL  = process.env.QA_MODEL  || (PROVIDER === 'ollama' ? 'qwen3.5:cloud' : 'claude-sonnet-4-6');
const API = 'https://api.anthropic.com/v1/messages';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');

function getKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const envPath = join(__dirname, '..', '..', 'api', '.env');
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, 'utf8').match(/^\s*ANTHROPIC_API_KEY\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('ANTHROPIC_API_KEY not found (env or api/.env)');
}
const KEY = PROVIDER === 'anthropic' ? getKey() : null;

async function ask(model, prompt, { maxTokens = 4096, tries = 3 } = {}) {
  for (let i = 1; i <= tries; i++) {
    const isOllama = PROVIDER === 'ollama';
    const r = await fetch(isOllama ? `${OLLAMA_BASE_URL}/api/chat` : API, {
      method: 'POST',
      headers: isOllama
        ? { 'content-type': 'application/json' }
        : { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(isOllama
        ? {
            model,
            stream: false,
            think: false,
            format: 'json',
            messages: [{ role: 'user', content: prompt }],
            options: { num_predict: maxTokens, temperature: 0.2 },
          }
        : { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) { if (i === tries) throw new Error(`${model} ${r.status}: ${await r.text()}`); await sleep(1500 * i); continue; }
    const j = await r.json();
    const text = isOllama
      ? (j.message?.content || j.response || '')
      : (j.content || []).map(c => c.text || '').join('');
    const parsed = tryJson(text);
    if (parsed) return parsed;
    if (i === tries) throw new Error(`${model}: could not parse JSON from response`);
  }
}
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
function tryJson(s) {
  // strip code fences and find the first balanced {...}
  const cleaned = s.replace(/```json|```/g, '');
  const i = cleaned.indexOf('{'); const k = cleaned.lastIndexOf('}');
  if (i === -1 || k === -1) return null;
  try { return JSON.parse(cleaned.slice(i, k + 1)); } catch { return null; }
}

function genPrompt(z, n) {
  return `Kamu penulis konten edukasi untuk anak umur ${z.ageBand || '10-12'} tahun di Indonesia, untuk game Pokémon "Druygon".
Buat TEPAT ${n} soal pilihan ganda untuk zona "${z.name}" (region ${z.region}, level minimal ${z.minLevel}).
Topik: ${z.theme}
Tingkat kesulitan dasar: ${z.diff || 'medium'}.

ATURAN:
- Sasaran umur ${z.ageBand || '10-12'}: konsep cukup dalam, jelas & menyenangkan, jangan terlalu sepele.
- Bahasa Indonesia; istilah teknis Inggris boleh dengan penjelasan sederhana.
- Tiap soal: 'q' (pertanyaan), 'expr' (baris visual pendek/emoji/contoh, atau ""), 'opts' (2-4 pilihan), 'a' (index 0-based jawaban BENAR), 'hint' (1 kalimat petunjuk tutor), 'difficulty' (easy|medium|hard), 'knowledge' (1 kalimat fakta benar untuk tutor).
- FAKTA HARUS BENAR. 'a' wajib menunjuk opsi benar. Tidak ambigu/duplikat. Aman untuk anak.
Balas HANYA JSON: {"topic":"${z.topic}","items":[...]}`;
}
function qaPrompt(z, items) {
  return `Kamu QA konten edukasi anak umur ${z.ageBand || '10-12'}. Periksa ketat draft soal topik "${z.topic}" (${z.theme}).
Cek tiap soal: (1) fakta benar, (2) 'a' benar-benar jawaban tepat, (3) kedalaman cocok umur, (4) aman, (5) tidak ambigu/duplikat, (6) opts 2-4 saling eksklusif.
Perbaiki yang bisa diperbaiki; buang yang tak bisa diselamatkan.
Balas HANYA JSON: {"topic":"${z.topic}","items":[...valid & sudah benar],"report":{"checked":N,"fixed":N,"removed":N,"notes":"..."}}
DRAFT:
${JSON.stringify(items)}`;
}

async function main() {
  const cfgPath = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : join(__dirname, 'subjects.example.json');
  const nFlag = process.argv.indexOf('--n');
  const N = nFlag !== -1 ? parseInt(process.argv[nFlag + 1], 10) : 8;
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  const outDir = join(__dirname, 'out');
  mkdirSync(outDir, { recursive: true });
  console.error(`provider: ${PROVIDER} | generate: ${GEN_MODEL} | qa: ${QA_MODEL}`);

  // flatten zones with their subject/region context
  const zones = [];
  for (const s of cfg.subjects) for (const z of s.zones) zones.push({ ...z, region: s.id, subjectName: s.name });

  const questions = {}; const knowledge = []; const reports = [];
  for (const z of zones) {
    process.stderr.write(`• ${z.region}/${z.topic} … generate(${GEN_MODEL})`);
    const gen = await ask(GEN_MODEL, genPrompt(z, N));
    process.stderr.write(` → qa(${QA_MODEL})`);
    const qa = await ask(QA_MODEL, qaPrompt(z, gen.items || []));
    const items = (qa.items || []).map(it => ({ q: it.q, expr: it.expr || '', opts: it.opts, a: it.a, hint: it.hint, difficulty: it.difficulty }));
    questions[z.topic] = items;
    for (const it of (qa.items || [])) if (it.knowledge) knowledge.push({ region: z.region, topic: z.topic, zone: z.zone, text: it.knowledge });
    reports.push({ region: z.region, topic: z.topic, kept: items.length, report: qa.report || {} });
    process.stderr.write(` ✓ ${items.length} items\n`);
  }

  // regions.json straight from config (deterministic gameplay mapping)
  const regions = cfg.subjects.map(s => ({
    id: s.id, name: s.name, accent: s.accent, status: s.status || 'active',
    zones: s.zones.map(z => ({ zone: z.zone, id: `${s.id}_${z.zone}`, name: z.name, topic: z.topic, min_level: z.minLevel, mons: z.mons || [] })),
  }));

  writeFileSync(join(outDir, 'regions.json'), JSON.stringify(regions, null, 2));
  writeFileSync(join(outDir, 'questions.json'), JSON.stringify(questions, null, 2));
  const byReg = {};
  for (const k of knowledge) (byReg[k.region] ||= []).push(k);
  for (const [reg, items] of Object.entries(byReg))
    writeFileSync(join(outDir, `knowledge.${reg}.jsonl`), items.map(x => JSON.stringify(x)).join('\n') + '\n');

  console.error('\n=== DONE ===');
  console.error('zones:', zones.length, '| total items:', Object.values(questions).reduce((a, v) => a + v.length, 0));
  for (const r of reports) console.error(`  ${r.region}/${r.topic}: kept=${r.kept} ${JSON.stringify(r.report)}`);
  console.error(`\nout/ written. Next:  node seed.mjs out/`);
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
