const pool = require('./db');
const { buildLearnerContext } = require('./context_builder');
const { loadMemory, saveMemory } = require('./memory_snapshot');
const { buildSoulPrompt } = require('./tutor_soul');
const { checkTopicAllowed } = require('./guardrails');
const Anthropic = require('@anthropic-ai/sdk');

let anthropicClient = null;
function getAnthropic() {
  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Starts a new learning session for a learner.
 * @param {string} learnerId - UUID of the learner
 * @returns {Promise<Object>} { sessionId, context, soulPrompt }
 */
async function startSession(learnerId) {
  // 1. Create a new session record
  const sessionRes = await pool.query(
    'INSERT INTO druygon.learning_sessions (learner_id, status) VALUES ($1, $2) RETURNING id',
    [learnerId, 'active']
  );
  const sessionId = sessionRes.rows[0].id;

  // 2. Build full context (Identity + Profile + Mastery + Parent Controls)
  const context = await buildLearnerContext(learnerId);

  // 3. Load narrative memory and inject into context
  const memory = await loadMemory(learnerId);
  context.profile.narrative_memory = memory;

  // 4. Generate the AI soul prompt based on the injected context
  const soulPrompt = buildSoulPrompt(context);

  return { sessionId, context, soulPrompt };
}

/**
 * Handles a single chat turn within a session.
 * @param {string} sessionId - UUID of the session
 * @param {string} learnerId - UUID of the learner
 * @param {string} userMessage - Message from the learner
 * @param {string} activeTopic - Topic being studied (e.g., 'kpk')
 * @param {Array} conversationHistory - Array of previous messages
 * @returns {Promise<Object>} { reply, topicAllowed: boolean }
 */
async function chatTurn(sessionId, learnerId, userMessage, activeTopic, conversationHistory = []) {
  // 1. Load fresh context to ensure parent controls/locks are up to date
  const context = await buildLearnerContext(learnerId);
  const memory = await loadMemory(learnerId);
  context.profile.narrative_memory = memory;

  // 2. Validate topic access
  const check = checkTopicAllowed(activeTopic, context);
  if (!check.allowed) {
    return {
      reply: "Wah, topik ini belum dibuka. Coba pilih topik lain yang sudah aktif ya! 🐉",
      topicAllowed: false
    };
  }

  // 3. Build soul prompt and messages for Anthropic
  const soulPrompt = buildSoulPrompt(context);
  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  const anthropic = getAnthropic();
  if (!anthropic) throw new Error("Anthropic API Key not configured.");

  // 4. Call Anthropic (Claude 3 Haiku / 3.5 Sonnet per SDK version)
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 200,
    temperature: 0.7,
    system: soulPrompt,
    messages: messages
  });

  const reply = message.content[0].text.trim();

  // 5. Log the turn to session events
  await pool.query(
    'INSERT INTO druygon.session_events (session_id, event_type, event_payload) VALUES ($1, $2, $3)',
    [sessionId, 'chat_turn', JSON.stringify({
      user: userMessage,
      assistant: reply,
      topic: activeTopic,
      model: 'claude-3-haiku'
    })]
  );

  return { reply, topicAllowed: true };
}

/**
 * Ends a learning session and updates memory/summaries.
 * @param {string} sessionId - UUID of the session
 * @param {string} learnerId - UUID of the learner
 * @param {Array<string>} topicsPlayed - List of topics practiced
 * @returns {Promise<Object>} Status message
 */
async function endSession(sessionId, learnerId, topicsPlayed = []) {
  // 1. Mark session as completed
  await pool.query(
    'UPDATE druygon.learning_sessions SET status = $1, ended_at = NOW() WHERE id = $2',
    ['completed', sessionId]
  );

  // 2. Create session summary
  await pool.query(
    'INSERT INTO druygon.session_summaries (session_id, learner_id, topics_played) VALUES ($1, $2, $3)',
    [sessionId, learnerId, JSON.stringify(topicsPlayed)]
  );

  // 3. Update persistent narrative memory
  await saveMemory(learnerId, {
    last_session_at: new Date().toISOString(),
    last_topics_played: topicsPlayed
  });

  return { message: 'Session ended successfully' };
}

module.exports = {
  startSession,
  chatTurn,
  endSession
};
