import { readFileSync } from 'node:fs';
const CHROMA = 'http://localhost:32769', OLLAMA = 'http://localhost:11434';
const T = 'default_tenant', DB = 'druygon_db', COLL = 'druygon_curriculum';
const collId = async () => (await (await fetch(`${CHROMA}/api/v2/tenants/${T}/databases/${DB}/collections/${COLL}`)).json()).id;
const embed = async (text) => (await (await fetch(`${OLLAMA}/api/embeddings`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model:'nomic-embed-text', prompt: text }) })).json()).embedding;
const docs = JSON.parse(readFileSync(process.argv[2] || 'docs.json', 'utf8'));
const id = await collId();
const ids=[], embeddings=[], documents=[], metadatas=[];
for (const d of docs) { embeddings.push(await embed(d.doc)); ids.push(`draco_${d.subject}_${d.topic}`); documents.push(d.doc); metadatas.push({ topic_id: d.topic, subject: d.subject, subtopic: 'pengantar', difficulty: 'dasar', source: 'druygon_teaching_2026' }); process.stderr.write(`embedded ${d.topic}\n`); }
const r = await fetch(`${CHROMA}/api/v2/tenants/${T}/databases/${DB}/collections/${id}/upsert`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids, embeddings, documents, metadatas }) });
console.log('upsert status:', r.status, (await r.text()).slice(0,120));
