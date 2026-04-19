'use strict';
const pool = require('./db');
const { buildLearnerContext } = require('./context_builder');
const { loadMemory, saveMemory } = require('./memory_snapshot');
const { buildTopicSoulPrompt } = require('./tutor_soul');
const { checkTopicAllowed } = require("./guardrails");
const { retrieveCurriculum } = require("../services/curriculum_retriever");
const Anthropic = require('@anthropic-ai/sdk');

let anthropicClient = null;
function getAnthropic() {
  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

const RUBRIK_TOPICS = ['sains_sda', 'pancasila_sda', 'sbdp_diorama'];
const XP_TABLE = { belajar: 10, latihan: 25, ujian: 50 };

// How many concepts per topic before suggesting ujian
const CONCEPTS_TO_COMPLETE = {
  matematika_pecahan: 5,
  bahasa_indonesia_diary: 5,
  agama_islam_salat: 5,
  sains_sda: 5,
  pancasila_sda: 5,
  sbdp_diorama: 5,
  bahasa_inggris_jobs: 5,
};

// ─── Topic Memory Helpers ────────────────────────────────────────
async function loadTopicMemory(learnerId, topicId) {
  const { rows } = await pool.query(
    `SELECT last_covered_concept, last_session_summary, concepts_covered, is_complete
     FROM druygon.topic_mastery
     WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, topicId]
  );
  return rows[0] || null;
}

async function saveTopicMemory(learnerId, topicId, { concept, summary, incrementConcepts = false }) {
  await pool.query(
    `UPDATE druygon.topic_mastery
     SET last_covered_concept = COALESCE($3, last_covered_concept),
         last_session_summary  = COALESCE($4, last_session_summary),
         concepts_covered      = CASE WHEN $5 THEN COALESCE(concepts_covered,0)+1 ELSE concepts_covered END,
         last_practiced_at     = NOW()
     WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, topicId, concept || null, summary || null, incrementConcepts]
  );
}

async function markTopicComplete(learnerId, topicId) {
  await pool.query(
    `UPDATE druygon.topic_mastery SET is_complete = TRUE WHERE learner_id = $1 AND topic_id = $2`,
    [learnerId, topicId]
  );
}

// ─── Daily Check-in ──────────────────────────────────────────────
async function recordCheckin(learnerId) {
  const today = new Date().toISOString().split('T')[0];
  const { rows } = await pool.query(
    `SELECT last_checkin_date, checkin_streak FROM druygon.learner_profiles WHERE learner_id = $1`,
    [learnerId]
  );
  if (!rows.length) return;

  const last = rows[0].last_checkin_date;
  const streak = rows[0].checkin_streak || 0;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const newStreak = last === today ? streak
    : last === yesterday ? streak + 1
    : 1;

  await pool.query(
    `UPDATE druygon.learner_profiles SET last_checkin_date = $1, checkin_streak = $2 WHERE learner_id = $3`,
    [today, newStreak, learnerId]
  );
  return { streak: newStreak, isFirstToday: last !== today };
}

async function getCheckinStatus(learnerId) {
  const today = new Date().toISOString().split('T')[0];
  const { rows } = await pool.query(
    `SELECT last_checkin_date, checkin_streak, xp_total FROM druygon.learner_profiles WHERE learner_id = $1`,
    [learnerId]
  );
  const r = rows[0] || {};
  return {
    checkedInToday: r.last_checkin_date === today,
    streak:         r.checkin_streak || 0,
    xpTotal:        r.xp_total || 0,
  };
}

// ─── Session Start ───────────────────────────────────────────────
async function startSession(learnerId) {
  const sessionRes = await pool.query(
    'INSERT INTO druygon.learning_sessions (learner_id, status) VALUES ($1, $2) RETURNING id',
    [learnerId, 'active']
  );
  const sessionId = sessionRes.rows[0].id;
  const context = await buildLearnerContext(learnerId);
  const memory = await loadMemory(learnerId);
  context.profile.narrative_memory = memory;
  return { sessionId, context };
}

