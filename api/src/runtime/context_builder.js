const pool = require('./db');

/**
 * Builds a structured context object for a specific learner.
 * Aggregates core identity, profile, mastery, and parent overrides.
 * 
 * @param {string} learnerId - UUID of the learner
 * @returns {Promise<Object>} Structured learner context
 */
async function buildLearnerContext(learnerId) {
  const queries = [
    // 1. Learner + Profile (using LEFT JOIN to handle missing profile rows)
    pool.query(`
      SELECT l.id, l.name, l.age, l.grade, 
             lp.preferences, lp.narrative_memory
      FROM druygon.learners l
      LEFT JOIN druygon.learner_profiles lp ON l.id = lp.learner_id
      WHERE l.id = $1
    `, [learnerId]),
    
    // 2. Topic Mastery (All topics for the learner)
    pool.query(`
      SELECT topic_id, status, confidence_score
      FROM druygon.topic_mastery
      WHERE learner_id = $1
    `, [learnerId]),
    
    // 3. Parent Controls
    pool.query(`
      SELECT overrides
      FROM druygon.parent_controls
      WHERE learner_id = $1
    `, [learnerId])
  ];

  const [learnerRes, masteryRes, parentRes] = await Promise.all(queries);

  if (learnerRes.rows.length === 0) {
    throw new Error(`Learner not found: ${learnerId}`);
  }

  const learnerRow = learnerRes.rows[0];
  const masteryRows = masteryRes.rows;
  const parentRow = parentRes.rows[0];
  const parentOverrides = parentRow ? parentRow.overrides : {};

  // Transform topicMastery array into a keyed object for efficient AI lookup
  const topicMastery = {};
  masteryRows.forEach(row => {
    topicMastery[row.topic_id] = {
      status: row.status,
      confidence_score: row.confidence_score
    };
  });

  return {
    learner: {
      id: learnerRow.id,
      name: learnerRow.name,
      age: learnerRow.age,
      grade: learnerRow.grade
    },
    profile: {
      // Defaults applied if profile row or specific fields are missing
      preferred_session_minutes: learnerRow.preferences?.preferred_session_minutes || 15,
      preferred_modes: learnerRow.preferences?.preferred_modes || ['chat', 'mission'],
      narrative_memory: learnerRow.narrative_memory || {}
    },
    topicMastery: topicMastery,
    parentControls: {
      allowed_topics: parentOverrides.allowed_topics || [],
      locked_topics: parentOverrides.locked_topics || [],
      force_easier: parentOverrides.force_easier || false,
      learning_objectives: parentOverrides.learning_objectives || null
    }
  };
}

module.exports = { buildLearnerContext };
