'use strict';

const CHROMA_BASE = 'http://localhost:32769';
const OLLAMA_BASE = 'http://localhost:11434';
const TENANT = 'default_tenant';
const DATABASE = 'druygon_db';

// Each collection sets its own metadata filter. druygon_matpel is small
// (one doc per MATPEL zone, seeded by tools/content-engine/seed-rag-matpel.mjs)
// so it is queried unfiltered; druygon_curriculum stays topic-scoped.
const COLLECTIONS = [
  { name: 'druygon_curriculum', filtered: true },
  { name: 'druygon_matpel', filtered: false },
];

const _collectionIds = new Map();

async function getCollectionId(name) {
  if (_collectionIds.has(name)) return _collectionIds.get(name);
  const res = await fetch(
    `${CHROMA_BASE}/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${name}`
  );
  if (!res.ok) throw new Error(`ChromaDB: collection ${name} not found (${res.status})`);
  const data = await res.json();
  _collectionIds.set(name, data.id);
  return data.id;
}

async function getEmbedding(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text })
  });
  if (!res.ok) throw new Error(`Ollama embedding failed (${res.status})`);
  const data = await res.json();
  return data.embedding;
}

/**
 * Retrieve relevant curriculum documents from ChromaDB for the current topic + user message.
 * Queries every collection in COLLECTIONS and merges the hits.
 * Returns formatted curriculum context string, or null if unavailable.
 */
async function retrieveCurriculum(topicId, userMessage, topK = 3) {
  try {
    const queryText = `${topicId} ${userMessage}`;
    const embedding = await getEmbedding(queryText);
    const docs = [];

    for (const { name, filtered } of COLLECTIONS) {
      try {
        const collectionId = await getCollectionId(name);
        const body = {
          query_embeddings: [embedding],
          n_results: topK,
          include: ['documents', 'metadatas']
        };
        if (filtered) {
          body.where = { '$or': [{ 'topic_id': { '$eq': topicId } }, { 'topic_id': { '$eq': 'general' } }] };
        }
        const res = await fetch(
          `${CHROMA_BASE}/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${collectionId}/query`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
        );
        if (!res.ok) continue;
        const data = await res.json();
        docs.push(...(data.documents?.[0] || []));
      } catch (err) {
        // One collection missing/unavailable must not sink the others
        console.error(`[CurriculumRetriever] ${name}:`, err.message);
      }
    }

    if (docs.length === 0) return null;
    return docs.slice(0, topK * 2).join('\n---\n');
  } catch (err) {
    // Silent fallback — ChromaDB unavailability must not break tutoring
    console.error('[CurriculumRetriever]', err.message);
    return null;
  }
}

module.exports = { retrieveCurriculum, getEmbedding };