// ─── Chat Turn ───────────────────────────────────────────────────
async function chatTurn(sessionId, learnerId, userMessage, activeTopic, conversationHistory = [], phase = 'belajar') {
  const context = await buildLearnerContext(learnerId);
  const memory = await loadMemory(learnerId);
  context.profile.narrative_memory = memory;

  // Topic boundary check
  const isHelpMessage = userMessage.startsWith('[BANTUAN:');
  if (!isHelpMessage) {
    const check = checkTopicAllowed(activeTopic, context);
    if (!check.allowed) {
      return { reply: "Wah, topik ini belum dibuka. Coba pilih topik lain yang sudah aktif ya! 🐉", topicAllowed: false, isCorrect: false, xpEarned: 0, rubricScore: null };
    }
  }

  // Load topic memory (MEMORY.md per topic)
  const topicMemory = activeTopic ? await loadTopicMemory(learnerId, activeTopic) : null;

  // Retrieve enriched curriculum context from ChromaDB (RAG)
  let curriculumContext = null;
  try { curriculumContext = await retrieveCurriculum(activeTopic, userMessage); } catch (_) {}

  // Build soul prompt with memory context + curriculum RAG
  const soulPrompt = buildTopicSoulPrompt(context, phase, activeTopic, topicMemory, curriculumContext);

  const messages = [...conversationHistory, { role: 'user', content: userMessage }];

  const anthropic = getAnthropic();
  if (!anthropic) throw new Error('Anthropic API Key not configured.');

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    temperature: 0.7,
    system: soulPrompt,
    messages
  });

  const rawReply = message.content[0].text.trim();

  // Parse markers
  const isCorrect  = rawReply.includes('[BENAR]');
  const scoreMatch = rawReply.match(/\[SKOR:(\d)\/4\]/);
  const rubricScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

  const cleanReply = rawReply.replace(/\[BENAR\]\s*/g, '').replace(/\[SKOR:\d\/4\]\s*/g, '').trim();

  // XP
  let xpEarned = 0;
  if (isCorrect)            xpEarned = XP_TABLE[phase] || 25;
  else if (rubricScore !== null) xpEarned = rubricScore * 10;

  if (xpEarned > 0) {
    await pool.query(
      `UPDATE druygon.learner_profiles
       SET xp_total = COALESCE(xp_total,0)+$1, correct_total = COALESCE(correct_total,0)+$2
       WHERE learner_id = $3`,
      [xpEarned, isCorrect ? 1 : 0, learnerId]
    );
  }

  // Log turn
  await pool.query(
    'INSERT INTO druygon.session_events (session_id, event_type, event_payload) VALUES ($1,$2,$3)',
    [sessionId, 'chat_turn', JSON.stringify({ user: userMessage, assistant: cleanReply, topic: activeTopic, phase, isCorrect, rubricScore, xpEarned, model: 'claude-haiku-4-5' })]
  );

  // Store rubric score
  if (rubricScore !== null && activeTopic) {
    await pool.query(
      `INSERT INTO druygon.session_summaries (session_id, learner_id, topics_played, rubric_scores)
       VALUES ($1,$2,$3::jsonb,$4::jsonb)
       ON CONFLICT (session_id) DO UPDATE
         SET rubric_scores = druygon.session_summaries.rubric_scores || $4::jsonb,
             topics_played = druygon.session_summaries.topics_played || $3::jsonb`,
      [sessionId, learnerId, JSON.stringify([activeTopic]),
       JSON.stringify({ [activeTopic+'_'+Date.now()]: { topic: activeTopic, score: rubricScore, phase, turn: userMessage.substring(0,100) } })]
    );
  }

  // Update topic memory — extract concept from AI reply (short summary of what was explained)
  if (activeTopic && phase === 'belajar' && !isHelpMessage) {
    const conceptSummary = cleanReply.substring(0, 120);
    await saveTopicMemory(learnerId, activeTopic, {
      concept: conceptSummary,
      incrementConcepts: isCorrect
    });
  }

  // Check topic completion
  let topicComplete = false;
  if (activeTopic && phase === 'ujian' && rubricScore !== null) {
    const mem = await loadTopicMemory(learnerId, activeTopic);
    const needed = CONCEPTS_TO_COMPLETE[activeTopic] || 5;
    if (mem && (mem.concepts_covered || 0) >= needed) {
      await markTopicComplete(learnerId, activeTopic);
      topicComplete = true;
    }
  }

  return {
    reply: cleanReply,
    topicAllowed: true,
    isCorrect,
    xpEarned,
    rubricScore,
    hasRubrik: RUBRIK_TOPICS.includes(activeTopic),
    topicComplete
  };
}

async function endSession(sessionId, learnerId, topicsPlayed = []) {
  await pool.query('UPDATE druygon.learning_sessions SET status=$1, ended_at=NOW() WHERE id=$2', ['completed', sessionId]);
  await pool.query(
    `INSERT INTO druygon.session_summaries (session_id, learner_id, topics_played)
     VALUES ($1,$2,$3) ON CONFLICT (session_id) DO UPDATE SET topics_played=$3::jsonb`,
    [sessionId, learnerId, JSON.stringify(topicsPlayed)]
  );
  await saveMemory(learnerId, { last_session_at: new Date().toISOString(), last_topics_played: topicsPlayed });
  return { message: 'Session ended successfully' };
}

module.exports = { startSession, chatTurn, endSession, RUBRIK_TOPICS, recordCheckin, getCheckinStatus, loadTopicMemory };
