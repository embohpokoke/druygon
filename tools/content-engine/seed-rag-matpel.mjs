#!/usr/bin/env node
/**
 * seed-rag-matpel.mjs — seed the ChromaDB `druygon_matpel` collection from
 * the MATPEL content-engine output (out-matpel/regions.json + questions.json).
 *
 * One document per zone: zone identity + every question with its correct
 * answer and explanation, so Draco's RAG retrieves teachable content, not
 * bare quiz items. Embeddings via local Ollama `nomic-embed-text`.
 *
 * Idempotent: upserts by deterministic ids, safe to rerun when weekly
 * content grows (docs/WEEKLY-MATPEL.md).
 *
 * Usage (on the VPS):
 *   node tools/content-engine/seed-rag-matpel.mjs [out-matpel-dir]
 */

import fs from 'node:fs';
import path from 'node:path';

const CHROMA_BASE = process.env.CHROMA_BASE || 'http://localhost:32769';
const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const TENANT = 'default_tenant';
const DATABASE = 'druygon_db';
const COLLECTION = 'druygon_matpel';
const EMBED_MODEL = 'nomic-embed-text';

const MAPEL_LABELS = {
  bindo: 'Bahasa Indonesia', ipas: 'IPAS', ppkn: 'PPKn',
  pai: 'PAI (Islam)', eng: 'Bahasa Inggris', seni: 'Seni Budaya',
};

const outDir = process.argv[2]
  || path.join(path.dirname(new URL(import.meta.url).pathname), 'out-matpel');

async function chroma(urlPath, options = {}) {
  const res = await fetch(
    `${CHROMA_BASE}/api/v2/tenants/${TENANT}/databases/${DATABASE}${urlPath}`,
    { ...options, headers: { 'Content-Type': 'application/json' } });
  return res;
}

async function ensureCollection() {
  const res = await chroma('/collections', {
    method: 'POST',
    body: JSON.stringify({ name: COLLECTION, get_or_create: true }),
  });
  if (!res.ok) throw new Error(`create collection failed: ${res.status} ${await res.text()}`);
  return (await res.json()).id;
}

async function embed(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!res.ok) throw new Error(`embedding failed: ${res.status}`);
  return (await res.json()).embedding;
}

function buildDocuments(regions, questionsByTopic) {
  const matpel = regions.find((r) => r.id === 'matpel');
  if (!matpel) throw new Error('region "matpel" not found in regions.json');
  const docs = [];
  for (const zone of matpel.zones) {
    const mapelKey = zone.id.split('_')[1] || 'umum';
    const questions = questionsByTopic[zone.topic] || [];
    const lines = [
      `${zone.name} — ${MAPEL_LABELS[mapelKey] || mapelKey} kelas 5 SD (Kurikulum Merdeka).`,
      `Topik: ${zone.topic}.`,
      '',
      'Materi kunci:',
    ];
    for (const q of questions) {
      const answer = q.opts?.[q.a] ?? '';
      lines.push(`• ${q.q}`);
      lines.push(`  Jawaban: ${answer}`);
      if (q.hint) lines.push(`  Penjelasan: ${q.hint}`);
    }
    docs.push({
      id: `matpel_${zone.id}`,
      text: lines.join('\n'),
      metadata: {
        topic_id: zone.topic,
        zone_id: zone.id,
        mapel: mapelKey,
        source: 'content-engine',
      },
    });
  }
  return docs;
}

async function main() {
  const regions = JSON.parse(fs.readFileSync(path.join(outDir, 'regions.json'), 'utf8'));
  const questions = JSON.parse(fs.readFileSync(path.join(outDir, 'questions.json'), 'utf8'));
  const docs = buildDocuments(regions, questions);
  console.log(`built ${docs.length} zone documents from ${outDir}`);

  const collectionId = await ensureCollection();
  console.log(`collection ${COLLECTION}: ${collectionId}`);

  const embeddings = [];
  for (const doc of docs) {
    embeddings.push(await embed(doc.text));
  }

  const res = await chroma(`/collections/${collectionId}/upsert`, {
    method: 'POST',
    body: JSON.stringify({
      ids: docs.map((d) => d.id),
      documents: docs.map((d) => d.text),
      metadatas: docs.map((d) => d.metadata),
      embeddings,
    }),
  });
  if (!res.ok) throw new Error(`upsert failed: ${res.status} ${await res.text()}`);
  console.log(`upserted ${docs.length} documents into ${COLLECTION}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
