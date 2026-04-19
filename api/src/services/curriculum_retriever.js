'use strict';

const CHROMA_BASE = 'http://localhost:32769';
const OLLAMA_BASE = 'http://localhost:11434';
const TENANT = 'default_tenant';
const DATABASE = 'druygon_db';
const COLLECTION_NAME = 'druygon_curriculum';

let _collectionId = null;

async function getCollectionId() {
  if (_collectionId) return _collectionId;
  const res = await fetch(
    `${CHROMA_BASE}/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${COLLECTION_NAME}`
  );
  if (!res.ok) throw new Error(`ChromaDB: collection not found (${res.status})`);
  const data = await res.json();
  _collectionId = data.id;
  return _collectionId;
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
 * Returns formatted curriculum context string, or null if unavailable.
 */
async function retrieveCurriculum(topicId, userMessage, topK = 3) {
  try {
    const collectionId = await getCollectionId();
    const queryText = `${topicId} ${userMessage}`;
    const embedding = await getEmbedding(queryText);

    const body = {
      query_embeddings: [embedding],
      n_results: topK,
      where: { '$or': [{ 'topic_id': { '$eq': topicId } }, { 'topic_id': { '$eq': 'general' } }] },
      include: ['documents', 'metadatas']
    };

    const res = await fetch(
      `${CHROMA_BASE}/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${collectionId}/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const docs = data.documents?.[0] || [];
    if (docs.length === 0) return null;

    return docs.join('\n---\n');
  } catch (err) {
    // Silent fallback — ChromaDB unavailability must not break tutoring
    console.error('[CurriculumRetriever]', err.message);
    return null;
  }
}

module.exports = { retrieveCurriculum, getEmbedding };
