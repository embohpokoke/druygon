const pool = require('./db');

/**
 * Loads the narrative memory for a specific learner.
 * 
 * @param {string} learnerId - UUID of the learner
 * @returns {Promise<Object>} The narrative memory JSONB object
 */
async function loadMemory(learnerId) {
  const res = await pool.query(
    'SELECT narrative_memory FROM druygon.learner_profiles WHERE learner_id = $1',
    [learnerId]
  );
  return res.rows[0]?.narrative_memory || {};
}

/**
 * Saves/Merges a memory patch into the learner's narrative memory.
 * Uses UPSERT to ensure the profile row exists.
 * 
 * @param {string} learnerId - UUID of the learner
 * @param {Object} memoryPatch - Data to merge into narrative_memory
 */
async function saveMemory(learnerId, memoryPatch) {
  await pool.query(`
    INSERT INTO druygon.learner_profiles (learner_id, narrative_memory, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (learner_id) DO UPDATE SET
      narrative_memory = druygon.learner_profiles.narrative_memory || EXCLUDED.narrative_memory,
      updated_at = NOW()
  `, [learnerId, JSON.stringify(memoryPatch)]);
}

module.exports = { loadMemory, saveMemory };
